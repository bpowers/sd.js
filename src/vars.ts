// Copyright 2015 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

'use strict';

// FIXME: this seems to fix a bug in Typescript 1.5
declare function isFinite(n: string|number): boolean;

import * as common from './common';
import * as util from './util';
import {identifierSet} from './lex';
import * as parse from './parse';
import * as type from './type';
import * as xmile from './xmile';
import * as ast from './ast';

const JS_OP: {[op: string]: string} = {
	'&': '&&',
	'|': '||',
	'≥': '>=',
	'≤': '<=',
	'≠': '!==',
	'=': '===',
};

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
		if (n.ident === 'time')
			this.refTime();
		else if (n.ident in this.offsets)
			this.refDirect(n.ident);
		else
			this.refIndirect(n.ident);
		return true;
	}
	constant(n: ast.Constant): boolean {
		this.code += (''+n.value);
		return true;
	}
	call(n: ast.CallExpr): boolean {
		if (!n.fun.hasOwnProperty('ident')) {
			console.log('// for now, only idents can be used as fns.');
			console.log(n);
			return false;
		}
		let fn = (<ast.Ident>n.fun).ident;
		if (!(fn in common.builtins)) {
			console.log('// unknown builtin: ' + fn);
			return false;
		}
		this.code += fn;
		this.code += '(';
		if (common.builtins[fn].usesTime) {
			this.code += 'dt, ';
			this.refTime();
			if (n.args.length)
				this.code += ', ';
		}

		for (let i = 0; i < n.args.length; i++) {
			n.args[i].walk(this);
			if (i !== n.args.length-1)
				this.code += ', ';
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
		let op = n.op === '!' ? '+!' : n.op;
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
		}

		let op = n.op;
		// only need to convert some of them
		if (n.op in JS_OP)
			op = JS_OP[n.op];
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

	_deps: type.StringSet;
	_allDeps: type.StringSet;

	constructor(model?: type.Model, v?: xmile.Variable) {
		if (!arguments.length)
			return;
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
		this._deps = identifierSet(this.eqn);
	}

	// returns a string of this variables initial equation. suitable for
	// exec()'ing
	initialEquation(): string {
		return this.eqn;
	}

	code(offsets: type.Offsets): string {
		if (this.isConst())
			return "this.initials['" + this.ident + "']";
		let visitor = new CodegenVisitor(offsets, this.model.ident === 'main');

		let ok = this.ast.walk(visitor);
		if (!ok) {
			console.log('// codegen failed for ' + this.ident);
			return '';
		}

		return visitor.code;
	}

	getDeps(): type.StringSet {
		if (this._allDeps)
			return this._allDeps;
		let allDeps: type.StringSet = {};
		for (let n in this._deps) {
			if (n in allDeps)
				continue;
			allDeps[n] = true;
			let v = this.model.vars[n];
			if (!v)
				continue;
			let otherDeps = v.getDeps();
			for (let nn in otherDeps) {
				if (otherDeps.hasOwnProperty(nn))
					allDeps[nn] = true;
			}
		}
		this._allDeps = allDeps;
		return allDeps;
	}

	lessThan(that: Variable): boolean {
		return this.ident in that.getDeps();
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
		let eqn = "curr[" + v[this.ident] + "] + (";
		if (this.inflows.length > 0)
			eqn += this.inflows.map((s)=> "curr[" + v[s] + "]").join('+');
		if (this.outflows.length > 0)
			eqn += '- (' + this.outflows.map((s)=> "curr[" + v[s] + "]").join('+') + ')';
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

		let ypts = v.gf.yPoints;

		// FIXME(bp) unit test
		let xpts = v.gf.xPoints;
		let xscale = v.gf.xScale;
		let xmin = xscale ? xscale.min : 0;
		let xmax = xscale ? xscale.max : 0;

		for (let i = 0; i < ypts.length; i++) {
			let x: number;
			// either the x points have been explicitly specified, or
			// it is a linear mapping of points between xmin and xmax,
			// inclusive
			if (xpts) {
				x = xpts[i];
			} else {
				x = (i/(ypts.length-1))*(xmax-xmin) + xmin;
			}
			this.x.push(x);
			this.y.push(ypts[i]);
		}
	}

	code(v: type.Offsets): string {
		if (!this.eqn)
			return null;
		let index = super.code(v);
		return "lookup(this.tables['" + this.ident + "'], " + index + ")";
	}
}

export class Module extends Variable implements type.Module {
	modelName: string;
	refs: type.ReferenceMap;

	constructor(project: type.Project, parent: type.Model, v: xmile.Variable) {
		super();

		this.project = project;
		this.parent = parent;
		this.xmile = v;
		this.ident = v.ident;
		// FIXME: not always true?
		this.modelName = this.ident;
		this.refs = {};
		this._deps = {};
		for (let i = 0; v.connections && i < v.connections.length; i++) {
			let ref = new Reference(v.connections[i]);
			this.refs[ref.ident] = ref;
			this._deps[ref.ptr] = true;
		}
	}
	getDeps(): type.StringSet {
		if (this._allDeps)
			return this._allDeps;
		let allDeps: type.StringSet = {};
		for (let n in this._deps) {
			if (!this._deps.hasOwnProperty(n))
				continue;

			if (n in allDeps)
				continue;

			let context: type.Model;
			if (n[0] === '.') {
				context = this.project.model(this.project.main.modelName);
				n = n.substr(1);
			} else {
				context = this.parent;
			}
			let parts = n.split('.');
			let v = context.lookup(n);
			if (!v) {
				console.log('couldnt find ' + n);
				continue;
			}
			if (!(v instanceof Stock))
				allDeps[parts[0]] = true;
			let otherDeps = v.getDeps();
			for (let nn in otherDeps) {
				if (otherDeps.hasOwnProperty(nn))
					allDeps[nn] = true;
			}
		}
		this._allDeps = allDeps;
		return allDeps;
	}

	referencedModels(all?: type.ModelDefSet): type.ModelDefSet {
		if (!all)
			all = {};
		let mdl = this.project.model(this.modelName);
		const name = mdl.name;
		if (all[name]) {
			all[name].modules.push(this);
		} else {
			all[name] = {
				model:   mdl,
				modules: [this],
			};
		}
		for (let n in mdl.modules) {
			if (mdl.modules.hasOwnProperty(n))
				mdl.modules[n].referencedModels(all);
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
		return this.ptr in that.getDeps();
	}

	isConst(): boolean {
		// FIXME(bp) should actually lookup whether this.ptr is const,
		// but that requires module instance walking in Model which I
		// don't want to implement yet.
		return false;
	}
}
