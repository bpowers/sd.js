// Copyright 2015 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

'use strict';

import { Map, Set } from 'immutable';

import * as common from './common';
import * as type from './type';
import * as util from './util';
import * as vars from './vars';
import * as sim from './sim';
import * as xmile from './xmile';
import * as ast from './ast';

const VAR_TYPES = Set<string>(['module', 'stock', 'aux', 'flow']);

export class Model implements type.Model {
  name:    string;
  valid:   boolean;
  project: type.Project;
  xModel:  xmile.Model;
  modules: Map<string, type.Module>   = Map();
  tables:  Map<string, type.Table>    = Map();
  vars:    Map<string, type.Variable> = Map();

  private spec: type.SimSpec;

  constructor(project: type.Project, ident: string, xModel: xmile.Model) {
    this.project = project;
    this.xModel = xModel;

    this.name = ident;

    this.parseVars(xModel.variables);

    this.spec = xModel.simSpec || null;
    this.valid = true;
    return;
  }

  view(index: number): xmile.View {
    return this.xModel.views[index];
  }

  get ident(): string {
    return xmile.canonicalize(this.name);
  }

  get simSpec(): type.SimSpec {
    return this.spec || this.project.simSpec;
  }

  lookup(id: string): type.Variable | undefined {
    if (id[0] === '.')
      id = id.substr(1);
    if (this.vars.has(id))
      return this.vars.get(id);
    let parts = id.split('.');
    let module = this.modules.get(parts[0]);
    if (!module)
      return undefined;
    let nextModel = this.project.model(module.modelName);
    return nextModel.lookup(parts.slice(1).join('.'));
  }

  sim(isStandalone: boolean): sim.Sim {
    if (this.name !== 'main') {
      // mod = new vars.Module(this.project, null, 'main', this.name);
      throw 'FIXME: sim of non-main model';
    }
    let mod = this.project.main;
    return new sim.Sim(mod, isStandalone);
  }

  /**
   * Validates & figures out all necessary variable information.
   */
  private parseVars(variables: xmile.Variable[]): xmile.Error | null {
    for (const v of variables) {
      // IMPORTANT: we need to use the canonicalized
      // identifier, not the 'xmile name', which is
      // what I like to think of as the display name.
      let ident = v.ident;

      // FIXME: is this too simplistic?
      if (ident in this.vars)
        return new xmile.Error('duplicate var ' + ident);

      switch (v.type) {
      case 'module':
        let module = new vars.Module(this.project, this, v);
        this.modules = this.modules.set(ident, module);
        this.vars = this.vars.set(ident, module);
        break;
      case 'stock':
        let stock = new vars.Stock(this, v);
        this.vars = this.vars.set(ident, stock);
        break;
      case 'aux':
        // FIXME: fix Variable/GF/Table nonsense
        let aux: type.Variable | null = null;
        if (v.gf) {
          let table = new vars.Table(this, v);
          if (table.ok) {
            this.tables = this.tables.set(ident, table);
            aux = table;
          }
        }
        if (aux === null)
          aux = new vars.Variable(this, v);
        this.vars = this.vars.set(ident, aux);
        break;
      case 'flow':
        let flow: type.Variable | null = null;
        if (v.gf) {
          let table = new vars.Table(this, v);
          if (table.ok) {
            this.tables = this.tables.set(ident, table);
            flow = table;
          }
        }
        if (flow === null)
          flow = new vars.Variable(this, v);
        this.vars = this.vars.set(ident, flow);
        break;
      default:
        throw 'unreachable: unknown type "' + v.type + '"';
      }
    }

    return this.instantiateImplicitModules();
  }

  private instantiateImplicitModules(): xmile.Error | null {

    for (const [name, v] of this.vars) {
      let visitor = new BuiltinVisitor(this.project, this, v);

      // check for builtins that require module instantiations
      if (v.ast)
        v.ast = v.ast.walk(visitor);

      for (const [name, v] of visitor.vars) {
        if (this.vars.has(name))
          throw 'builtin walk error, duplicate ' + name;
        this.vars = this.vars.set(name, v);
      }
      for (const [name, mod] of visitor.modules) {
        if (this.modules.has(name))
          throw 'builtin walk error, duplicate ' + name;
        this.modules = this.modules.set(name, mod);
      }

      // if we rewrote the AST, make sure to update our dependencies
      v._deps = Set(v.ast);
      v._allDeps = undefined;
    }

    for (const [name, mod] of this.modules) {
      mod.updateRefs(this);
    }

    return null;
  }
}

function isIdent(n: ast.Node): boolean {
  return n.hasOwnProperty('ident');
}

const stdlibArgs: {[n: string]: string[]} = {
  'smth1': ['input', 'delay_time', 'initial_value'],
  'smth3': ['input', 'delay_time', 'initial_value'],
  'delay1': ['input', 'delay_time', 'initial_value'],
  'delay3': ['input', 'delay_time', 'initial_value'],
  'trend': ['input', 'delay_time', 'initial_value'],
};

// An AST visitor to deal with desugaring calls to builtin functions
// that are actually module instantiations
class BuiltinVisitor implements ast.Visitor<ast.Node> {
  project: type.Project;
  model: Model;
  variable: type.Variable;
  modules: Map<string, type.Module> = Map();
  vars: Map<string, type.Variable>  = Map();
  n: number = 0;

  constructor(project: type.Project, m: Model, v: type.Variable) {
    this.project = project;
    this.model = m;
    this.variable = v;
  }

  ident(n: ast.Ident): ast.Node {
    return n;
  }
  constant(n: ast.Constant): ast.Node {
    return n;
  }
  call(n: ast.CallExpr): ast.Node {
    let args = [];
    for (let i = 0; i < n.args.length; i++) {
      args.push(n.args[i].walk(this));
    }

    if (!isIdent(n.fun))
      throw '// for now, only idents can be used as fns.';

    let fn = (<ast.Ident>n.fun).ident;
    if (fn in common.builtins)
      return new ast.CallExpr(n.fun, n._lParenPos, args, n._rParenPos);

    let model = <Model|null>this.project.model('stdlib·' + fn);
    if (model === null)
      throw 'unknown builtin: ' + fn;

    let identArgs: string[] = [];
    for (let i = 0; i < args.length; i++) {
      let arg = args[i];
      if (isIdent(arg)) {
        identArgs.push((<ast.Ident>arg).ident);
      } else {
        let xVar = new xmile.Variable();
        xVar.type = 'aux';
        xVar.name = '$·' + this.variable.ident + '·' + this.n + '·arg' + i;
        xVar.eqn = arg.walk(new PrintVisitor());
        let proxyVar = new vars.Variable(this.model, xVar);
        this.vars = this.vars.set(proxyVar.ident, proxyVar);
        identArgs.push(proxyVar.ident);
      }
    }

    let modName = '$·' + this.variable.ident + '·' + this.n + '·' + fn;
    let xMod = new xmile.Variable();
    xMod.type = 'module';
    xMod.name = modName;
    xMod.model = 'stdlib·' + fn;
    xMod.connections = [];
    for (let i = 0; i < identArgs.length; i++) {
      let conn = new xmile.Connection();
      conn.to = stdlibArgs[fn][i];
      conn.from = '.' + identArgs[i];
      xMod.connections.push(conn);
    }

    let module = new vars.Module(this.project, this.model, xMod);
    this.modules = this.modules.set(modName, module);
    this.vars = this.vars.set(modName, module);

    this.n++;

    return new ast.Ident(n.fun.pos, modName + '.output');
  }
  if(n: ast.IfExpr): ast.Node {
    let cond = n.cond.walk(this);
    let t = n.t.walk(this);
    let f = n.f.walk(this);
    return new ast.IfExpr(n._ifPos, cond, n._thenPos, t, n._elsePos, f);
  }
  paren(n: ast.ParenExpr): ast.Node {
    let x = n.x.walk(this);
    return new ast.ParenExpr(n._lPos, x, n._rPos);
  }
  unary(n: ast.UnaryExpr): ast.Node {
    let x = n.x.walk(this);
    return new ast.UnaryExpr(n._opPos, n.op, x);
  }
  binary(n: ast.BinaryExpr): ast.Node {
    let l = n.l.walk(this);
    let r = n.r.walk(this);
    return new ast.BinaryExpr(l, n._opPos, n.op, r);
  }
}

// An AST visitor to deal with desugaring calls to builtin functions
// that are actually module instantiations
class PrintVisitor implements ast.Visitor<string> {
  ident(n: ast.Ident): string {
    return n.ident;
  }
  constant(n: ast.Constant): string {
    return '' + n.value;
  }
  call(n: ast.CallExpr): string {
    let s = n.fun.walk(this);
    s += '(';
    for (let i = 0; i < n.args.length; i++) {
      s += n.args[i].walk(this);
      if (i != n.args.length - 1)
        s += ',';
    }
    s += ')';

    return s;
  }
  if(n: ast.IfExpr): string {
    let s = 'IF (';
    s += n.cond.walk(this);
    s += ') THEN (';
    s += n.t.walk(this);
    s += ') ELSE (';
    s += n.f.walk(this);
    s += ')';
    return s;
  }
  paren(n: ast.ParenExpr): string {
    return '(' + n.x.walk(this) + ')';
  }
  unary(n: ast.UnaryExpr): string {
    return n.op + n.x.walk(this);
  }
  binary(n: ast.BinaryExpr): string {
    return n.l.walk(this) + n.op + n.r.walk(this);
  }
}
