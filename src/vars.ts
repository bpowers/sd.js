// Copyright 2019 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

// FIXME: this seems to fix a bug in Typescript 1.5
declare function isFinite(n: string | number): boolean;

import { List, Map, Record, RecordOf, Set } from 'immutable';

import { builtins, defined, exists } from './common';

import * as ast from './ast';
import { eqn } from './parse';
import * as xmile from './xmile';

export interface Project {
  readonly name: string;
  readonly simSpec: xmile.SimSpec;
  readonly main: Module | undefined;

  model(name?: string): Model | undefined;
  getFiles(): List<xmile.File>;
}

export interface Model {
  readonly ident: string;
  readonly valid: boolean;
  readonly modules: Map<string, Module>;
  readonly tables: Map<string, Table>;
  readonly vars: Map<string, Variable>;
  readonly simSpec?: xmile.SimSpec;

  view(index: number): xmile.View | undefined;
}

interface ModelDefProps {
  model: Model | undefined;
  modules: Set<Module>;
}

const modelDefDefaults: ModelDefProps = {
  model: undefined,
  modules: Set<Module>(),
};

export class ModelDef extends Record(modelDefDefaults) {
  constructor(params: ModelDefProps) {
    super(params);
  }

  get<T extends keyof ModelDefProps>(key: T): ModelDefProps[T] {
    return super.get(key);
  }
}

const contextDefaults = {
  project: (null as any) as Project,
  models: List<Model>(),
};

export class Context extends Record(contextDefaults) {
  constructor(project: Project, model: Model, prevContext?: Context) {
    const models = prevContext ? prevContext.models : List<Model>();
    super({
      project,
      models: models.push(model),
    });
  }

  get parent(): Model {
    return defined(this.models.last());
  }

  get mainModel(): Model {
    const main = defined(this.project.main);
    return defined(this.project.model(main.modelName));
  }

  lookup(ident: string): Variable | undefined {
    if (ident[0] === '.') {
      ident = ident.substr(1);
      return new Context(this.project, this.mainModel).lookup(ident);
    }

    const model = this.parent;
    if (model.vars.has(ident)) {
      return model.vars.get(ident);
    }
    const parts = ident.split('.');
    const module = model.modules.get(parts[0]);
    if (!module) {
      return undefined;
    }
    const nextModel = this.project.model(module.modelName);
    if (!nextModel) {
      return undefined;
    }
    return new Context(this.project, nextModel).lookup(parts.slice(1).join('.'));
  }
}

export type VariableKind = 'ordinary' | 'stock' | 'table' | 'module' | 'reference';

interface OrdinaryProps {
  kind: VariableKind;
  xmile?: xmile.Variable;
  valid: boolean;
  ident?: string;
  eqn?: string;
  ast?: ast.Node;
  deps: Set<string>;
}

const variableDefaults: OrdinaryProps = {
  kind: 'ordinary',
  xmile: undefined,
  valid: false,
  ident: undefined,
  eqn: undefined,
  ast: undefined,
  deps: Set<string>(),
};

function variableFrom(xVar: xmile.Variable | undefined, kind: VariableKind): OrdinaryProps {
  const variable = Object.assign({}, variableDefaults);
  variable.kind = kind;
  variable.xmile = xVar;

  variable.ident = xVar && xVar.name ? xVar.ident : undefined;
  variable.eqn = xVar && xVar.eqn;

  if (variable.eqn) {
    const [ast, errs] = eqn(variable.eqn);
    if (ast) {
      variable.ast = ast || undefined;
      variable.valid = true;
    }
  }

  // for a flow or aux, we depend on variables that aren't built-in
  // functions in the equation.
  if (xVar && xVar.type === 'module') {
    variable.deps = Set<string>();
    if (xVar.connections) {
      for (const conn of xVar.connections) {
        const ref = new Reference(conn);
        variable.deps = variable.deps.add(ref.ptr);
      }
    }
  } else {
    variable.deps = identifierSet(variable.ast);
  }

  return variable;
}

// Ordinary variables are either auxiliaries or flows -- they are
// represented the same way.
export class Ordinary extends Record(variableDefaults) {
  constructor(xVar?: xmile.Variable) {
    const variable = variableFrom(xVar, 'ordinary');
    super(variable);
  }
}

const stockOnlyDefaults = {
  initial: '',
  inflows: List<string>(),
  outflows: List<string>(),
};
const stockDefaults = {
  ...variableDefaults,
  ...stockOnlyDefaults,
};

export class Stock extends Record(stockDefaults) {
  constructor(xVar: xmile.Variable) {
    const variable = variableFrom(xVar, 'stock');
    const stock = {
      ...variable,
      initial: xVar.eqn ? xVar.eqn : '',
      inflows: xVar.inflows || List(),
      outflows: xVar.outflows || List(),
    };
    // build an ast from our initialization equation
    if (stock.initial) {
      const [ast, errs] = eqn(stock.initial);
      if (ast) {
        stock.ast = ast;
        stock.valid = true;
      }
    }
    super(stock);
  }
}

const tableOnlyDefaults = {
  x: List<number>(),
  y: List<number>(),
  ok: false,
};
const tableDefaults = {
  ...variableDefaults,
  ...tableOnlyDefaults,
};

// An ordinary variable with an attached table
export class Table extends Record(tableDefaults) {
  constructor(xVar: xmile.Variable) {
    const variable = variableFrom(xVar, 'table');

    const gf = defined(xVar.gf);
    const ypts = gf.yPoints;

    // FIXME(bp) unit test
    const xpts = gf.xPoints;
    const xscale = gf.xScale;
    const xmin = xscale ? xscale.min : 0;
    const xmax = xscale ? xscale.max : 0;

    let xList = List<number>();
    let yList = List<number>();
    let ok = true;

    if (ypts) {
      for (let i = 0; i < ypts.size; i++) {
        let x: number;
        // either the x points have been explicitly specified, or
        // it is a linear mapping of points between xmin and xmax,
        // inclusive
        if (xpts) {
          x = defined(xpts.get(i));
        } else {
          x = (i / (ypts.size - 1)) * (xmax - xmin) + xmin;
        }
        xList = xList.push(x);
        yList = yList.push(defined(ypts.get(i)));
      }
    } else {
      ok = false;
    }

    const table = {
      ...variable,
      x: xList,
      y: yList,
      ok,
    };
    super(table);
  }
}

const moduleOnlyDefaults = {
  modelName: '',
  refs: Map<string, Reference>(),
};
const moduleDefaults = {
  ...variableDefaults,
  ...moduleOnlyDefaults,
};

export class Module extends Record(moduleDefaults) {
  constructor(xVar: xmile.Variable) {
    const variable = variableFrom(xVar, 'module');

    let refs = Map<string, Reference>();
    if (xVar.connections) {
      for (const conn of xVar.connections) {
        const ref = new Reference(conn);
        refs = refs.set(defined(ref.ident), ref);
      }
    }

    const mod = {
      ...variable,
      // This is a deviation from the XMILE spec, but is the
      // only thing that makes sense -- having a 1 to 1
      // relationship between model name and module name
      // would be insane.
      modelName: xVar.model ? xVar.model : defined(xVar.ident),
      refs,
    };

    super(mod);
  }
}

const referenceOnlyDefaults = {
  xmileConn: (undefined as any) as xmile.Connection,
  ptr: '',
};
const referenceDefaults = {
  ...variableDefaults,
  ...referenceOnlyDefaults,
};

export class Reference extends Record(referenceDefaults) {
  constructor(conn: xmile.Connection) {
    const variable = variableFrom(new xmile.Variable({ name: conn.to }), 'reference');
    const reference = {
      ...variable,
      xmileConn: conn,
      ptr: conn.from,
    };
    super(reference);
  }
}

export type Variable = Ordinary | Stock | Table | Module | Reference;

// ---------------------------------------------------------------------

const JsOps: Map<string, string> = Map({
  '&': '&&',
  '|': '||',
  '≥': '>=',
  '≤': '<=',
  '≠': '!==',
  '=': '===',
});

const codegenVisitorDefaults = {
  offsets: Map<string, number>(),
  isMain: false,
  scope: 'curr' as 'curr' | 'globalCurr',
};

// Converts an AST into a string of JavaScript
export class CodegenVisitor extends Record(codegenVisitorDefaults) implements ast.Visitor<string> {
  constructor(offsets: Map<string, number>, isMain: boolean) {
    super({
      offsets,
      isMain,
      scope: isMain ? 'curr' : 'globalCurr',
    });
  }

  ident(n: ast.Ident): string {
    if (n.ident === 'time') {
      return this.refTime();
    } else if (this.offsets.has(n.ident)) {
      return this.refDirect(n.ident);
    } else {
      return this.refIndirect(n.ident);
    }
  }

  constant(n: ast.Constant): string {
    return `${n.value}`;
  }

  call(n: ast.CallExpr): string {
    if (!ast.isIdent(n.fun)) {
      throw new Error(`only idents can be used as fns, not ${n.fun}`);
    }

    const fn = n.fun.ident;
    if (!builtins.has(fn)) {
      throw new Error(`unknown builtin: ${fn}`);
    }

    let code = `${fn}(`;
    const builtin = defined(builtins.get(fn));
    if (builtin.usesTime) {
      code += `dt, ${this.refTime()}`;
      if (n.args.size) {
        code += ', ';
      }
    }

    code += n.args.map(arg => arg.walk(this)).join(', ');
    code += ')';

    return code;
  }

  if(n: ast.IfExpr): string {
    const cond = n.cond.walk(this);
    const t = n.t.walk(this);
    const f = n.f.walk(this);

    // use the ternary operator for if statements
    return `(${cond} ? ${t} : ${f})`;
  }

  paren(n: ast.ParenExpr): string {
    const x = n.x.walk(this);
    return `(${x})`;
  }

  unary(n: ast.UnaryExpr): string {
    // if we're doing 'not', explicitly convert the result
    // back to a number.
    const op = n.op === '!' ? '+!' : n.op;
    const x = n.x.walk(this);
    return `${op}${x}`;
  }

  binary(n: ast.BinaryExpr): string {
    // exponentiation isn't a builtin operator in JS, it
    // is implemented as a function in the Math module.
    if (n.op === '^') {
      const l = n.l.walk(this);
      const r = n.r.walk(this);
      return `Math.pow(${l}, ${r})`;
    } else if (n.op === '=' && n.l instanceof ast.Constant && isNaN(n.l.value)) {
      const r = n.r.walk(this);
      return `isNaN(${r})`;
    } else if (n.op === '=' && n.r instanceof ast.Constant && isNaN(n.r.value)) {
      const l = n.r.walk(this);
      return `isNaN(${l})`;
    }

    let op = n.op;
    // only need to convert some of them
    if (JsOps.has(n.op)) {
      op = defined(JsOps.get(n.op));
    }

    const l = n.l.walk(this);
    const r = n.r.walk(this);
    return `${l} ${op} ${r}`;
  }

  // the value of time in the current simulation step
  private refTime(): string {
    return `${this.scope}[0]`;
  }

  // the value of an aux, stock, or flow in the current module
  private refDirect(ident: string): string {
    return `curr[${defined(this.offsets.get(ident))}]`;
  }

  // the value of an overridden module input
  private refIndirect(ident: string): string {
    return `globalCurr[this.ref['${ident}']]`;
  }
}

export function isConst(variable: Variable): boolean {
  return variable.eqn !== undefined && isFinite(variable.eqn);
}

export function setAST(variable: Variable, node: ast.Node): Variable {
  // FIXME :\
  const v: any = variable;
  return v.set('ast', node).set('deps', identifierSet(node));
}

function isOrdinary(variable: Variable): variable is Ordinary {
  return variable.kind === 'ordinary';
}

function isStock(variable: Variable): variable is Stock {
  return variable.kind === 'stock';
}

function isTable(variable: Variable): variable is Table {
  return variable.kind === 'table';
}

function isModule(variable: Variable): variable is Module {
  return variable.kind === 'module';
}

function isReference(variable: Variable): variable is Reference {
  return variable.kind === 'reference';
}

function simpleEvalCode(
  parent: Model,
  offsets: Map<string, number>,
  node: ast.Node | undefined,
): string | undefined {
  if (!node) {
    throw new Error('simpleEvalCode called with undefined ast.Node');
  }
  const visitor = new CodegenVisitor(offsets, parent.ident === 'main');

  try {
    return defined(node).walk(visitor);
  } catch (e) {
    console.log('// codegen failed!');
    return '';
  }
}

export function code(
  parent: Model,
  offsets: Map<string, number>,
  variable: Variable,
): string | undefined {
  if (isOrdinary(variable)) {
    if (isConst(variable)) {
      return "this.initials['" + variable.ident + "']";
    }
    return simpleEvalCode(parent, offsets, variable.ast);
  } else if (isStock(variable)) {
    let eqn = 'curr[' + defined(offsets.get(defined(variable.ident))) + '] + (';
    if (variable.inflows.size > 0) {
      eqn += variable.inflows.map(s => 'curr[' + defined(offsets.get(s)) + ']').join('+');
    }
    if (variable.outflows.size > 0) {
      eqn +=
        '- (' + variable.outflows.map(s => 'curr[' + defined(offsets.get(s)) + ']').join('+') + ')';
    }
    // stocks can have no inflows or outflows and still be valid
    if (variable.inflows.size === 0 && variable.outflows.size === 0) {
      eqn += '0';
    }
    eqn += ')*dt';
    return eqn;
  } else if (isTable(variable)) {
    if (!variable.eqn) {
      return undefined;
    }
    const indexExpr = defined(simpleEvalCode(parent, offsets, variable.ast));
    return "lookup(this.tables['" + variable.ident + "'], " + indexExpr + ')';
  } else if (isModule(variable)) {
    throw new Error('code called for Module');
  } else if (isReference(variable)) {
    return `curr["${variable.ptr}"]`;
  } else {
    throw new Error('unreachable');
  }
}

export function initialEquation(
  parent: Model,
  offsets: Map<string, number>,
  variable: Variable,
): string | undefined {
  // returns a string of this variables initial equation. suitable for
  // exec()'ing
  if (isOrdinary(variable)) {
    return code(parent, offsets, variable);
  } else if (isStock(variable)) {
    return simpleEvalCode(parent, offsets, variable.ast);
  } else if (isTable(variable)) {
    return code(parent, offsets, variable);
  } else if (isModule(variable)) {
    return code(parent, offsets, variable);
  } else if (isReference(variable)) {
    return code(parent, offsets, variable);
  } else {
    throw new Error('unreachable');
  }
}

function getModuleDeps(context: Context, variable: Module): Set<string> {
  // TODO(bp): I think we need qualified idents for module deps
  let allDeps = Set<string>();
  for (const ident of variable.deps) {
    if (allDeps.has(ident)) {
      continue;
    }

    const v = context.lookup(ident);
    if (!v) {
      throw new Error(`couldn't find ${ident}`);
    }
    // if we hit a Stock the dependencies 'stop'
    if (!(v instanceof Stock)) {
      allDeps = allDeps.add(ident.split('.')[0]);
      allDeps = allDeps.merge(getDeps(context, v));
    }
  }
  return allDeps;
}

export function getDeps(context: Context, variable: Variable): Set<string> {
  if (isModule(variable)) {
    return getModuleDeps(context, variable);
  }

  let allDeps = Set<string>();
  for (const ident of variable.deps) {
    if (allDeps.has(ident)) {
      continue;
    }
    allDeps = allDeps.add(ident);
    const v = context.parent.vars.get(ident);
    if (!v) {
      continue;
    }
    allDeps = allDeps.merge(getDeps(context, v));
  }
  return allDeps;
}

export function referencedModels(
  project: Project,
  mod: Module,
  all?: Map<string, ModelDef>,
): Map<string, ModelDef> {
  if (!all) {
    all = Map();
  }
  const mdl = defined(project.model(mod.modelName));
  const name = mdl.ident;
  if (all.has(name)) {
    const def = defined(all.get(name)).update('modules', (modules: Set<Module>) =>
      modules.add(mod),
    );
    all = all.set(name, def);
  } else {
    all = all.set(
      name,
      new ModelDef({
        model: mdl,
        modules: Set<Module>([mod]),
      }),
    );
  }
  for (const [name, module] of mdl.modules) {
    all = referencedModels(project, module, all);
  }
  return all;
}

// An AST visitor to deal with desugaring calls to builtin functions
// that are actually module instantiations
export class IdentifierSetVisitor implements ast.Visitor<Set<string>> {
  ident(n: ast.Ident): Set<string> {
    return Set<string>([n.ident]);
  }
  constant(n: ast.Constant): Set<string> {
    return Set<string>();
  }
  call(n: ast.CallExpr): Set<string> {
    let set = Set<string>();
    for (const arg of n.args) {
      set = set.union(arg.walk(this));
    }

    return set;
  }
  if(n: ast.IfExpr): Set<string> {
    const condIdents = n.cond.walk(this);
    const trueIdents = n.t.walk(this);
    const falseIdents = n.f.walk(this);
    return condIdents.union(trueIdents).union(falseIdents);
  }
  paren(n: ast.ParenExpr): Set<string> {
    return n.x.walk(this);
  }
  unary(n: ast.UnaryExpr): Set<string> {
    return n.x.walk(this);
  }
  binary(n: ast.BinaryExpr): Set<string> {
    const leftIdents = n.l.walk(this);
    const rightIdents = n.r.walk(this);
    return leftIdents.union(rightIdents);
  }
}

/**
 * For a given AST node string, returns a set of the identifiers
 * referenced.  Identifiers exclude keywords (such as 'if' and 'then')
 * as well as builtin functions ('pulse', 'max', etc).
 *
 * @param root An AST node.
 * @return A set of all identifiers.
 */
export const identifierSet = (root: ast.Node | undefined): Set<string> => {
  if (!root) {
    return Set<string>();
  }

  return root.walk(new IdentifierSetVisitor());
};
