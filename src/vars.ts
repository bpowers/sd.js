// Copyright 2015 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

// FIXME: this seems to fix a bug in Typescript 1.5
declare function isFinite(n: string | number): boolean;

import { List, Map, Record, Set } from 'immutable';

import { builtins, defined, exists } from './common';

import * as ast from './ast';
import * as parse from './parse';
import * as type from './type';
import * as xmile from './xmile';

const JsOps: Map<string, string> = Map({
  '&': '&&',
  '|': '||',
  '≥': '>=',
  '≤': '<=',
  '≠': '!==',
  '=': '===',
});

// An AST visitor. after calling walk() on the root of an equation's
// AST with an instance of this class, the visitor.code member will
// contain a string with valid JS code to be emitted into the
// Simulation Worker.
export class CodegenVisitor implements ast.Visitor<boolean> {
  offsets: Map<string, number>;
  code: string = '';
  isMain: boolean;
  scope: string;

  constructor(offsets: Map<string, number>, isMain: boolean) {
    this.offsets = offsets;
    this.isMain = isMain;
    this.scope = isMain ? 'curr' : 'globalCurr';
  }

  ident(n: ast.Ident): boolean {
    if (n.ident === 'time') {
      this.refTime();
    } else if (this.offsets.has(n.ident)) {
      this.refDirect(n.ident);
    } else {
      this.refIndirect(n.ident);
    }
    return true;
  }
  constant(n: ast.Constant): boolean {
    this.code += '' + n.value;
    return true;
  }
  call(n: ast.CallExpr): boolean {
    if (!n.fun.hasOwnProperty('ident')) {
      console.log('// for now, only idents can be used as fns.');
      console.log(n);
      return false;
    }
    const fn = (n.fun as ast.Ident).ident;
    if (!builtins.has(fn)) {
      console.log('// unknown builtin: ' + fn);
      return false;
    }
    this.code += fn;
    this.code += '(';
    const builtin = defined(builtins.get(fn));
    if (builtin.usesTime) {
      this.code += 'dt, ';
      this.refTime();
      if (n.args.length) {
        this.code += ', ';
      }
    }

    for (let i = 0; i < n.args.length; i++) {
      n.args[i].walk(this);
      if (i !== n.args.length - 1) {
        this.code += ', ';
      }
    }
    this.code += ')';
    return true;
  }
  if(n: ast.IfExpr): boolean {
    // use the ternary operator for if statements
    this.code += '(';
    n.cond.walk(this);
    this.code += ' ? ';
    n.t.walk(this);
    this.code += ' : ';
    n.f.walk(this);
    this.code += ')';
    return true;
  }
  paren(n: ast.ParenExpr): boolean {
    this.code += '(';
    n.x.walk(this);
    this.code += ')';
    return true;
  }
  unary(n: ast.UnaryExpr): boolean {
    // if we're doing 'not', explicitly convert the result
    // back to a number.
    const op = n.op === '!' ? '+!' : n.op;
    this.code += op;
    n.x.walk(this);
    return true;
  }
  binary(n: ast.BinaryExpr): boolean {
    // exponentiation isn't a builtin operator in JS, it
    // is implemented as a function in the Math module.
    if (n.op === '^') {
      this.code += 'Math.pow(';
      n.l.walk(this);
      this.code += ',';
      n.r.walk(this);
      this.code += ')';
      return true;
    } else if (n.op === '=' && n.l instanceof ast.Constant && isNaN(n.l.value)) {
      this.code += 'isNaN(';
      n.r.walk(this);
      this.code += ')';
      return true;
    } else if (n.op === '=' && n.r instanceof ast.Constant && isNaN(n.r.value)) {
      this.code += 'isNaN(';
      n.l.walk(this);
      this.code += ')';
      return true;
    }

    let op = n.op;
    // only need to convert some of them
    if (JsOps.has(n.op)) {
      op = defined(JsOps.get(n.op));
    }
    this.code += '(';
    n.l.walk(this);
    this.code += op;
    n.r.walk(this);
    this.code += ')';
    return true;
  }

  // the value of time in the current simulation step
  private refTime(): void {
    this.code += this.scope;
    this.code += '[0]';
  }

  // the value of an aux, stock, or flow in the current module
  private refDirect(ident: string): void {
    this.code += `curr[${defined(this.offsets.get(ident))}]`;
  }

  // the value of an overridden module input
  private refIndirect(ident: string): void {
    this.code += "globalCurr[this.ref['";
    this.code += ident;
    this.code += "']]";
  }
}

const variableDefaults = {
  xmile: undefined as xmile.Variable | undefined,
  valid: false as boolean,
  ident: undefined as string | undefined,
  eqn: undefined as string | undefined,
  ast: undefined as ast.Node | undefined,
  deps: Set<string>(),
};

export class Variable extends Record(variableDefaults) implements type.Variable {
  constructor(xVar?: xmile.Variable) {
    const variable = Object.assign({}, variableDefaults);
    variable.xmile = xVar;

    variable.ident = xVar && xVar.name ? xVar.ident : undefined;
    variable.eqn = xVar && xVar.eqn;

    if (variable.eqn) {
      const [ast, errs] = parse.eqn(variable.eqn);
      if (ast) {
        variable.ast = ast || undefined;
        variable.valid = true;
      }
    }

    // for a flow or aux, we depend on variables that aren't built
    // in functions in the equation.
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
    super(variable);
  }

  setAST(ast: ast.Node): Variable {
    return this.set('ast', ast).set('deps', identifierSet(ast));
  }

  // returns a string of this variables initial equation. suitable for
  // exec()'ing
  initialEquation(): string {
    return this.eqn || '';
  }

  code(parent: type.Model, offsets: Map<string, number>): string | undefined {
    if (this.isConst()) {
      return "this.initials['" + this.ident + "']";
    }
    const visitor = new CodegenVisitor(offsets, parent.ident === 'main');

    const ok = defined(this.ast).walk(visitor);
    if (!ok) {
      console.log('// codegen failed for ' + this.ident);
      return '';
    }

    return visitor.code;
  }

  getDeps(parent: type.Model, project: type.Project): Set<string> {
    let allDeps = Set<string>();
    for (const n of this.deps) {
      if (allDeps.has(n)) {
        continue;
      }
      allDeps = allDeps.add(n);
      const v = parent.vars.get(n);
      if (!v) {
        continue;
      }
      for (const nn of v.getDeps(parent, project)) {
        allDeps = allDeps.add(nn);
      }
    }
    return allDeps;
  }

  isConst(): boolean {
    return this.eqn !== undefined && isFinite(this.eqn);
  }
}

export class Stock extends Variable {
  readonly initial: string;
  readonly inflows: List<string>;
  readonly outflows: List<string>;

  constructor(xVar: xmile.Variable) {
    super(xVar);

    this.initial = xVar.eqn ? xVar.eqn : '';
    this.inflows = xVar.inflows || List();
    this.outflows = xVar.outflows || List();
  }

  // FIXME: returns a string of this variables initial equation. suitable for
  // exec()'ing
  initialEquation(): string {
    return this.initial;
  }

  code(parent: type.Model, offset: Map<string, number>): string | undefined {
    let eqn = 'curr[' + defined(offset.get(defined(this.ident))) + '] + (';
    if (this.inflows.size > 0) {
      eqn += this.inflows.map(s => 'curr[' + defined(offset.get(s)) + ']').join('+');
    }
    if (this.outflows.size > 0) {
      eqn += '- (' + this.outflows.map(s => 'curr[' + defined(offset.get(s)) + ']').join('+') + ')';
    }
    // stocks can have no inflows or outflows and still be valid
    if (this.inflows.size === 0 && this.outflows.size === 0) {
      eqn += '0';
    }
    eqn += ')*dt';
    return eqn;
  }
}

export class Table extends Variable {
  readonly x: List<number> = List();
  readonly y: List<number> = List();
  readonly ok: boolean = true;

  constructor(xVar: xmile.Variable) {
    super(xVar);

    const gf = defined(xVar.gf);
    const ypts = gf.yPoints;

    // FIXME(bp) unit test
    const xpts = gf.xPoints;
    const xscale = gf.xScale;
    const xmin = xscale ? xscale.min : 0;
    const xmax = xscale ? xscale.max : 0;

    if (!ypts) {
      return;
    }

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
      this.x = this.x.push(x);
      this.y = this.y.push(defined(ypts.get(i)));
    }
  }

  code(parent: type.Model, v: Map<string, number>): string | undefined {
    if (!this.eqn) {
      return undefined;
    }
    const index = defined(super.code(parent, v));
    return "lookup(this.tables['" + this.ident + "'], " + index + ')';
  }
}

export class Module extends Variable implements type.Module {
  readonly modelName: string;
  readonly refs: Map<string, Reference> = Map();

  constructor(xVar: xmile.Variable) {
    super(xVar);

    // This is a deviation from the XMILE spec, but is the
    // only thing that makes sense -- having a 1 to 1
    // relationship between model name and module name
    // would be insane.
    if (xVar.model) {
      this.modelName = xVar.model;
    } else {
      this.modelName = defined(xVar.ident);
    }

    if (xVar.connections) {
      for (const conn of xVar.connections) {
        const ref = new Reference(conn);
        this.refs = this.refs.set(defined(ref.ident), ref);
      }
    }
  }

  getDeps(parent: type.Model, project: type.Project): Set<string> {
    let allDeps = Set<string>();
    for (let n of this.deps) {
      if (allDeps.has(n)) {
        continue;
      }

      let context: type.Model;
      if (n[0] === '.') {
        context = defined(project.model(project.main.modelName));
        n = n.substr(1);
      } else {
        context = parent;
      }
      const parts = n.split('.');
      if (n === 'lynxes.lynxes') {
        debugger;
      }
      const v = context.lookup(n);
      if (!v) {
        throw new Error(`couldn't find ${n}`);
      }
      if (!(v instanceof Stock)) {
        allDeps = allDeps.add(parts[0]);
      }
      for (const nn of v.getDeps(parent, project)) {
        allDeps = allDeps.add(nn);
      }
    }
    return allDeps;
  }

  updateRefs(model: type.Model) {
    // for (const [name, v] of model.vars) {
    //   // skip modules
    //   if (!v.ident || model.modules.has(v.ident)) {
    //     continue;
    //   }
    //   // FIXME:  I'm pretty sure this doesn't make any sense
    //   // account for references into a child module
    //   const deps = v.deps;
    //   for (const depName of deps) {
    //     // console.log(`/* ${this.modelName} -- ${v.ident} look ${name} */`);
    //     if (!name.includes('.')) {
    //       continue;
    //     }
    //     // console.log(`/* got ${name} */`);
    //     const conn = new xmile.Connection({
    //       from: name,
    //       to: name,
    //     });
    //     const ref = new Reference(conn);
    //     // this.refs = this.refs.set(defined(ref.ident), ref);
    //   }
    // }
  }

  referencedModels(
    project: type.Project,
    all?: Map<string, type.ModelDef>,
  ): Map<string, type.ModelDef> {
    if (!all) {
      all = Map();
    }
    const mdl = defined(project.model(this.modelName));
    const name = mdl.name;
    if (all.has(name)) {
      const def = defined(all.get(name)).update('modules', (modules: Set<type.Module>) =>
        modules.add(this),
      );
      all = all.set(name, def);
    } else {
      all = all.set(
        name,
        new type.ModelDef({
          model: mdl,
          modules: Set<type.Module>([this]),
        }),
      );
    }
    for (const [name, module] of mdl.modules) {
      all = module.referencedModels(project, all);
    }
    return all;
  }
}

export class Reference extends Variable implements type.Reference {
  readonly xmileConn: xmile.Connection;
  readonly ptr: string;

  constructor(conn: xmile.Connection) {
    super(new xmile.Variable({ name: conn.to }));
    this.xmileConn = conn;
    this.ptr = conn.from;
  }

  code(parent: type.Model, offsets: Map<string, number>): string | undefined {
    return `curr["${this.ptr}"]`;
  }

  isConst(): boolean {
    // FIXME(bp) should actually lookup whether this.ptr is const,
    // but that requires module instance walking in Model which I
    // don't want to implement yet.
    return false;
  }
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
