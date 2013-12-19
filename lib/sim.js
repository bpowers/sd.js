// Copyright 2013 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

// XXX: this sim module can't depend on the model module, as model
// imports sim, and we don't want circular dependencies.
define(['./util', './vars', './runtime'], function(util, vars, runtime) {
    'use strict';

    // whether we map names -> offsets in a Float64Array, or use names
    // as object property lookups.  With DEBUG = true, equations are
    // easier to debug but run slower.
    var DEBUG = true;

    var SP = DEBUG ? '    ' : '';
    var NLSP = DEBUG ? '\n    ' : '';

    var TIME_OFFSET = 0;

    var tmpl = "{{&preamble}}\n\n" +
        "var TIME = 0;\n\n" +
        "{{#models}}\n" +
        "var {{&className}} = function {{&className}}(name, parent, offset, symRefs) {\n" +
        "    this.name = name;\n" +
        "    this.parent = parent;\n" +
        // if we are a module, record the offset in the curr & next
        // arrays we should be writing at
        "    this._shift = i32(offset);\n" +
        "    {{&init}}\n" +
        "    this.modules = {{&modules}};\n" +
        // symbolic references, which will get resolved into integer
        // offsets in the ref map after all Simulation objects have
        // been initialized.
        "    this.symRefs = symRefs || {};\n" +
        "    this.ref = {};\n" +
        "    this.nVars = this.getNVars();\n" +
        "    if (name === 'main')\n" +
        "        this.reset();\n" +
        "};\n" +
        "{{&className}}.prototype = new Simulation();\n" +
        "{{&className}}.prototype.initials = {{&initialVals}};\n" +
        "{{&className}}.prototype.timespec = {{&timespecVals}};\n" +
        "{{&className}}.prototype.offsets = {{&offsets}};\n" +
        "{{&className}}.prototype.tables = {{&tableVals}};\n" +
        "{{&className}}.prototype.calcInitial = function(dt, curr) {\n" +
        "    dt = +dt;\n" +
        "{{#isModule?}}\n" +
        "    var globalCurr = curr;\n" +
        "    curr = curr.subarray(this._shift, this._shift + this.nVars);\n" +
        "{{/isModule?}}\n" +
        "    {{&calcI}}\n" +
        "};\n" +
        "{{&className}}.prototype.calcFlows = function(dt, curr) {\n" +
        "    dt = +dt;\n" +
        "{{#isModule?}}\n" +
        "    var globalCurr = curr;\n" +
        "    curr = curr.subarray(this._shift, this._shift + this.nVars);\n" +
        "{{/isModule?}}\n" +
        "    {{&calcF}}\n" +
        "};\n" +
        "{{&className}}.prototype.calcStocks = function(dt, curr, next) {\n" +
        "    dt = +dt;\n" +
        "{{#isModule?}}\n" +
        "    var globalCurr = curr;\n" +
        "    curr = curr.subarray(this._shift, this._shift + this.nVars);\n" +
        "    next = next.subarray(this._shift, this._shift + this.nVars);\n" +
        "{{/isModule?}}\n" +
        "    {{&calcS}}\n" +
        "};\n\n" +
        "{{/models}}\n" +
        "var main = new {{&mainClassName}}('main');\n" +
        "main.resolveAllSymbolicRefs();\n\n" +
        "var cmds = initCmds(main);\n\n" +
        "{{&epilogue}}\n";

    var Sim = function Sim(root, isStandalone) {
        this.project = root.project;
        this.seq = 1; // message id sequence
        this.promised = {}; //callback storage, keyed by message id
        this.idSeq = {}; // variable offset sequence.  Time is always offset 0

        var models = root.referencedModels();
        var compiledModels = [];
        var n;
        for (n in models) {
            if (n === 'main')
                this.idSeq[n] = 1; // add 1 for time
            else
                this.idSeq[n] = 0;
            compiledModels.push(this._process(models[n].model, models[n].modules));
        }

        var source = Mustache.render(tmpl, {
            'preamble': runtime.preamble,
            'epilogue': isStandalone ? runtime.epilogue : 'onmessage = handleMessage;',
            'mainClassName': util.titleCase(root.modelName),
            'models': compiledModels
        });
        if (isStandalone) {
            console.log(source);
            return;
        }
        var blob = new Blob([source], {type: 'text/javascript'});
        this.worker = new Worker(window.URL.createObjectURL(blob));
        blob = null;
        source = null;
        var _this = this;
        this.worker.addEventListener('message', function(e) {
            var id = e.data[0];
            var result = e.data[1];
            var deferred = _this.promised[id];
            delete _this.promised[id];
            if (deferred) {
                if (result[1])
                    deferred.reject(result[1]);
                else
                    deferred.resolve(result[0]);
            }
        });
    };
    Sim.prototype._process = function(model, modules) {
        var run_initials = [];
        var run_flows = [];
        var run_stocks = [];

        var isRef = function isRef(n) {
            var i;
            for (i = 0; i < modules.length; i++) {
                if (n in modules[i].refs)
                    return true;
            }
            return false;
        };

        var offsets = {};
        var runtimeOffsets = {};

        // decide which run lists each variable has to be, based on
        // its type and const-ness
        var v, off;
        for (n in model.vars) {
            v = model.vars[n];
            if (v instanceof vars.Module) {
                run_initials.push(v);
                run_flows.push(v);
                run_stocks.push(v);
            } else if (v instanceof vars.Stock) {
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
                off = this.nextID(model);
                runtimeOffsets[n] = off;
                if (DEBUG)
                    offsets[n] = off + '/*' + n + '*/';
                else
                    offsets[n] = off;
            }
        }

        // stocks don't have to be sorted, since they can only depend
        // on values calculated in the flows phase.
        util.sort(run_initials);
        util.sort(run_flows);

        var initials = {};
        var tables = {};

        var ci = [], cf = [], cs = [];
        var i, v, eqn;
        // FIXME(bp) some auxiliaries are referred to in stock intial
        // equations, they need to be promoted into initials.
        for (i = 0; i < run_initials.length; i++) {
            v = run_initials[i];
            if (v instanceof vars.Module) {
                eqn = 'this.modules["' + v.name + '"].calcInitial(dt, curr);';
            } else {
                if (isRef(v.name))
                    continue;
                if (v.isConst())
                    initials[v.name] = parseFloat(v.eqn);
                eqn = "curr[" + offsets[v.name] + "] = " + vars.Variable.prototype.code.apply(v, [offsets]) + ';';
            }
            ci.push(eqn);
        }
        for (i = 0; i < run_flows.length; i++) {
            v = run_flows[i];
            eqn = null;
            if (v instanceof vars.Module)
                eqn = 'this.modules["' + v.name + '"].calcFlows(dt, curr);';
            else if (!isRef(v.name))
                eqn = "curr[" + offsets[v.name] + "] = " + v.code(offsets) + ';';
            if (!eqn)
                continue;
            cf.push(eqn);
        }
        for (i = 0; i < run_stocks.length; i++) {
            v = run_stocks[i];
            if (v instanceof vars.Module)
                cs.push('this.modules["' + v.name + '"].calcStocks(dt, curr, next);');
            else if (!v.hasOwnProperty('initial'))
                cs.push("next[" + offsets[v.name] + "] = curr[" + offsets[v.name] + '];');
            else
                cs.push("next[" + offsets[v.name] + "] = " + v.code(offsets) + ';');
        }
        for (n in model.tables) {
            tables[n] = {
                'x': model.tables[n].x,
                'y': model.tables[n].y,
            };
        }
        var additional = '';
        var init = [];
        if (Object.keys(model.modules).length) {
            // +1 for implicit time
            if (model.name === 'main')
                additional = ' + 1';
            init.push('var off = Object.keys(this.offsets).length' + additional + ';');
        }
        var modules = ['{'];
        var ref;
        for (n in model.modules) {
            init.push('var ' + n + 'Refs = {');
            for (ref in model.modules[n].refs)
                init.push('    "' + ref + '": "' + model.modules[n].refs[ref].ptr + '",');
            init.push('};');
            init.push('var ' + n + ' = new ' + util.titleCase(model.modules[n].modelName) + '("' + n + '", this, off, ' + n + 'Refs);');
            init.push('off += ' + n + '.nVars;');
            modules.push('    "' + n + '": ' + n + ',');
        }
        modules.push('}');

        return {
            'name': model.name,
            'className': util.titleCase(model.name),
            'isModule?': model.name !== 'main',
            'modules': modules.join(NLSP),
            'init': init.join(NLSP),
            'initialVals': JSON.stringify(initials, null, SP),
            'timespecVals': JSON.stringify(model.timespec, null, SP),
            'tableVals': JSON.stringify(tables, null, SP),
            'calcI': ci.join(NLSP),
            'calcF': cf.join(NLSP),
            'calcS': cs.join(NLSP),
            'offsets': JSON.stringify(runtimeOffsets, null, SP),
        };
    };
    Sim.prototype.nextID = function(model) {
        return this.idSeq[model.name]++;
    };
    Sim.prototype._post = function() {
        var id = this.seq++;
        var args = [id];
        var i;
        for (i = 0; i < arguments.length; i++)
            args.push(arguments[i]);

        var deferred = Q.defer();
        this.promised[id] = deferred;
        this.worker.postMessage(args);
        return deferred.promise;
    };
    Sim.prototype.close = function() {
        this.worker.terminate();
        this.worker = null;
    };
    Sim.prototype.reset = function() {
        return this._post('reset');
    };
    Sim.prototype.setValue = function(name, val) {
        return this._post('set_val', name, val);
    };
    Sim.prototype.value = function() {
        var args = ['get_val'].concat(Array.prototype.slice.call(arguments));
        return this._post.apply(this, args);
    };
    Sim.prototype.series = function() {
        var args = ['get_series'].concat(Array.prototype.slice.call(arguments));
        return this._post.apply(this, args);
    };
    Sim.prototype.runTo = function(time) {
        return this._post('run_to', time);
    };
    Sim.prototype.runToEnd = function() {
        return this._post('run_to_end');
    };
    Sim.prototype.setDesiredSeries = function(names) {
        return this._post('set_desired_series', names);
    };

    return {
        'Sim': Sim,
    };
});
