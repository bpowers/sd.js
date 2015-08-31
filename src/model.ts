// Copyright 2013 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

'use strict';

import common = require('./common');
import util = require('./util');
import vars = require('./vars');
import draw = require('./draw');
import sim = require('./sim');


interface TimeSpec {
	start: number;
	stop: number;
	dt: number;
	savestep: number;
}
const VAR_TYPES = util.set('module', 'stock', 'aux', 'flow');

export class Model {
	// TODO: remove any
	project: any;
	xmile: any;
	name: string;
	_timespec: TimeSpec;

	constructor(project: IProject, xmile) {
		this.project = project;
		this.xmile = xmile;
		this.name = util.eName(xmile['@name']);
		this._parseVars(xmile.variables);
		if (xmile.sim_specs) {
			this._timespec = xmile.sim_specs;
		} else {
			this._timespec = null;
		}
		util.normalizeTimespec(this._timespec);
		this.valid = true;
		return;
	}

	get timespec(): TimeSpec {
		if (this._timespec) {
			return this._timespec;
		} else {
			return this.project.timespec;
		}
	}

	/**
	 * Validates & figures out all necessary variable information.
	 */
	_parseVars(defs: any): void {
		this.vars     = {};
		this.tables   = {};
		this.modules  = {};

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
			for (i = 0; i < defs.stock.length; i++) {
				let xmile = defs.stock[i];
				let stock = new vars.Stock(this, xmile);
				this.vars[stock.name] = stock;
			}
		}

		if (defs.aux) {
			for (i = 0; i < defs.aux.length; i++) {
				let xmile = defs.aux[i];
				let aux = null;
				if (xmile.gf) {
					aux = new vars.Table(this, xmile);
					if (aux.ok) {
						this.tables[aux.name] = aux;
					} else {
						aux = null;
					}
				}
				if (!aux)
					aux = new vars.Variable(this, xmile);
				this.vars[aux.name] = aux;
			}
		}

		if (defs.flow) {
			for (i = 0; i < defs.flow.length; i++) {
				let xmile = defs.flow[i];
				let flow = null;
				if (xmile.gf) {
					flow = new vars.Table(this, xmile);
					if (flow.ok) {
						this.tables[flow.name] = flow;
					} else {
						flow = null;
					}
				}
				if (!flow)
					flow = new vars.Variable(this, xmile);
				this.vars[flow.name] = flow;
			}
		}
	}

	lookup(id: string): vars.Variable {
		if (id[0] === '.')
			id = id.substr(1);
		if (id in this.vars)
			return this.vars[id];
		let parts = id.split('.');
		let nextModel = this.project.models[this.modules[parts[0]].modelName];
		return nextModel.lookup(parts.slice(1).join('.'));
	}

	sim(isStandalone: boolean): sim.Sim {
		if (this.name === 'main') {
			return new sim.Sim(this.project.main, isStandalone);
		} else {
			return new sim.Sim(new vars.Module(this.project, null, 'main', this.name), isStandalone);
		}
	}

	drawing(svgElementID: string, overrideColors: boolean, enableMousewheel: boolean): draw.Drawing {
		return new draw.Drawing(
			this, this.xmile.views.view[0], svgElementID,
			overrideColors, enableMousewheel);
	}
}
