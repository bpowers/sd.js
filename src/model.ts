// Copyright 2015 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

'use strict';

import { List, Map, Set } from 'immutable';

import { defined } from './common';

import * as ast from './ast';
import * as common from './common';
import * as sim from './sim';
import * as type from './type';
import * as util from './util';
import * as vars from './vars';
import * as xmile from './xmile';

const identifierSet = vars.identifierSet;

const VAR_TYPES = Set<string>(['module', 'stock', 'aux', 'flow']);

export class Model implements type.Model {
  name: string;
  valid: boolean;
  project: type.Project;
  xModel: xmile.Model;
  modules: Map<string, type.Module> = Map();
  tables: Map<string, type.Table> = Map();
  vars: Map<string, type.Variable> = Map();

  private spec?: type.SimSpec;

  constructor(project: type.Project, ident: string, xModel: xmile.Model) {
    this.project = project;
    this.xModel = xModel;

    this.name = ident;

    this.parseVars(xModel.variables);

    this.spec = xModel.simSpec;
    this.valid = true;
    return;
  }

  view(index: number): xmile.View | undefined {
    return this.xModel.views.get(index);
  }

  get ident(): string {
    return common.canonicalize(this.name);
  }

  get simSpec(): type.SimSpec {
    return this.spec || this.project.simSpec;
  }

  lookup(id: string): type.Variable | undefined {
    if (id[0] === '.') {
      id = id.substr(1);
    }
    if (this.vars.has(id)) {
      return this.vars.get(id);
    }
    const parts = id.split('.');
    const module = this.modules.get(parts[0]);
    if (!module) {
      return undefined;
    }
    const nextModel = this.project.model(module.modelName);
    if (!nextModel) {
      return undefined;
    }
    return nextModel.lookup(parts.slice(1).join('.'));
  }

  sim(isStandalone: boolean): sim.Sim {
    if (this.name !== 'main') {
      // mod = new vars.Module(this.project, null, 'main', this.name);
      throw new Error('FIXME: sim of non-main model');
    }
    const mod = this.project.main;
    return new sim.Sim(this.project, mod, isStandalone);
  }

  /**
   * Validates & figures out all necessary variable information.
   */
  private parseVars(variables: List<xmile.Variable>): Error | null {
    for (const v of variables) {
      // IMPORTANT: we need to use the canonicalized
      // identifier, not the 'xmile name', which is
      // what I like to think of as the display name.
      const ident = v.ident;

      // FIXME: is this too simplistic?
      if (this.vars.has(ident)) {
        return new Error('duplicate var ' + ident);
      }

      switch (v.type) {
        case 'module':
          const module = new vars.Module(v);
          this.modules = this.modules.set(ident, module);
          this.vars = this.vars.set(ident, module);
          break;
        case 'stock':
          const stock = new vars.Stock(v);
          this.vars = this.vars.set(ident, stock);
          break;
        case 'aux':
          // FIXME: fix Variable/GF/Table nonsense
          let aux: type.Variable | null = null;
          if (v.gf) {
            const table = new vars.Table(v);
            if (table.ok) {
              this.tables = this.tables.set(ident, table);
              aux = table;
            }
          }
          if (aux === null) {
            aux = new vars.Variable(v);
          }
          this.vars = this.vars.set(ident, aux);
          break;
        case 'flow':
          let flow: type.Variable | null = null;
          if (v.gf) {
            const table = new vars.Table(v);
            if (table.ok) {
              this.tables = this.tables.set(ident, table);
              flow = table;
            }
          }
          if (flow === null) {
            flow = new vars.Variable(v);
          }
          this.vars = this.vars.set(ident, flow);
          break;
        default:
          throw new Error('unreachable: unknown type "' + v.type + '"');
      }
    }

    return this.instantiateImplicitModules();
  }

  private instantiateImplicitModules(): Error | null {
    for (const [name, v] of this.vars) {
      const visitor = new BuiltinVisitor(this.project, this, v);

      // check for builtins that require module instantiations
      if (v.ast) {
        v.ast = v.ast.walk(visitor);
      }

      for (const [name, v] of visitor.vars) {
        if (this.vars.has(name)) {
          throw new Error('builtin walk error, duplicate ' + name);
        }
        this.vars = this.vars.set(name, v);
      }
      for (const [name, mod] of visitor.modules) {
        if (this.modules.has(name)) {
          throw new Error('builtin walk error, duplicate ' + name);
        }
        this.modules = this.modules.set(name, mod);
      }

      // if we rewrote the AST, make sure to update our dependencies
      v.deps = identifierSet(v.ast);
      v.allDeps = undefined;
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

const stdlibArgs: { [n: string]: string[] } = {
  smth1: ['input', 'delay_time', 'initial_value'],
  smth3: ['input', 'delay_time', 'initial_value'],
  delay1: ['input', 'delay_time', 'initial_value'],
  delay3: ['input', 'delay_time', 'initial_value'],
  trend: ['input', 'delay_time', 'initial_value'],
};

// An AST visitor to deal with desugaring calls to builtin functions
// that are actually module instantiations
class BuiltinVisitor implements ast.Visitor<ast.Node> {
  project: type.Project;
  model: Model;
  variable: type.Variable;
  modules: Map<string, type.Module> = Map();
  vars: Map<string, type.Variable> = Map();
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
    const args = [];
    for (const arg of n.args) {
      args.push(arg.walk(this));
    }

    if (!isIdent(n.fun)) {
      throw new Error('// for now, only idents can be used as fns.');
    }

    const fn = (n.fun as ast.Ident).ident;
    if (common.builtins.has(fn)) {
      return new ast.CallExpr(n.fun, n.lParenPos, args, n.rParenPos);
    }

    const model = this.project.model('stdlib·' + fn);
    if (!model) {
      throw new Error('unknown builtin: ' + fn);
    }

    const identArgs: string[] = [];
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (isIdent(arg)) {
        identArgs.push((arg as ast.Ident).ident);
      } else {
        const xVar = new xmile.Variable({
          type: 'aux',
          name: '$·' + this.variable.ident + '·' + this.n + '·arg' + i,
          eqn: arg.walk(new PrintVisitor()),
        } as any);
        const proxyVar = new vars.Variable(xVar);
        this.vars = this.vars.set(defined(proxyVar.ident), proxyVar);
        identArgs.push(defined(proxyVar.ident));
      }
    }

    const modName = '$·' + this.variable.ident + '·' + this.n + '·' + fn;
    let xMod = new xmile.Variable({
      type: 'module',
      name: modName,
      model: 'stdlib·' + fn,
      connections: List<xmile.Connection>(),
    } as any);

    if (!(fn in stdlibArgs)) {
      throw new Error(`unknown function or builtin ${fn}`);
    }

    for (let i = 0; i < identArgs.length; i++) {
      const conn = new xmile.Connection({
        to: stdlibArgs[fn][i],
        from: '.' + identArgs[i],
      });
      xMod = xMod.update('connections', conns => (conns || List()).push(conn));
    }

    const module = new vars.Module(xMod);
    this.modules = this.modules.set(modName, module);
    this.vars = this.vars.set(modName, module);

    this.n++;

    return new ast.Ident(n.fun.pos, modName + '.output');
  }
  if(n: ast.IfExpr): ast.Node {
    const cond = n.cond.walk(this);
    const t = n.t.walk(this);
    const f = n.f.walk(this);
    return new ast.IfExpr(n.ifPos, cond, n.thenPos, t, n.elsePos, f);
  }
  paren(n: ast.ParenExpr): ast.Node {
    const x = n.x.walk(this);
    return new ast.ParenExpr(n.lPos, x, n.rPos);
  }
  unary(n: ast.UnaryExpr): ast.Node {
    const x = n.x.walk(this);
    return new ast.UnaryExpr(n.opPos, n.op, x);
  }
  binary(n: ast.BinaryExpr): ast.Node {
    const l = n.l.walk(this);
    const r = n.r.walk(this);
    return new ast.BinaryExpr(l, n.opPos, n.op, r);
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
      if (i !== n.args.length - 1) {
        s += ',';
      }
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
