// Copyright 2015 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

// FIXME: this seems to fix a bug in Typescript 1.5
declare function isFinite(n: string | number): boolean;

import { Map, Set } from 'immutable';

import * as ast from './ast';
import * as common from './common';
import * as parse from './parse';
import * as type from './type';
import * as util from './util';
import * as xmile from './xmile';

const JsOps: Map<string, string> = Map({
  '&': '&&',
  '|': '||',
  '≥': '>=',
  '≤': '<=',
  '≠': '!==',
  '=': '===',
});

const defined = util.defined;

// An AST visitor. after calling walk() on the root of an equation's
// AST with an instance of this class, the visitor.code member will
// contain a string with valid JS code to be emitted into the
// Simulation Worker.
export class CodegenVisitor implements ast.Visitor<boolean> {
  offsets: type.Offsets;
  code: string = '';
  isMain: boolean;
  scope: string;

  constructor(offsets: type.Offsets, isMain: boolean) {
    this.offsets = offsets;
    this.isMain = isMain;
    this.scope = isMain ? 'curr' : 'globalCurr';
  }

  ident(n: ast.Ident): boolean {
    if (n.ident === 'time') {
      this.refTime();
    } else if (n.ident in this.offsets) {
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
    if (!common.builtins.has(fn)) {
      console.log('// unknown builtin: ' + fn);
      return false;
    }
    this.code += fn;
    this.code += '(';
    const builtin = defined(common.builtins.get(fn));
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
    } else if (
      n.op === '=' &&
      n.l instanceof ast.Constant &&
      isNaN(n.l.value)
    ) {
      this.code += 'isNaN(';
      n.r.walk(this);
      this.code += ')';
      return true;
    } else if (
      n.op === '=' &&
      n.r instanceof ast.Constant &&
      isNaN(n.r.value)
    ) {
      this.code += 'isNaN(';
      n.l.walk(this);
      this.code += ')';
      return true;
    }

    let op = n.op;
    // only need to convert some of them
    if (JsOps.has(n.op)) {
      op = JsOps.get(n.op);
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
    this.code += 'curr[';
    this.code += this.offsets[ident];
    this.code += ']';
  }

  // the value of an overridden module input
  private refIndirect(ident: string): void {
    this.code += "globalCurr[this.ref['";
    this.code += ident;
    this.code += "']]";
  }
}

export class Variable implements type.Variable {
  xmile: xmile.Variable;
  valid: boolean;
  ident: string;
  eqn: string;
  ast: ast.Node;

  project: type.Project;
  parent: type.Model;
  // only for modules
  model: type.Model;

  private deps: Set<string>;
  private allDeps: Set<string>;

  constructor(model?: type.Model, v?: xmile.Variable) {
    if (!arguments.length) {
      return;
    }
    this.model = model;
    this.xmile = v;

    this.ident = v.ident;
    this.eqn = v.eqn || '';

    let errs: string[];
    [this.ast, errs] = parse.eqn(this.eqn);
    if (errs) {
      console.log('// parse failed for ' + this.ident + ': ' + errs[0]);
      this.valid = false;
    } else {
      this.valid = true;
    }

    // for a flow or aux, we depend on variables that aren't built
    // in functions in the equation.
    this.deps = identifierSet(this.ast);
  }

  // returns a string of this variables initial equation. suitable for
  // exec()'ing
  initialEquation(): string {
    return this.eqn;
  }

  code(offsets: type.Offsets): string {
    if (this.isConst()) {
      return "this.initials['" + this.ident + "']";
    }
    const visitor = new CodegenVisitor(offsets, this.model.ident === 'main');

    const ok = this.ast.walk(visitor);
    if (!ok) {
      console.log('// codegen failed for ' + this.ident);
      return '';
    }

    return visitor.code;
  }

  getDeps(): Set<string> {
    if (this.allDeps) {
      return this.allDeps;
    }
    let allDeps = Set<string>();
    for (const n of this.deps) {
      if (allDeps.has(n)) {
        continue;
      }
      allDeps = allDeps.add(n);
      const v = this.model.vars.get(n);
      if (!v) {
        continue;
      }
      for (const nn of v.getDeps()) {
        allDeps = allDeps.add(nn);
      }
    }
    this.allDeps = allDeps;
    return allDeps;
  }

  lessThan(that: Variable): boolean {
    return that.getDeps().has(this.ident);
  }

  isConst(): boolean {
    return isFinite(this.eqn);
  }
}

export class Stock extends Variable {
  initial: string;
  inflows: string[];
  outflows: string[];

  constructor(model: type.Model, v: xmile.Variable) {
    super(model, v);

    this.initial = v.eqn || '';
    this.inflows = v.inflows || [];
    this.outflows = v.outflows || [];
  }

  // FIXME: returns a string of this variables initial equation. suitable for
  // exec()'ing
  initialEquation(): string {
    return this.initial;
  }

  code(v: type.Offsets): string {
    let eqn = 'curr[' + v[this.ident] + '] + (';
    if (this.inflows.length > 0) {
      eqn += this.inflows.map(s => 'curr[' + v[s] + ']').join('+');
    }
    if (this.outflows.length > 0) {
      eqn +=
        '- (' + this.outflows.map(s => 'curr[' + v[s] + ']').join('+') + ')';
    }
    // stocks can have no inflows or outflows and still be valid
    if (this.inflows.length === 0 && this.outflows.length === 0) {
      eqn += '0';
    }
    eqn += ')*dt';
    return eqn;
  }
}

export class Table extends Variable {
  x: number[] = [];
  y: number[] = [];
  ok: boolean = true;

  constructor(model: type.Model, v: xmile.Variable) {
    super(model, v);

    const ypts = v.gf.yPoints;

    // FIXME(bp) unit test
    const xpts = v.gf.xPoints;
    const xscale = v.gf.xScale;
    const xmin = xscale ? xscale.min : 0;
    const xmax = xscale ? xscale.max : 0;

    for (let i = 0; i < ypts.length; i++) {
      let x: number;
      // either the x points have been explicitly specified, or
      // it is a linear mapping of points between xmin and xmax,
      // inclusive
      if (xpts) {
        x = xpts[i];
      } else {
        x = (i / (ypts.length - 1)) * (xmax - xmin) + xmin;
      }
      this.x.push(x);
      this.y.push(ypts[i]);
    }
  }

  code(v: type.Offsets): string {
    if (!this.eqn) {
      return null;
    }
    const index = super.code(v);
    return "lookup(this.tables['" + this.ident + "'], " + index + ')';
  }
}

export class Module extends Variable implements type.Module {
  modelName: string;
  refs: Map<string, Reference>;

  constructor(project: type.Project, parent: type.Model, v: xmile.Variable) {
    super();

    this.project = project;
    this.parent = parent;
    this.xmile = v;
    this.ident = v.ident;
    // This is a deviation from the XMILE spec, but is the
    // only thing that makes sense -- having a 1 to 1
    // relationship between model name and module name
    // would be insane.
    if (v.model) {
      this.modelName = v.model;
    } else {
      this.modelName = this.ident;
    }
    this.refs = Map();
    this.deps = Set<string>();
    for (let i = 0; v.connections && i < v.connections.length; i++) {
      const ref = new Reference(v.connections[i]);
      this.refs = this.refs.set(ref.ident, ref);
      this.deps = this.deps.add(ref.ptr);
    }
  }

  getDeps(): Set<string> {
    if (this.allDeps) {
      return this.allDeps;
    }
    let allDeps = Set<string>();
    for (let n of this.deps) {
      if (allDeps.has(n)) {
        continue;
      }

      let context: type.Model;
      if (n[0] === '.') {
        context = this.project.model(this.project.main.modelName);
        n = n.substr(1);
      } else {
        context = this.parent;
      }
      const parts = n.split('.');
      const v = context.lookup(n);
      if (!v) {
        console.log('couldnt find ' + n);
        continue;
      }
      if (!(v instanceof Stock)) {
        allDeps = allDeps.add(parts[0]);
      }
      for (const nn of v.getDeps()) {
        allDeps = allDeps.add(nn);
      }
    }
    this.allDeps = allDeps;
    return allDeps;
  }

  updateRefs(model: type.Model) {
    for (const [name, v] of model.vars) {
      // skip modules
      if (model.modules.has(v.ident)) {
        continue;
      }

      // account for references into a child module
      const deps = v.deps;
      for (const depName of deps) {
        console.log(`/* ${this.modelName} -- ${v.ident} look ${name} */`);
        if (!name.includes('.')) {
          continue;
        }
        console.log(`/* got ${name} */`);
        const conn = new xmile.Connection();
        conn.from = name;
        conn.to = name;
        const ref = new Reference(conn);
        this.refs = this.refs.set(ref.ident, ref);
      }
    }
  }

  referencedModels(
    all?: Map<string, type.ModelDef>,
  ): Map<string, type.ModelDef> {
    if (!all) {
      all = Map();
    }
    const mdl = this.project.model(this.modelName);
    const name = mdl.name;
    if (all.has(name)) {
      const def = defined(all.get(name)).update(
        'modules',
        (modules: Set<type.Module>) => modules.add(this),
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
      all = module.referencedModels(all);
    }
    return all;
  }
}

export class Reference extends Variable implements type.Reference {
  xmileConn: xmile.Connection;
  ptr: string;

  constructor(conn: xmile.Connection) {
    super();
    // FIXME: there is maybe something cleaner to do here?
    this.xmile = null;
    this.xmileConn = conn;
    this.ident = conn.to;
    this.ptr = conn.from;
  }

  code(v: type.Offsets): string {
    return 'curr["' + this.ptr + '"]';
  }

  lessThan(that: Variable): boolean {
    return that.getDeps().has(this.ptr);
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
