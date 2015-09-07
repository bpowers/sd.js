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
		let mod: type.Module;
		if (this.name === 'main') {
			mod = this.project.main;
		} else {
			mod = null; // new vars.Module(this.project, null, 'main', this.name);
			console.log('FIXME: sim of non-main model');
		}
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
	private parseVars(variables: xmile.Variable[]): xmile.Error {
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
				let aux: type.Variable = null;
				if (v.gf) {
					let table = new vars.Table(this, v);
					if (table.ok) {
						this.tables[ident] = table;
						aux = table;
					}
				}
				if (!aux)
					aux = new vars.Variable(this, v);
				this.vars[ident] = aux;
				break;
			case 'flow':
				let flow: type.Variable = null;
				if (v.gf) {
					let table = new vars.Table(this, v);
					if (table.ok) {
						this.tables[ident] = table;
						flow = table;
					}
				}
				if (!flow)
					flow = new vars.Variable(this, v);
				this.vars[ident] = flow;
			}
		}
		return null;
	}
}
