// Copyright 2015 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

'use strict';

import { Map, Set } from 'immutable';

import * as Mustache from 'mustache';

import { defined } from './common';

import * as runtime from './runtime';
import * as type from './type';
import * as util from './util';
import * as vars from './vars';

// whether we map names -> offsets in a Float64Array, or use names
// as object property lookups.  With DEBUG = true, equations are
// easier to debug but run slower.
const DEBUG = true;

const SP = DEBUG ? '  ' : '';
const NLSP = DEBUG ? '\n  ' : '';

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
const mainRefs = {
  {{#mainRefs}}
  '{{&name}}': '{{&ptr}}',
  {{/mainRefs}}
};
const main = new {{&mainClassName}}('main', undefined, 0, mainRefs);

main.resolveAllSymbolicRefs();
main.reset();

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

  constructor(
    project: type.Project,
    model: type.Model,
    mods: any,
    init: any,
    initials: any,
    tables: any,
    runtimeOffsets: Map<string, number>,
    ci: any,
    cf: any,
    cs: any,
  ) {
    this.name = model.ident;
    this.className = util.titleCase(model.ident);
    this.isModule = model.ident !== 'main';
    this.modules = mods.join(NLSP);
    this.init = init.join(NLSP);
    this.initialVals = JSON.stringify(initials, null, SP);
    this.simSpecVals = JSON.stringify(defined(model.simSpec || project.simSpec).toJS(), null, SP);
    this.tableVals = JSON.stringify(tables, null, SP);
    this.calcI = ci.join(NLSP);
    this.calcF = cf.join(NLSP);
    this.calcS = cs.join(NLSP);
    this.offsets = JSON.stringify(runtimeOffsets, null, SP);
  }
}

class VarComparator implements util.Comparator<type.Variable> {
  deps: Map<string, Set<string>> = Map();
  context: type.Context;

  constructor(project: type.Project, parent: type.Model) {
    this.context = new type.Context(project, parent);
  }

  lessThan(a: type.Variable, b: type.Variable): boolean {
    const aName = defined(a.ident);
    const bName = defined(b.ident);
    if (!this.deps.has(aName)) {
      this.deps = this.deps.set(aName, a.getDeps(this.context));
    }
    if (!this.deps.has(bName)) {
      this.deps = this.deps.set(bName, b.getDeps(this.context));
    }
    return defined(this.deps.get(bName)).has(aName);
  }
}

export class Sim {
  root: type.Module;
  project: type.Project;
  seq: number = 1; // unique message ids
  // callback storage, keyed by message id
  promised: Map<number, (result: any, err: any) => void> = Map();
  // variable offset sequence.  Time is always offset 0 for the main model
  idSeq: Map<string, number> = Map();
  worker?: Worker;

  constructor(project: type.Project, root: type.Module, isStandalone: boolean) {
    this.root = root;
    this.project = project;

    // We start with a project (our context), and a module.  Next
    // we find all of the models (like the main model, stdlib
    // functions, and any user-defined modules), compile them to
    // JS classes, template out the whole thing to a string, and
    // either write it to stdout or a Worker.

    const models = root.referencedModels(project);

    const compiledModels: TemplateContext[] = [];
    for (const [n, modelDef] of models) {
      if (n === 'main') {
        this.idSeq = this.idSeq.set(n, 1); // add 1 for time
      } else {
        this.idSeq = this.idSeq.set(n, 0);
      }
      if (!modelDef.model) {
        throw new Error('expected a model');
      }
      compiledModels.push(this.compileModel(project, modelDef.model, modelDef.modules));
    }

    const mainRefs = root.refs;
    console.log('// mainRefs: ' + JSON.stringify(root.refs));

    {
      const source = Mustache.render(tmpl, {
        preamble: runtime.preamble,
        epilogue: isStandalone ? runtime.epilogue : 'onmessage = handleMessage;',
        mainClassName: util.titleCase(root.modelName),
        models: compiledModels,
        mainRefs,
      });
      if (isStandalone) {
        console.log(source);
        return;
      }
      const blob = new Blob([source], { type: 'text/javascript' });
      this.worker = new Worker(window.URL.createObjectURL(blob));
    }
    this.worker.addEventListener(
      'message',
      (e: MessageEvent): void => {
        const id: number = e.data[0];
        const result = e.data[1];
        const cb = this.promised.get(id);
        this.promised = this.promised.delete(id);
        if (cb) {
          cb(result[0], result[1]);
        }
      },
    );
  }

  compileModel(
    project: type.Project,
    model: type.Model,
    modules: Set<type.Module>,
  ): TemplateContext {
    const runInitials: type.Variable[] = [];
    const runFlows: type.Variable[] = [];
    const runStocks: type.Variable[] = [];

    const initialsIncludes = (ident: string): boolean => {
      return runInitials.some((v: type.Variable) => v.ident === ident);
    };

    const isRef = (n: string): boolean => {
      for (const module of modules) {
        if (module.refs.has(n)) {
          return true;
        }
      }
      return false;
    };

    let offsets: Map<string, number> = Map();
    let runtimeOffsets: Map<string, number> = Map();

    const context = new type.Context(project, model);

    // decide which run lists each variable has to be, based on
    // its type and const-ness
    for (const [n, v] of model.vars) {
      if (v instanceof vars.Module) {
        runInitials.push(v);
        runFlows.push(v);
        runStocks.push(v);
      } else if (v instanceof vars.Stock) {
        // add any referenced vars to initials
        for (const d of v.getDeps(context)) {
          if (d === 'time' || initialsIncludes(d)) {
            continue;
          }
          const dependentVar = context.lookup(d);
          if (dependentVar) {
            runInitials.push(dependentVar);
          }
        }
        runInitials.push(v);
        runStocks.push(v);
      } else if (v instanceof vars.Table) {
        runFlows.push(v);
      } else if (v.isConst()) {
        runInitials.push(v);
        runStocks.push(v);
      } else {
        runFlows.push(v);
      }

      if (!(v instanceof vars.Module) && !isRef(n)) {
        const off = this.nextID(model.ident);
        runtimeOffsets = runtimeOffsets.set(n, off);
        if (DEBUG) {
          offsets = offsets.set(n, off); // `${off}/*${n}*/`;
        } else {
          offsets = offsets.set(n, off);
        }
      }
    }

    // stocks don't have to be sorted, since they can only depend
    // on values calculated in the flows phase.
    util.sort(runInitials, new VarComparator(this.project, model));
    util.sort(runFlows, new VarComparator(this.project, model));

    const initials: { [name: string]: number } = {};
    const tables: { [name: string]: type.Table } = {};

    const ci: string[] = [];
    const cf: string[] = [];
    const cs: string[] = [];
    // FIXME(bp) some auxiliaries are referred to in stock intial
    // equations, they need to be promoted into initials.
    for (const v of runInitials) {
      let eqn: string;
      const ident = defined(v.ident);
      if (v instanceof vars.Module) {
        eqn = `this.modules["${ident}"].calcInitial(dt, curr);`;
      } else {
        if (isRef(ident)) {
          continue;
        }
        if (v.isConst()) {
          initials[ident] = parseFloat(defined(v.eqn));
        }
        const off = defined(offsets.get(ident));
        const value = v.initialEquation(model, offsets);
        eqn = `curr[${off}] = ${value};`;
      }
      ci.push(eqn);
    }
    for (const v of runFlows) {
      const ident = defined(v.ident);
      if (v instanceof vars.Module) {
        cf.push(`this.modules["${ident}"].calcFlows(dt, curr);`);
      } else if (!isRef(ident)) {
        cf.push(`curr[${defined(offsets.get(ident))}] = ${v.code(model, offsets)};`);
      }
    }
    for (const v of runStocks) {
      const ident = defined(v.ident);
      // if a variable is a reference in this monomorphization of a
      // model, no need to calculate + store a value
      if (isRef(ident)) {
        continue;
      }
      if (v instanceof vars.Module) {
        cs.push(`this.modules['${ident}'].calcStocks(dt, curr, next);`);
      } else {
        const off = defined(offsets.get(ident));
        const value = v instanceof vars.Stock ? v.code(model, offsets) : `curr[${off}]`;
        cs.push(`next[${off}] = ${value};`);
      }
    }
    for (const [n, table] of model.tables) {
      tables[n] = {
        x: table.x,
        y: table.y,
      };
    }

    const init: string[] = [];
    if (model.modules.size > 0) {
      // +1 for implicit time
      const additional = model.ident === 'main' ? ' + 1' : '';
      init.push(`let off = Object.keys(this.offsets).length${additional};`);
    }
    const mods: string[] = [];
    mods.push('{');
    for (const [n, module] of model.modules) {
      init.push(`const ${n}Refs = {`);
      for (const [refName, ref] of module.refs) {
        init.push(`    "${refName}": "${ref.ptr}",`);
      }
      init.push('};');
      const modelName = util.titleCase(module.modelName);
      init.push(`const ${n} = new ${modelName}("${n}", this, off, ${n}Refs);`);
      init.push(`off += ${n}.nVars;`);
      mods.push(`    "${n}": ${n},`);
    }
    mods.push('}');

    return new TemplateContext(
      project,
      model,
      mods,
      init,
      initials,
      tables,
      runtimeOffsets,
      ci,
      cf,
      cs,
    );
  }

  nextID(modelName: string): number {
    const id = defined(this.idSeq.get(modelName));
    this.idSeq = this.idSeq.set(modelName, id + 1);
    return id;
  }

  // FIXME: any?
  private post(...args: any[]): Promise<any> {
    const id = this.seq++;

    return new Promise<any>((resolve, reject) => {
      if (!this.worker) {
        return;
      }
      this.promised.set(id, (result: any, err: any) => {
        if (err !== undefined && err !== null) {
          reject(err);
        } else {
          resolve(result);
        }
      });
      this.worker.postMessage([id].concat(args));
    });
  }

  close(): void {
    if (!this.worker) {
      return;
    }
    this.worker.terminate();
    this.worker = undefined;
  }

  reset(): Promise<any> {
    return this.post('reset');
  }

  setValue(name: string, val: number): Promise<any> {
    return this.post('set_val', name, val);
  }

  value(...names: string[]): Promise<any> {
    const args = ['get_val'].concat(names);
    return this.post.apply(this, args);
  }

  series(...names: string[]): Promise<any> {
    const args = ['get_series'].concat(names);
    return this.post.apply(this, args);
  }

  dominance(overrides: { [n: string]: number }, indicators: string[]): Promise<any> {
    return this.post('dominance', overrides, indicators);
  }

  runTo(time: number): Promise<any> {
    return this.post('run_to', time);
  }

  runToEnd(): Promise<any> {
    return this.post('run_to_end');
  }

  setDesiredSeries(names: string[]): Promise<any> {
    return this.post('set_desired_series', names);
  }

  varNames(includeHidden = false): Promise<any> {
    return this.post('var_names', includeHidden);
  }

  async csv(delim: string = ','): Promise<string> {
    const names: string[] = await this.varNames();
    const data: { [name: string]: type.Series } = await this.series(...names);
    return Sim.csvFromData(data, names, delim);
  }

  private static csvFromData(
    data: { [name: string]: type.Series },
    vars: string[],
    delim: string,
  ): string {
    let file = '';
    const series: { [name: string]: type.Series } = {};
    let time: type.Series | undefined;
    let header = 'time' + delim;

    // create the CSV header
    for (const v of vars) {
      if (v === 'time') {
        time = data[v];
        continue;
      }
      header += v + delim;
      series[v] = data[v];
    }

    if (time === undefined) {
      throw new Error('no time?');
    }

    file += header.substr(0, header.length - 1);
    file += '\n';

    // now go timestep-by-timestep to generate each line
    const nSteps = time.values.length;
    for (let i = 0; i < nSteps; i++) {
      let msg = '';
      for (const v in series) {
        if (!series.hasOwnProperty(v)) {
          continue;
        }
        if (msg === '') {
          msg += series[v].time[i] + delim;
        }
        msg += series[v].values[i] + delim;
      }
      file += msg.substr(0, msg.length - 1);
      file += '\n';
    }

    return file;
  }
}
