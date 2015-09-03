// Copyright 2015 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

'use strict';

// FIXME: this seems to fix a bug in Typescript 1.5
declare function isFinite(n: string|number): boolean;

import common = require('./common');
import util = require('./util');
import lex = require('./lex');
import type = require('./type');
import xmile = require('./xmile');

const opMap: {[op: string]: string} = {
	'&': '&&',
	'|': '||',
	'≥': '>=',
	'≤': '<=',
	'≠': '!==',
	'=': '===',
};

export class Variable implements type.Variable {
	xmile: xmile.Variable;
	ident: string;
	eqn: string;

	project: type.Project;
	parent: type.Model;
	// only for modules
	model: type.Model;

	_deps: type.StringSet;
	_allDeps: type.StringSet;

	constructor(model?: type.Model, v?: xmile.Variable) {
		// for subclasses, when instantiated for their prototypes
		if (arguments.length === 0)
			return;

		this.model = model;
		this.xmile = v;

		this.eqn = v.eqn;
		this.ident = v.ident;

		// for a flow or aux, we depend on variables that aren't built
		// in functions in the equation.
		this._deps = lex.identifierSet(this.eqn);
	};
	// returns a string of this variables initial equation. suitable for
	// exec()'ing
	initialEquation(): string {
		return this.eqn;
	};
	code(v: type.Offsets): string {
		if (this.isConst())
			return "this.initials['" + this.ident + "']";
		let lexer = new lex.Lexer(this.eqn);
		let result: string[] = [];
		let commentDepth = 0;
		let scope: string;
		let tok: lex.Token;
		while ((tok = lexer.nextTok())) {
			let ident = xmile.canonicalize(tok.tok);
			if (tok.tok in common.reserved) {
				switch (ident) {
				case 'if':
					break; // skip
				case 'then':
					result.push('?');
					break;
				case 'else':
					result.push(':');
					break;
				default:
					console.log('ERROR: unexpected tok: ' + ident);
				}
			} else if (tok.type !== lex.TokenType.IDENT) {
				// FIXME :(
				let op = tok.tok;
				if (op in opMap)
					op = opMap[op];
				result.push(''+op);
			} else if (ident in common.builtins) {
				// FIXME :(
				result.push(''+ident);
				if (common.builtins[ident].usesTime) {
					lexer.nextTok(); // is '('
					scope = this.model.ident === 'main' ? 'curr' : 'globalCurr';
					result.push('(', 'dt', ',', scope + '[0]', ',');
				}
			} else if (ident in v) {
				result.push("curr[" + v[ident] + "]");
			} else if (ident === 'time') {
				scope = this.model.ident === 'main' ? 'curr' : 'globalCurr';
				result.push(scope + '[0]');
			} else {
				result.push('globalCurr[this.ref["' + ident + '"]]');
			}
		}
		if (!result.length) {
			// console.log('COMPAT empty equation for ' + this.name);
			result.push('0');
		}
		return result.join(' ');
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
		super();

		this.model = model;
		this.xmile = v;
		this.ident = v.ident;
		this.initial = v.eqn;
		// FIXME: I don't think this is necessary - commented out to find out.
		this.eqn = v.eqn;
		this.inflows = v.inflows;
		this.outflows = v.outflows;

		// for a stock, the dependencies are any identifiers (that
		// aren't references to builtin functions) in the initial
		// variable string.  Deps are used for sorting equations into
		// the right order, so for now we don't add any of the flows.
		this._deps = lex.identifierSet(this.initial);
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
		super();

		this.model = model;
		this.xmile = v;
		this.eqn = v.eqn;
		this.ident = v.ident;

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

		this._deps = lex.identifierSet(this.eqn);
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
		for (let i = 0; i < v.connections.length; i++) {
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
	};
	isConst(): boolean {
		// FIXME(bp) should actually lookup whether this.ptr is const,
		// but that requires module instance walking in Model which I
		// don't want to implement yet.
		return false;
	}
}
