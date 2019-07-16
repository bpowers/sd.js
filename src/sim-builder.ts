// Copyright 2015 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

'use strict';

import { List, Map, Set } from 'immutable';

import * as Mustache from 'mustache';

import { defined } from './common';

import * as runtime from './runtime';
import * as util from './util';
import * as vars from './vars';


interface TableProps {
  x: List<number>;
  y: List<number>;
}
export type Table = Readonly<TableProps>;

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
    project: vars.Project,
    model: vars.Model,
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

class VarComparator implements util.Comparator<vars.Variable> {
  deps: Map<string, Set<string>> = Map();
  context: vars.Context;

  constructor(context: vars.Context) {
    this.context = context;
  }

  lessThan(a: vars.Variable, b: vars.Variable): boolean {
    const aName = defined(vars.ident(a));
    const bName = defined(vars.ident(b));
    if (!this.deps.has(aName)) {
      this.deps = this.deps.set(aName, vars.getDeps(this.context, a));
    }
    if (!this.deps.has(bName)) {
      this.deps = this.deps.set(bName, vars.getDeps(this.context, b));
    }
    return defined(this.deps.get(bName)).has(aName);
  }
}

export function buildSim(project: vars.Project, root: vars.Module, isStandalone: boolean): Worker | undefined {
  return new SimBuilder(project, root, isStandalone).worker;
}

export class SimBuilder {
  root: vars.Module;
  project: vars.Project;
  // variable offset sequence.  Time is always offset 0 for the main model
  idSeq: Map<string, number> = Map();

  worker: Worker | undefined;

  constructor(project: vars.Project, root: vars.Module, isStandalone: boolean) {
    this.root = root;
    this.project = project;

    // We start with a project (our context), and a module.  Next
    // we find all of the models (like the main model, stdlib
    // functions, and any user-defined modules), compile them to
    // JS classes, template out the whole thing to a string, and
    // either write it to stdout or a Worker.

    const models = vars.referencedModels(project, root);

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
      for (const [name, model, inputs] of modelDef.monomorphizations()) {
        // console.log(`MM: ${name}`);
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
  }

  compileModel(
    project: vars.Project,
    model: vars.Model,
    modules: Set<vars.Module>,
  ): TemplateContext {
    const runInitials: vars.Variable[] = [];
    const runFlows: vars.Variable[] = [];
    const runStocks: vars.Variable[] = [];

    const initialsIncludes = (ident: string): boolean => {
      return runInitials.some((v: vars.Variable) => vars.ident(v) === ident);
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

    const initialContext = new vars.Context(project, model, true);
    const flowContext = new vars.Context(project, model, false);

    // decide which run lists each variable has to be, based on
    // its type and const-ness
    for (const [n, v] of model.vars) {
      if (v instanceof vars.Module) {
        runInitials.push(v);
        runFlows.push(v);
        runStocks.push(v);
      } else if (v instanceof vars.Stock) {
        // add any referenced vars to initials
        for (const d of vars.getDeps(initialContext, v)) {
          if (d === 'time' || initialsIncludes(d)) {
            continue;
          }
          const dependentVar = initialContext.lookup(d);
          if (dependentVar) {
            runInitials.push(dependentVar);
          }
        }
        runInitials.push(v);
        runStocks.push(v);
      } else if (v instanceof vars.Table) {
        runFlows.push(v);
      } else if (vars.isConst(v)) {
        runInitials.push(v);
        runStocks.push(v);
      } else {
        runFlows.push(v);
      }

      if (!(v instanceof vars.Module)) {
        const off = this.nextID(model.ident);
        runtimeOffsets = runtimeOffsets.set(n, off);
        offsets = offsets.set(n, off);
      }
    }

    // stocks don't have to be sorted, since they can only depend
    // on values calculated in the flows phase.
    util.sort(runInitials, new VarComparator(initialContext));
    util.sort(runFlows, new VarComparator(flowContext));

    const initials: { [name: string]: number } = {};
    const tables: { [name: string]: Table } = {};

    const ci: string[] = [];
    const cf: string[] = [];
    const cs: string[] = [];
    // FIXME(bp) some auxiliaries are referred to in stock intial
    // equations, they need to be promoted into initials.
    for (const v of runInitials) {
      let eqn: string;
      const ident = defined(vars.ident(v));
      if (v instanceof vars.Module) {
        eqn = `this.modules["${ident}"].calcInitial(dt, curr);`;
      } else {
        if (vars.isConst(v)) {
          initials[ident] = parseFloat(defined(defined(v.xmile).eqn));
        }
        const off = defined(offsets.get(ident));
        const value = vars.initialEquation(model, offsets, v);
        eqn = `curr[${off}] = ${value};`;

        if (isRef(ident)) {
          eqn = `    if ('${ident}' in this.ref) {
      curr[${off}] = globalCurr[this.ref['${ident}']];
    } else {
      ${eqn}
    }`;
        }
      }
      ci.push(eqn);
    }
    for (const v of runFlows) {
      const ident = defined(vars.ident(v));
      if (v instanceof vars.Module) {
        cf.push(`this.modules["${ident}"].calcFlows(dt, curr);`);
      } else {
        let off = defined(offsets.get(ident));
        let eqn = `curr[${off}] = ${vars.code(model, offsets, v)};`;

        if (isRef(ident)) {
          eqn = `    if ('${ident}' in this.ref) {
      curr[${off}] = globalCurr[this.ref['${ident}']];
    } else {
      ${eqn}
    }`;
        }
        cf.push(eqn);
      }
    }
    for (const v of runStocks) {
      const ident = defined(vars.ident(v));
      if (v instanceof vars.Module) {
        cs.push(`this.modules['${ident}'].calcStocks(dt, curr, next);`);
      } else {
        const off = defined(offsets.get(ident));
        const value = v instanceof vars.Stock ? vars.code(model, offsets, v) : `curr[${off}]`;
        let eqn = `next[${off}] = ${value};`;
        if (isRef(ident)) {
          eqn = `    if ('${ident}' in this.ref) {
      next[${off}] = globalCurr[this.ref['${ident}']];
    } else {
      ${eqn}
    }`;
        }
        cs.push(eqn);
      }
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

    for (const [k, table] of model.tables) {
      // this is something that is going to be templated out; thats
      // why it isn't an immutable type.
      tables[k] = {
        x: table.x,
        y: table.y,
      };
    }

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
}
