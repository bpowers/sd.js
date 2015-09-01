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

export class Variable implements type.Variable {
	xmile: any;
	name: string;
	eqn: string;

	model: type.Model;
	parent: type.Model;
	project: type.Project;

	_deps: type.StringSet;
	_allDeps: type.StringSet;

	constructor(model?: type.Model, xmile?: any) {
		// for subclasses, when instantiated for their prototypes
		if (arguments.length === 0)
			return;

		this.model = model;
		this.xmile = xmile;

		let eqn = '';
		if (xmile.eqn)
			eqn = xmile.eqn.toString().toLowerCase();
		this.eqn = eqn;
		this.name = util.eName(xmile['@name']);

		// for a flow or aux, we depend on variables that aren't built
		// in functions in the equation.
		this._deps = lex.identifierSet(eqn);
	};
	// returns a string of this variables initial equation. suitable for
	// exec()'ing
	initialEquation(): string {
		return this.eqn;
	};
	code(v: type.Offsets): string {
		if (this.isConst())
			return "this.initials['" + util.eName(this.name) + "']";
		let lexer = new lex.Lexer(this.eqn);
		let result: string[] = [];
		let commentDepth = 0;
		let scope: string;
		let tok: lex.Token;
		while ((tok = lexer.getToken())) {
			if (tok.tok === '{') {
				commentDepth++;
			} else if (tok.tok === '}') {
				commentDepth--;
			} else if (commentDepth > 0) {
				// if inside of a {} delimited comment, skip the token
				continue;
			} else if (tok.tok in common.reserved) {
				switch (tok.tok) {
				case 'if':
					break; // skip
				case 'then':
					result.push('?');
					break;
				case 'else':
					result.push(':');
					break;
				default:
					console.log('ERROR: unexpected tok: ' + tok.tok);
				}
			} else if (tok.type !== lex.TokenType.IDENT) {
				// FIXME :(
				result.push(''+tok.tok);
			} else if (tok.tok in common.builtins) {
				// FIXME :(
				result.push(''+tok.tok);
				if (common.builtins[tok.tok].usesTime) {
					lexer.getToken(); // is '('
					scope = this.model.name === 'main' ? 'curr' : 'globalCurr';
					result.push('(', 'dt', ',', scope + '[0]', ',');
				}
			} else if (tok.tok in v) {
				result.push("curr[" + v[tok.tok] + "]");
			} else {
				result.push('globalCurr[this.ref["' + tok.tok + '"]]');
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
		return this.name in that.getDeps();
	}

	isConst(): boolean {
		return isFinite(this.eqn);
	}
}

export class Stock extends Variable {
	inflows: string[];
	outflows: string[];
	initial: string;

	constructor(model: type.Model, xmile: any) {
		super();

		this.model = model;
		this.xmile = xmile;
		let eqn = '';
		if (xmile.eqn)
			eqn = xmile.eqn.toString().toLowerCase();
		this.name = util.eName(xmile['@name']);
		this.initial = eqn;
		this.eqn = eqn;
		if (!xmile.inflow)
			xmile.inflow = [];
		if (!(xmile.inflow instanceof Array))
			xmile.inflow = [xmile.inflow];
		if (!xmile.outflow)
			xmile.outflow = [];
		if (!(xmile.outflow instanceof Array))
			xmile.outflow = [xmile.outflow];
		this.inflows = xmile.inflow.map(function(s: string): string {
			return util.eName(s);
		});
		this.outflows = xmile.outflow.map(function(s: string): string {
			return util.eName(s);
		});

		// for a stock, the dependencies are any identifiers (that
		// aren't references to builtin functions) in the initial
		// variable string.  Deps are used for sorting equations into
		// the right order, so for now we don't add any of the flows.
		this._deps = lex.identifierSet(eqn);
	}

	// returns a string of this variables initial equation. suitable for
	// exec()'ing
	initialEquation(): string {
		return this.initial;
	}

	code(v: type.Offsets): string {
		let eqn = "curr[" + v[this.name] + "] + (";
		if (this.inflows.length > 0)
			eqn += this.inflows.map(function(s: string): string { return "curr[" + v[s] + "]"; }).join('+');
		if (this.outflows.length > 0)
			eqn += '- (' + this.outflows.map(function(s: string): string { return "curr[" + v[s] + "]"; }).join('+') + ')';
		// stocks can have no inflows or outflows and still be valid
		if (this.inflows.length === 0 && this.outflows.length === 0) {
			eqn += '0';
		}
		eqn += ')*dt';
		return eqn;
	}
}

export class Table extends Variable {
	x: number[];
	y: number[];
	ok: boolean;

	constructor(model: type.Model, xmile: any) {
		super();

		this.model = model;
		this.xmile = xmile;
		let eqn = '';
		if (eqn)
			eqn = xmile.eqn.toString().toLowerCase();
		this.eqn = eqn;
		this.name = util.eName(xmile['@name']);
		this.x = [];
		this.y = [];
		this.ok = true;

		if (!xmile.gf.ypts) {
			this.ok = false;
			return;
		}

		let ypts: number[];
		let sep: string;
		if (typeof xmile.gf.ypts === 'object') {
			sep = xmile.gf.ypts['@sep'] || ',';
			ypts = util.numArr(xmile.gf.ypts.keyValue.split(sep));
		} else {
			ypts = util.numArr(xmile.gf.ypts.split(','));
		}

		// FIXME(bp) unit test
		let xpts: number[] = null;
		if (typeof xmile.gf.xpts === 'object') {
			sep = xmile.gf.xpts['@sep'] || ',';
			xpts = util.numArr(xmile.gf.xpts.keyValue.split(sep));
		} else if (xmile.gf.xpts) {
			xpts = util.numArr(xmile.gf.xpts.split(','));
		}

		let xscale = xmile.gf.xscale;
		let xmin = xscale ? xscale['@min'] : 0;
		let xmax = xscale ? xscale['@max'] : 0;

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

		this._deps = lex.identifierSet(eqn);
	}

	code(v: type.Offsets): string {
		if (!this.eqn)
			return null;
		let index = super.code(v);
		return "lookup(this.tables['" + this.name + "'], " + index + ")";
	}
}

export class Module extends Variable implements type.Module {
	modelName: string;
	refs: type.RefSet;

	constructor(project: type.Project, parent: type.Model, xmile: any) {
		super();

		this.project = project;
		this.parent = parent;
		this.xmile = xmile;
		this.name = util.eName(xmile['@name']);
		this.modelName = this.name;
		if (!xmile.connect)
			xmile.connect = [];
		if (!(xmile.connect instanceof Array))
			xmile.connect = [xmile.connect];
		this.refs = {};
		this._deps = {};
		for (let i = 0; i < xmile.connect.length; i++) {
			let ref = new Reference(xmile.connect[i]);
			this.refs[ref.name] = ref;
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
	ptr: string;

	constructor(xmile: any) {
		super();
		this.xmile = xmile;
		this.name = util.eName(xmile['@to']);
		this.ptr = util.eName(xmile['@from']);
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
