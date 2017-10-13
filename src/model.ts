// Copyright 2015 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

'use strict';

import * as common from './common';
import * as type from './type';
import * as util from './util';
import * as vars from './vars';
import * as draw from './draw';
import * as sim from './sim';
import * as xmile from './xmile';
import * as ast from './ast';


const VAR_TYPES = util.set('module', 'stock', 'aux', 'flow');

export class Model implements type.Model {
	name:    string;
	valid:   boolean;
	project: type.Project;
	xModel:  xmile.Model;
	modules: type.ModuleMap   = {};
	tables:  type.TableMap    = {};
	vars:    type.VariableMap = {};

	private spec: type.SimSpec;

	constructor(project: type.Project, ident: string, xModel: xmile.Model) {
		this.project = project;
		this.xModel = xModel;

		this.name = ident;
		this.vars = {};
		this.tables = {};
		this.modules = {};

		this.parseVars(xModel.variables);

		this.spec = xModel.simSpec || null;
		this.valid = true;
		return;
	}

	get ident(): string {
		return xmile.canonicalize(this.name);
	}

	get simSpec(): type.SimSpec {
		return this.spec || this.project.simSpec;
	}

	lookup(id: string): type.Variable {
		if (id[0] === '.')
			id = id.substr(1);
		if (id in this.vars)
			return this.vars[id];
		let parts = id.split('.');
		let module = this.modules[parts[0]];
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

	drawing(
		svgElementID: string,
		overrideColors: boolean,
		enableMousewheel: boolean,
		stocksXYCenter = false): draw.Drawing {

		// FIXME: return first 'stock_flow' view, allow
		// returning other views.
		return new draw.Drawing(
			this, this.xModel.views[0], svgElementID,
			overrideColors, enableMousewheel, stocksXYCenter);
	}

	/**
	 * Validates & figures out all necessary variable information.
	 */
	private parseVars(variables: xmile.Variable[]): xmile.Error | null {
		for (let i in variables) {
			if (!variables.hasOwnProperty(i))
				continue;

			let v = variables[i];
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
				this.modules[ident] = module;
				this.vars[ident] = module;
				break;
			case 'stock':
				let stock = new vars.Stock(this, v);
				this.vars[ident] = stock;
				break;
			case 'aux':
				// FIXME: fix Variable/GF/Table nonsense
				let aux: type.Variable | null = null;
				if (v.gf) {
					let table = new vars.Table(this, v);
					if (table.ok) {
						this.tables[ident] = table;
						aux = table;
					}
				}
				if (aux === null)
					aux = new vars.Variable(this, v);
				this.vars[ident] = aux;
				break;
			case 'flow':
				let flow: type.Variable | null = null;
				if (v.gf) {
					let table = new vars.Table(this, v);
					if (table.ok) {
						this.tables[ident] = table;
						flow = table;
					}
				}
				if (flow === null)
					flow = new vars.Variable(this, v);
				this.vars[ident] = flow;
				break;
			default:
				throw 'unreachable: unknown type "' + v.type + '"';
			}
		}

		return this.instantiateImplicitModules();
	}

	private instantiateImplicitModules(): xmile.Error | null {

		let visitor = new BuiltinVisitor(this.project);

		for (let name in this.vars) {
			if (!this.vars.hasOwnProperty(name))
				continue;

			let v = this.vars[name];

			// check for builtins that require module instantiations
			if (v.ast)
				v.ast = v.ast.walk(visitor);
		}

		return null;
	}
}

// An AST visitor to deal with desugaring calls to builtin functions
// that are actually module instantiations
class BuiltinVisitor implements ast.Visitor<ast.Node> {
	project: type.Project;
	modules: type.ModuleMap;
	vars: type.TableMap;

	constructor(project: type.Project) {
		this.project = project;
	}

	ident(n: ast.Ident): ast.Node {
		return n;
	}
	constant(n: ast.Constant): ast.Node {
		return n;
	}
	call(n: ast.CallExpr): ast.Node {
		if (!n.fun.hasOwnProperty('ident')) {
			console.log('// for now, only idents can be used as fns.');
			console.log(n);
			return n;
		}
		let fn = (<ast.Ident>n.fun).ident;
		if (!(fn in common.builtins)) {
			console.log('// unknown builtin: ' + fn);
			return n;
		}

		let args = [];
		for (let i = 0; i < n.args.length; i++) {
			args.push(n.args[i].walk(this));
		}
		return new ast.CallExpr(n.fun, n._lParenPos, args, n._rParenPos);
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
