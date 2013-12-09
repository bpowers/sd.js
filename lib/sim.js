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

    var tmpl = "{{&preamble}}\n\n" +
        "var {{&name}}Initials = {{&initialVals}};\n\n" +
        "var {{&name}}Timespec = {{&timespecVals}};\n\n" +
        "var {{&name}}Mapping = {{&mapping}};\n\n" +
        "var {{&name}}Tables = {{&tableVals}};\n\n" +
        "var {{&className}} = function {{&className}}(name) {\n" +
        "    this.init(name, {{&name}}Initials, {{&name}}Timespec, {{&name}}Tables, {{&name}}Mapping);\n" +
        "};\n" +
        "{{&className}}.prototype = new Simulation();\n" +
        "{{&className}}.prototype.calcInitial = function(dt) {\n" +
        "    {{&calcI}}\n" +
        "};\n" +
        "{{&className}}.prototype.calcFlows = function(dt) {\n" +
        "    {{&calcF}}\n" +
        "};\n" +
        "{{&className}}.prototype.calcStocks = function(dt) {\n" +
        "    {{&calcS}}\n" +
        "};\n\n" +
        "var main = new {{&className}}('main');\n\n" +
        "var cmds = initCmds(main);\n\n" +
        "onmessage = handleMessage;\n";

    var Sim = function Sim(model) {
        this.model = model;
        this.seq = 1; // message id sequence
        this.promised = {}; //callback storage, keyed by message id
        var initials = {};
        var tables = {};
        this.idSeq = 0;
        var mapping;
        if (DEBUG)
            mapping = {time: this.nextID()};
        else
            mapping = {time: '"time"'};
        var n;
        for (n in model.vars) {
            if (DEBUG)
                mapping[n] = this.nextID();
            else
                mapping[n] = '"' + n + '"';
        }
        var ci = [], cf = [], cs = [];
        var i, v, eqn;
        for (i = 0; i < model.initials.length; i++) {
            v = model.initials[i];
            n = util.eName(v.name);
            if (v.isConst())
                initials[n] = parseFloat(v.eqn);
            ci.push("this.curr[" + mapping[n] + "] = " + vars.Variable.prototype.equation.apply(v, [mapping]) + ';');
        }
        for (i = 0; i < model.flows.length; i++) {
            v = model.flows[i];
            n = util.eName(v.name);
            eqn = v.equation(mapping);
            if (!eqn)
                continue;
            cf.push("this.curr[" + mapping[n] + "] = " + eqn + ';');
        }
        for (i = 0; i < model.stocks.length; i++) {
            v = model.stocks[i];
            n = util.eName(v.name);
            if (v.isConst())
                cs.push("this.next[" + mapping[n] + "] = this.curr[" + mapping[n] + '];');
            else
                cs.push("this.next[" + mapping[n] + "] = " + v.equation(mapping) + ';');
        }
        for (n in model.tables) {
            tables[n] = {
                'x': model.tables[n].x,
                'y': model.tables[n].y,
            };
        }
        var name = util.eName(model.name);
        var source = Mustache.render(tmpl, {
            'preamble': runtime.preamble,
            'name': name,
            'className': util.titleCase(name),
            'initialVals': JSON.stringify(initials, null, '\t'),
            'timespecVals': JSON.stringify(model.timespec, null, '\t'),
            'tableVals': JSON.stringify(tables, null, '\t'),
            'calcI': ci.join('\n    '),
            'calcF': cf.join('\n    '),
            'calcS': cs.join('\n    '),
            'mapping': JSON.stringify(mapping, null, '\t'),
        });
        var blob = new Blob([source], {type: 'text/javascript'});
        this.worker = new Worker(window.URL.createObjectURL(blob));
        var s = this;
        this.worker.addEventListener('message', function(e) {
            var id = e.data[0];
            var result = e.data[1];
            var deferred = s.promised[id];
            delete s.promised[id];
            if (deferred) {
                if (result[1])
                    deferred.reject(result[1]);
                else
                    deferred.resolve(result[0]);
            }
        });
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
