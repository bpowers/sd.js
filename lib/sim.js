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

    var TIME_OFFSET = 0;

    var tmpl = "{{&preamble}}\n\n" +
        "var TIME = 0;\n\n" +
        "{{#models}}\n" +
        "var {{&className}} = function {{&className}}(name, parent, offset) {\n" +
        "    var off = Object.keys(this.offsets).length;\n" +
        "    {{&init}}\n" +
        "    this.modules = {{&modules}};\n" +
        "    this.init(name, parent, offset);\n" +
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
        "    curr = curr.subarray(this._off, this.nVars);\n" +
        "{{/isModule?}}\n" +
        "    {{&calcI}}\n" +
        "};\n" +
        "{{&className}}.prototype.calcFlows = function(dt, curr) {\n" +
        "    dt = +dt;\n" +
        "{{#isModule?}}\n" +
        "    var globalCurr = curr;\n" +
        "    curr = curr.subarray(this._off, this.nVars);\n" +
        "{{/isModule?}}\n" +
        "    {{&calcF}}\n" +
        "};\n" +
        "{{&className}}.prototype.calcStocks = function(dt, curr, next) {\n" +
        "    dt = +dt;\n" +
        "{{#isModule?}}\n" +
        "    var globalCurr = curr;\n" +
        "    curr = curr.subarray(this._off, this.nVars);\n" +
        "{{/isModule?}}\n" +
        "    {{&calcS}}\n" +
        "};\n\n" +
        "{{/models}}\n" +
        "var main = new {{&mainClassName}}('main');\n\n" +
        "var cmds = initCmds(main);\n\n" +
        "{{&epilogue}}\n";

    var Sim = function Sim(root, isStandalone) {
        this.project = root.project;
        this.seq = 1; // message id sequence
        this.promised = {}; //callback storage, keyed by message id
        this.idSeq = TIME_OFFSET + 1; // variable offset sequence.  Time is always offset 0

        var models = root.referencedModels();
        var compiledModels = [];
        var n;
        for (n in models)
            compiledModels.push(this._process(models[n].model, models[n].modules));

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
        var initials = {};
        var tables = {};

        var offsets = {};
        var runtimeOffsets = {};
        var n, off;
        for (n in model.vars) {
            if (model.vars[n] instanceof vars.Module)
                continue;
            off = this.nextID();
            runtimeOffsets[n] = off;
            if (DEBUG)
                offsets[n] = off + '/*' + n + '*/';
            else
                offsets[n] = off;
        }
        var ci = [], cf = [], cs = [];
        var i, v, eqn;
        // FIXME(bp) some auxiliaries are referred to in stock intial
        // equations, they need to be promoted into initials.
        for (i = 0; i < model.initials.length; i++) {
            v = model.initials[i];
            n = util.eName(v.name);
            if (v instanceof vars.Module) {
                eqn = 'this.modules["' + v.name + '"].calcInitial(dt, curr);';
            } else {
                if (v.isConst())
                    initials[n] = parseFloat(v.eqn);
                eqn = "curr[" + offsets[n] + "] = " + vars.Variable.prototype.code.apply(v, [offsets]) + ';';
            }
            ci.push(eqn);
        }
        for (i = 0; i < model.flows.length; i++) {
            v = model.flows[i];
            n = util.eName(v.name);
            if (v instanceof vars.Module)
                eqn = 'this.modules["' + v.name + '"].calcFlows(dt, curr);';
            else
                eqn = "curr[" + offsets[n] + "] = " + v.code(offsets) + ';';
            if (!eqn)
                continue;
            cf.push(eqn);
        }
        for (i = 0; i < model.stocks.length; i++) {
            v = model.stocks[i];
            n = util.eName(v.name);
            if (v instanceof vars.Module)
                cs.push('this.modules["' + v.name + '"].calcStocks(dt, curr, next);');
            else if (!v.hasOwnProperty('initial'))
                cs.push("next[" + offsets[n] + "] = curr[" + offsets[n] + '];');
            else
                cs.push("next[" + offsets[n] + "] = " + v.code(offsets) + ';');
        }
        for (n in model.tables) {
            tables[n] = {
                'x': model.tables[n].x,
                'y': model.tables[n].y,
            };
        }
        // TODO(bp) modules
        var init = [];
        var modules = ['{'];
        for (n in model.modules) {
            init.push('var ' + n + ' = new ' + util.titleCase(model.modules[n].modelName) + '("' + n + '", this, off);');
            init.push('off += ' + n + '.nVars;');
            modules.push('    "' + n + '": ' + n + ',');
        }
        modules.push('}')

        var name = util.eName(model.name);
        return {
            'name': name,
            'className': util.titleCase(name),
            'isModule?': false,
            'modules': modules.join('\n    '),
            'init': init.join('\n    '),
            'initialVals': JSON.stringify(initials, null, '    '),
            'timespecVals': JSON.stringify(model.timespec, null, '    '),
            'tableVals': JSON.stringify(tables, null, '    '),
            'calcI': ci.join('\n    '),
            'calcF': cf.join('\n    '),
            'calcS': cs.join('\n    '),
            'offsets': JSON.stringify(runtimeOffsets, null, '    '),
        };
    };
    Sim.prototype.nextID = function() {
        return this.idSeq++;
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

    return {
        'Sim': Sim,
    };
});
