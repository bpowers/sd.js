// Copyright 2015 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

'use strict';

import common = require('./common');
import type = require('./type');
import util = require('./util');
import vars = require('./vars');
import draw = require('./draw');
import sim = require('./sim');
import xmile = require('./xmile');


const VAR_TYPES = util.set('module', 'stock', 'aux', 'flow');

export class Model implements type.Model {
	name:    string;
	valid:   boolean;
	project: type.Project;
	xModel:  xmile.Model;
	modules: type.ModuleMap;
	tables:  type.TableMap;
	vars:    type.VariableMap;

	private spec: type.SimSpec;

	constructor(project: type.Project, xModel: xmile.Model) {
		this.project = project;
		this.xModel = xModel;

		this.name = xModel.ident;
		this.vars = {};
		this.tables = {};
		this.modules = {};

		this.parseVars(xModel.variables);

		this.spec = xModel.simSpec || null;
		this.valid = true;
		return;
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

	drawing(svgElementID: string, overrideColors: boolean, enableMousewheel: boolean): draw.Drawing {
		return new draw.Drawing(
			this, this.xModel.views[0], svgElementID,
			overrideColors, enableMousewheel);
	}

	/**
	 * Validates & figures out all necessary variable information.
	 */
	private parseVars(defs: any): void {
		// JXON doesn't have the capacity to know when we really want
		// things to be lists, this is a workaround.
		for (let type in VAR_TYPES) {
			// for every known type, make sure we have a list of
			// elements even if there is only one element (e.g. a
			// module)
			if (defs[type] && !(defs[type] instanceof Array))
				defs[type] = [defs[type]];
		}

		if (defs.module) {
			for (let i = 0; i < defs.module.length; i++) {
				let xmile = defs.module[i];
				let module = new vars.Module(this.project, this, xmile);
				this.modules[module.name] = module;
				this.vars[module.name] = module;
			}
		}

		if (defs.stock) {
			for (let i = 0; i < defs.stock.length; i++) {
				let xmile = defs.stock[i];
				let stock = new vars.Stock(this, xmile);
				this.vars[stock.name] = stock;
			}
		}

		if (defs.aux) {
			for (let i = 0; i < defs.aux.length; i++) {
				let xmile = defs.aux[i];
				let aux: type.Variable = null;
				if (xmile.gf) {
					let table = new vars.Table(this, xmile);
					if (table.ok) {
						this.tables[aux.name] = table;
						aux = table;
					}
				}
				if (!aux)
					aux = new vars.Variable(this, xmile);
				this.vars[aux.name] = aux;
			}
		}

		if (defs.flow) {
			for (let i = 0; i < defs.flow.length; i++) {
				let xmile = defs.flow[i];
				let flow: type.Variable = null;
				if (xmile.gf) {
					let table = new vars.Table(this, xmile);
					if (table.ok) {
						this.tables[flow.name] = table;
						flow = table;
					}
				}
				if (!flow)
					flow = new vars.Variable(this, xmile);
				this.vars[flow.name] = flow;
			}
		}
	}
}
