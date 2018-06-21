// Copyright 2015 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

import { List, Map, Set } from 'immutable';

import * as ast from './ast';
import * as common from './common';
import * as type from './type';
import * as xmile from './xmile';

import { isIdent } from './ast';
import { defined } from './common';
import { Module, Stock, Table, Variable } from './vars';

export class Model implements type.Model {
  name: string;
  valid: boolean;
  project: type.Project;
  xModel: xmile.Model;
  modules: Map<string, Module>;
  tables: Map<string, Table>;
  vars: Map<string, Variable>;

  private spec?: type.SimSpec;

  constructor(project: type.Project, ident: string, xModel: xmile.Model) {
    this.project = project;
    this.xModel = xModel;

    this.name = ident;

    const [vars, modules, tables, err] = Model.parseVars(project, xModel.variables);
    if (err !== undefined) {
      throw err;
    }

    this.vars = defined(vars);
    this.modules = defined(modules);
    this.tables = defined(tables);

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

  /**
   * Validates & figures out all necessary variable information.
   */
  private static parseVars(
    project: type.Project,
    variables: List<xmile.Variable>,
  ):
    | [Map<string, Variable>, Map<string, Module>, Map<string, Table>, undefined]
    | [undefined, undefined, undefined, Error] {
    let vars = Map<string, Variable>();
    let modules = Map<string, Module>();
    let tables = Map<string, Table>();
    for (const v of variables) {
      // IMPORTANT: we need to use the canonicalized
      // identifier, not the 'xmile name', which is
      // what I like to think of as the display name.
      const ident = v.ident;

      // FIXME: is this too simplistic?
      if (vars.has(ident)) {
        return [undefined, undefined, undefined, new Error('duplicate var ' + ident)];
      }

      switch (v.type) {
        case 'module':
          const module = new Module(v);
          modules = modules.set(ident, module);
          vars = vars.set(ident, module);
          break;
        case 'stock':
          const stock = new Stock(v);
          vars = vars.set(ident, stock);
          break;
        case 'aux':
          // FIXME: fix Variable/GF/Table nonsense
          let aux: Variable | null = null;
          if (v.gf) {
            const table = new Table(v);
            if (table.ok) {
              tables = tables.set(ident, table);
              aux = table;
            }
          }
          if (aux === null) {
            aux = new Variable(v);
          }
          vars = vars.set(ident, aux);
          break;
        case 'flow':
          let flow: Variable | null = null;
          if (v.gf) {
            const table = new Table(v);
            if (table.ok) {
              tables = tables.set(ident, table);
              flow = table;
            }
          }
          if (flow === null) {
            flow = new Variable(v);
          }
          vars = vars.set(ident, flow);
          break;
        default:
          throw new Error('unreachable: unknown type "' + v.type + '"');
      }
    }

    const [vars2, modules2, err] = Model.instantiateImplicitModules(project, vars);
    if (err) {
      return [undefined, undefined, undefined, err];
    }

    return [defined(vars2), defined(modules2).merge(modules), tables, undefined];
  }

  private static instantiateImplicitModules(
    project: type.Project,
    vars: Map<string, Variable>,
  ): [Map<string, Variable>, Map<string, Module>, undefined] | [undefined, undefined, Error] {
    let modules = Map<string, Module>();
    let additionalVars = Map<string, Variable>();
    vars = vars.map(
      (v: Variable): Variable => {
        const visitor = new BuiltinVisitor(project, v);

        // check for builtins that require module instantiations
        if (!v.ast) {
          return v;
        }

        const ast = v.ast.walk(visitor);
        if (visitor.didRewrite) {
          v = v.setAST(ast);
        }

        for (const [name, v] of visitor.vars) {
          if (vars.has(name)) {
            throw new Error('builtin walk error, duplicate ' + name);
          }
          additionalVars = additionalVars.set(name, v);
        }
        for (const [name, mod] of visitor.modules) {
          if (modules.has(name)) {
            throw new Error('builtin walk error, duplicate ' + name);
          }
          modules = modules.set(name, mod);
        }
        return v;
      },
    );
    vars = vars.merge(additionalVars);

    return [vars, modules, undefined];
  }
}

const stdlibArgs = Map<string, List<string>>([
  ['smth1', List(['input', 'delay_time', 'initial_value'])],
  ['smth3', List(['input', 'delay_time', 'initial_value'])],
  ['delay1', List(['input', 'delay_time', 'initial_value'])],
  ['delay3', List(['input', 'delay_time', 'initial_value'])],
  ['trend', List(['input', 'delay_time', 'initial_value'])],
]);

// An AST visitor to deal with desugaring calls to builtin functions
// that are actually module instantiations
class BuiltinVisitor implements ast.Visitor<ast.Node> {
  project: type.Project;
  variable: type.Variable;
  modules: Map<string, Module> = Map();
  vars: Map<string, Variable> = Map();
  n: number = 0;

  constructor(project: type.Project, v: type.Variable) {
    this.project = project;
    this.variable = v;
  }

  get didRewrite(): boolean {
    return this.n > 0;
  }

  ident(n: ast.Ident): ast.Node {
    return n;
  }
  constant(n: ast.Constant): ast.Node {
    return n;
  }
  call(n: ast.CallExpr): ast.Node {
    const args = n.args.map(arg => arg.walk(this));

    if (!isIdent(n.fun)) {
      throw new Error('// for now, only idents can be used as fns.');
    }

    const fn = n.fun.ident;
    if (common.builtins.has(fn)) {
      return new ast.CallExpr(n.fun, n.lParenPos, args, n.rParenPos);
    }

    const model = this.project.model('stdlib·' + fn);
    if (!model) {
      throw new Error('unknown builtin: ' + fn);
    }

    let identArgs = List<string>();
    args.forEach((arg, i) => {
      if (isIdent(arg)) {
        identArgs = identArgs.push(arg.ident);
      } else {
        const xVar = new xmile.Variable({
          type: 'aux',
          name: `$·${this.variable.ident}·${this.n}·arg${i}`,
          eqn: arg.walk(new PrintVisitor()),
        });
        const proxyVar = new Variable(xVar);
        this.vars = this.vars.set(defined(proxyVar.ident), proxyVar);
        identArgs.push(defined(proxyVar.ident));
      }
    });

    const modName = `$·${this.variable.ident}·${this.n}·${fn}`;
    let xMod = new xmile.Variable({
      type: 'module',
      name: modName,
      model: `stdlib·${fn}`,
      connections: List<xmile.Connection>(),
    });

    if (!stdlibArgs.has(fn)) {
      throw new Error(`unknown function or builtin ${fn}`);
    }

    const stdlibVars = defined(stdlibArgs.get(fn));

    identArgs.forEach((identArg, i) => {
      const conn = new xmile.Connection({
        to: defined(stdlibVars.get(i)),
        from: '.' + identArg,
      });
      xMod = xMod.update('connections', conns => (conns || List()).push(conn));
    });

    const module = new Module(xMod);
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
    return `${n.value}`;
  }
  call(n: ast.CallExpr): string {
    const fun = n.fun.walk(this);
    const args = n.args.map(arg => arg.walk(this)).join(',');
    return `${fun}(${args})`;
  }
  if(n: ast.IfExpr): string {
    const cond = n.cond.walk(this);
    const t = n.t.walk(this);
    const f = n.f.walk(this);
    return `IF (${cond}) THEN (${t}) ELSE (${f})`;
  }
  paren(n: ast.ParenExpr): string {
    const x = n.x.walk(this);
    return `(${x})`;
  }
  unary(n: ast.UnaryExpr): string {
    const x = n.x.walk(this);
    return `${n.op}${x}`;
  }
  binary(n: ast.BinaryExpr): string {
    const l = n.l.walk(this);
    const r = n.r.walk(this);
    return `${l}${n.op}${r}`;
  }
}
