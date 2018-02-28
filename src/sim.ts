// Copyright 2015 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

'use strict';

import * as util from './util';
import * as type from './type';
import * as vars from './vars';
import * as runtime from './runtime';

import * as Mustache from 'mustache';

import {exists} from './util';

// whether we map names -> offsets in a Float64Array, or use names
// as object property lookups.  With DEBUG = true, equations are
// easier to debug but run slower.
let DEBUG = true;

const SP = DEBUG ? '\t' : '';
const NLSP = DEBUG ? '\n\t' : '';

const tmpl = `{{&preamble}}

{{#models}}
class {{&className}} extends Simulation {
	constructor(name, parent, offset, symRefs) {
		super();

		this.initials = {{&initialVals}};
		this.simSpec = {{&simSpecVals}};
		this.offsets = {{&offsets}};
		this.tables = {{&tableVals}};

		this.name = name;
		this.parent = parent;
		// if we are a module, record the offset in the curr &
		// next arrays we should be writing at
		this._shift = i32(offset);
		{{&init}}
		this.modules = {{&modules}};
		// symbolic references, which will get resolved into
		// integer offsets in the ref map after all Simulation
		// objects have been initialized.
		this.symRefs = symRefs || {};
		this.ref = {};
		this.nVars = this.getNVars();
		// who even knows what this does.
		if (name === 'main')
			this.reset();
	}
	calcInitial(dt, curr) {
		dt = +dt;
		let globalCurr = curr;
		{{#isModule}}
		curr = curr.subarray(this._shift, this._shift + this.nVars);
		{{/isModule}}
		{{&calcI}}
	}
	calcFlows(dt, curr) {
		dt = +dt;
		let globalCurr = curr;
		{{#isModule}}
		curr = curr.subarray(this._shift, this._shift + this.nVars);
		{{/isModule}}
		{{&calcF}}
	}
	calcStocks(dt, curr, next) {
		dt = +dt;
		let globalCurr = curr;
		{{#isModule}}
		curr = curr.subarray(this._shift, this._shift + this.nVars);
		next = next.subarray(this._shift, this._shift + this.nVars);
		{{/isModule}}
		{{&calcS}}
	}
};


{{/models}}
var mainRefs = {
	{{#mainRefs}}
	'{{&name}}': '{{&ptr}}',
	{{/mainRefs}}
};
var main = new {{&mainClassName}}('main', undefined, 0, mainRefs);

main.resolveAllSymbolicRefs();

cmds = initCmds(main);

{{&epilogue}}`;

export class TemplateContext {
	name: string;
	className: string;
	isModule: boolean;
	modules: string;
	init: string;
	initialVals: string;
	simSpecVals: string;
	tableVals: string;
	calcI: string;
	calcF: string;
	calcS: string;
	offsets: string;

	constructor(model: type.Model, mods: any, init: any, initials: any, tables: any, runtimeOffsets: any, ci: any, cf: any, cs: any) {
		this.name = model.name;
		this.className = util.titleCase(model.name);
		this.isModule = model.name !== 'main';
		this.modules = mods.join(NLSP);
		this.init = init.join(NLSP);
		this.initialVals = JSON.stringify(initials, null, SP);
		this.simSpecVals = JSON.stringify(model.simSpec, null, SP);
		this.tableVals = JSON.stringify(tables, null, SP);
		this.calcI = ci.join(NLSP);
		this.calcF = cf.join(NLSP);
		this.calcS = cs.join(NLSP);
		this.offsets = JSON.stringify(runtimeOffsets, null, SP);
	}
}

export class Sim {
	root: type.Module;
	project: type.Project;
	seq: number;
	promised: any;
	idSeq: any;
	worker: Worker;

	constructor(root: type.Module, isStandalone: boolean) {
		this.root = root;
		this.project = root.project;
		this.seq = 1; // message id sequence
		this.promised = {}; // callback storage, keyed by message id
		this.idSeq = {}; // variable offset sequence.  Time is always offset 0

		let models = root.referencedModels();
		let compiledModels: TemplateContext[] = [];
		for (let n in models) {
			if (!models.hasOwnProperty(n))
				continue;

			if (n === 'main') {
				this.idSeq[n] = 1; // add 1 for time
			} else {
				this.idSeq[n] = 0;
			}
			compiledModels.push(this._process(models[n].model, models[n].modules));
		}

		let mainRefs: any[] = [];
		for (let ref in root.refs) {
			mainRefs.push({
				'name': ref,
				'ptr': root.refs[ref].ptr,
			});
		}
		console.log('// mainRefs: ' + JSON.stringify(root.refs));

		let source = Mustache.render(tmpl, {
			'preamble': runtime.preamble,
			'epilogue': isStandalone ? runtime.epilogue : 'onmessage = handleMessage;',
			'mainClassName': util.titleCase(root.modelName),
			'models': compiledModels,
			'mainRefs': mainRefs,
		});
		if (isStandalone) {
			console.log(source);
			return;
		}
		let blob = new Blob([source], {type: 'text/javascript'});
		this.worker = new Worker(window.URL.createObjectURL(blob));
		blob = null;
		source = null;
		// FIXME: find any
		this.worker.addEventListener('message', (e: any): void => {
			let id = e.data[0];
			let result = e.data[1];
			let cb = this.promised[id];
			delete this.promised[id];
			if (cb)
				cb(result[0], result[1]);
		});
	}

	_process(model: type.Model, modules: type.Module[]): TemplateContext {
		let run_initials: type.Variable[] = [];
		let run_flows: type.Variable[] = [];
		let run_stocks: type.Variable[] = [];

		let initialsIncludes = (ident: string): boolean => {
			return run_initials.some((v: type.Variable) => v.ident === ident);
		}

		let isRef = (n: string): boolean => {
			for (let i = 0; i < modules.length; i++) {
				if (n in modules[i].refs)
					return true;
			}
			return false;
		};

		let offsets: type.Offsets = {};
		let runtimeOffsets: type.Offsets = {};

		// decide which run lists each variable has to be, based on
		// its type and const-ness
		for (let n in model.vars) {
			if (!model.vars.hasOwnProperty(n))
				continue;

			let v = model.vars[n];
			if (v instanceof vars.Module) {
				run_initials.push(v);
				run_flows.push(v);
				run_stocks.push(v);
			} else if (v instanceof vars.Stock) {
				// add any referenced vars to initials
				for (let d in v.getDeps()) {
					if (d === 'time' || initialsIncludes(d))
						continue;
					run_initials.push(model.lookup(d));
				}
				run_initials.push(v);
				run_stocks.push(v);
			} else if (v instanceof vars.Table) {
				run_flows.push(v);
			} else if (v.isConst()) {
				run_initials.push(v);
				run_stocks.push(v);
			} else {
				run_flows.push(v);
			}

			if (!(v instanceof vars.Module) && !isRef(n)) {
				let off = this.nextID(model.name);
				runtimeOffsets[n] = off;
				if (DEBUG) {
					offsets[n] = off + '/*' + n + '*/';
				} else {
					offsets[n] = off;
				}
			}
		}

		// stocks don't have to be sorted, since they can only depend
		// on values calculated in the flows phase.
		util.sort(run_initials);
		util.sort(run_flows);

		let initials: {[name: string]: number} = {};
		let tables: {[name: string]: type.Table} = {};

		let ci: string[] = [], cf: string[] = [], cs: string[] = [];
		// FIXME(bp) some auxiliaries are referred to in stock intial
		// equations, they need to be promoted into initials.
		for (let i = 0; i < run_initials.length; i++) {
			let eqn: string;
			let v = run_initials[i];
			if (v instanceof vars.Module) {
				eqn = 'this.modules["' + v.ident + '"].calcInitial(dt, curr);';
			} else {
				if (isRef(v.ident))
					continue;
				if (v.isConst())
					initials[v.ident] = parseFloat(v.eqn);
				eqn = "curr[" + offsets[v.ident] + "] = " + vars.Variable.prototype.code.apply(v, [offsets]) + ';';
			}
			ci.push(eqn);
		}
		for (let i = 0; i < run_flows.length; i++) {
			let eqn: string;
			let v = run_flows[i];
			eqn = null;
			if (v instanceof vars.Module) {
				eqn = 'this.modules["' + v.ident + '"].calcFlows(dt, curr);';
			} else if (!isRef(v.ident)) {
				eqn = "curr[" + offsets[v.ident] + "] = " + v.code(offsets) + ';';
			}
			if (!eqn)
				continue;
			cf.push(eqn);
		}
		for (let i = 0; i < run_stocks.length; i++) {
			let eqn: string;
			let v = run_stocks[i];
			if (v instanceof vars.Module) {
				cs.push('this.modules["' + v.ident + '"].calcStocks(dt, curr, next);');
			} else if (!v.hasOwnProperty('initial')) {
				cs.push("next[" + offsets[v.ident] + "] = curr[" + offsets[v.ident] + '];');
			} else {
				cs.push("next[" + offsets[v.ident] + "] = " + v.code(offsets) + ';');
			}
		}
		for (let n in model.tables) {
			if (!model.tables.hasOwnProperty(n))
				continue;

			tables[n] = {
				'x': model.tables[n].x,
				'y': model.tables[n].y,
			};
		}
		let additional = '';
		let init: string[] = [];
		if (Object.keys(model.modules).length) {
			// +1 for implicit time
			if (model.ident === 'main')
				additional = ' + 1';
			init.push('var off = Object.keys(this.offsets).length' + additional + ';');
		}
		let mods: string[] = [];
		mods.push('{');
		for (let n in model.modules) {
			if (!model.modules.hasOwnProperty(n))
				continue;
			init.push('var ' + n + 'Refs = {');
			for (let ref in model.modules[n].refs) {
				if (!model.modules[n].refs.hasOwnProperty(ref))
					continue;

				init.push('    "' + ref + '": "' + model.modules[n].refs[ref].ptr + '",');
			}
			init.push('};');
			init.push('var ' + n + ' = new ' + util.titleCase(model.modules[n].modelName) + '("' + n + '", this, off, ' + n + 'Refs);');
			init.push('off += ' + n + '.nVars;');
			mods.push('    "' + n + '": ' + n + ',');
		}
		mods.push('}');

		return new TemplateContext(model, mods, init, initials, tables, runtimeOffsets, ci, cf, cs);
	}

	nextID(modelName: string): number {
		return this.idSeq[modelName]++;
	}

	// FIXME: any?
	_post(...args: any[]): Promise<any> {
		let id = this.seq++;

		return new Promise<any>((resolve, reject) => {
			this.promised[id] = (result: any, err: any) => {
				if (err !== undefined && err !== null)
					reject(err);
				else
					resolve(result);
			};
			this.worker.postMessage([id].concat(args));
		});
	}

	close(): void {
		this.worker.terminate();
		this.worker = null;
	}

	reset(): Promise<any> {
		return this._post('reset');
	}

	setValue(name: string, val: number): Promise<any> {
		return this._post('set_val', name, val);
	}

	value(...names: string[]): Promise<any> {
		let args = ['get_val'].concat(names);
		return this._post.apply(this, args);
	}

	series(...names: string[]): Promise<any> {
		let args = ['get_series'].concat(names);
		return this._post.apply(this, args);
	}

	dominance(overrides: {[n: string]: number}, indicators: string[]): Promise<any> {
		return this._post('dominance', overrides, indicators);
	}

	runTo(time: number): Promise<any> {
		return this._post('run_to', time);
	}

	runToEnd(): Promise<any> {
		return this._post('run_to_end');
	}

	setDesiredSeries(names: string[]): Promise<any> {
		return this._post('set_desired_series', names);
	}

	varNames(includeHidden = false): Promise<any> {
		return this._post('var_names', includeHidden);
	}

	csv(delim: string = ','): Promise<string> {
		return new Promise((resolve, reject) => {
			let vars: string[] | null = null;
			this.varNames()
				.then((names: string[]) => {
					// save so that we have a stable/sorted
					// iteration order
					vars = names;
					return this.series(...names);
				})
				.then((data: {[name: string]: type.Series}) => {
					resolve(this.csvFromData(data, exists(vars), delim));
				});
		});
	}

	private csvFromData(data: {[name: string]: type.Series}, vars: string[], delim: string): string {
		let file = '';
		let series: {[name: string]: type.Series} = {};
		let time: type.Series;
		let header = 'time' + delim;

		// create the CSV header
		for (let i = 0; i < vars.length; i++) {
			let v = vars[i];
			if (v === 'time') {
				time = data[v];
				continue;
			}
			header += v + delim;
			series[v] = data[v];
		}

		file += header.substr(0, header.length-1);
		file += '\n';

		// now go timestep-by-timestep to generate each line
		let nSteps = time.values.length;
		for (let i = 0; i < nSteps; i++) {
			let msg = '';
			for (let v in series) {
				if (!series.hasOwnProperty(v))
					continue;
				if (msg === '')
					msg += series[v].time[i] + delim;
				msg += series[v].values[i] + delim;
			}
			file += msg.substr(0, msg.length-1);
			file += '\n';
		}

		return file;
	}
}
