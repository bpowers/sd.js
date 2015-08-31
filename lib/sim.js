// Copyright 2015 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.
/// <reference path="../bower_components/DefinitelyTyped/q/Q.d.ts" />
/// <reference path="../bower_components/DefinitelyTyped/mustache/mustache.d.ts" />
'use strict';
var util = require('./util');
var vars = require('./vars');
var runtime = require('./runtime');
var Q = require('../bower_components/q/q');
var Mustache = require('../bower_components/mustache.js/mustache');
var DEBUG = true;
var SP = DEBUG ? '    ' : '';
var NLSP = DEBUG ? '\n    ' : '';
var tmpl = "{{&preamble}}\n\nvar TIME = 0;\n\n{{#models}}\nvar {{&className}} = function {{&className}}(name, parent, offset, symRefs) {\n\tthis.name = name;\n\tthis.parent = parent;\n\t// if we are a module, record the offset in the curr & next\n\t// arrays we should be writing at\n\tthis._shift = i32(offset);\n\t{{&init}}\n\tthis.modules = {{&modules}};\n\t// symbolic references, which will get resolved into integer\n\t// offsets in the ref map after all Simulation objects have\n\t// been initialized.\n\tthis.symRefs = symRefs || {};\n\tthis.ref = {};\n\tthis.nVars = this.getNVars();\n\tif (name === 'main')\n\t\tthis.reset();\n};\n\n{{&className}}.prototype = new Simulation();\n{{&className}}.prototype.initials = {{&initialVals}};\n{{&className}}.prototype.timespec = {{&timespecVals}};\n{{&className}}.prototype.offsets = {{&offsets}};\n{{&className}}.prototype.tables = {{&tableVals}};\n{{&className}}.prototype.calcInitial = function(dt, curr) {\n\tdt = +dt;\n{{#isModule}}\n\tvar globalCurr = curr;\n\tcurr = curr.subarray(this._shift, this._shift + this.nVars);\n{{/isModule}}\n\t{{&calcI}}\n};\n{{&className}}.prototype.calcFlows = function(dt, curr) {\n\tdt = +dt;\n{{#isModule}}\n\tvar globalCurr = curr;\n\tcurr = curr.subarray(this._shift, this._shift + this.nVars);\n{{/isModule}}\n\t{{&calcF}}\n};\n{{&className}}.prototype.calcStocks = function(dt, curr, next) {\n\tdt = +dt;\n{{#isModule}}\n\tvar globalCurr = curr;\n\tcurr = curr.subarray(this._shift, this._shift + this.nVars);\n\tnext = next.subarray(this._shift, this._shift + this.nVars);\n{{/isModule}}\n\t{{&calcS}}\n};\n\n{{/models}}\nvar main = new {{&mainClassName}}('main');\n\nmain.resolveAllSymbolicRefs();\n\nvar cmds = initCmds(main);\n\n{{&epilogue}}";
var TemplateContext = (function () {
    function TemplateContext(model, mods, init, initials, tables, runtimeOffsets, ci, cf, cs) {
        this.name = model.name;
        this.className = util.titleCase(model.name);
        this.isModule = model.name !== 'main';
        this.modules = mods.join(NLSP);
        this.init = init.join(NLSP);
        this.initialVals = JSON.stringify(initials, null, SP);
        this.timespecVals = JSON.stringify(model.timespec, null, SP);
        this.tableVals = JSON.stringify(tables, null, SP);
        this.calcI = ci.join(NLSP);
        this.calcF = cf.join(NLSP);
        this.calcS = cs.join(NLSP);
        this.offsets = JSON.stringify(runtimeOffsets, null, SP);
    }
    return TemplateContext;
})();
exports.TemplateContext = TemplateContext;
var Sim = (function () {
    function Sim(root, isStandalone) {
        this.root = root;
        this.project = root.project;
        this.seq = 1;
        this.promised = {};
        this.idSeq = {};
        var models = root.referencedModels();
        var compiledModels = [];
        for (var n in models) {
            if (!models.hasOwnProperty(n))
                continue;
            if (n === 'main') {
                this.idSeq[n] = 1;
            }
            else {
                this.idSeq[n] = 0;
            }
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
        var blob = new Blob([source], { type: 'text/javascript' });
        this.worker = new Worker(window.URL.createObjectURL(blob));
        blob = null;
        source = null;
        var _this = this;
        this.worker.addEventListener('message', function (e) {
            var id = e.data[0];
            var result = e.data[1];
            var deferred = _this.promised[id];
            delete _this.promised[id];
            if (deferred) {
                if (result[1]) {
                    deferred.reject(result[1]);
                }
                else {
                    deferred.resolve(result[0]);
                }
            }
        });
    }
    Sim.prototype._process = function (model, modules) {
        var run_initials = [];
        var run_flows = [];
        var run_stocks = [];
        function isRef(n) {
            for (var i = 0; i < modules.length; i++) {
                if (n in modules[i].refs)
                    return true;
            }
            return false;
        }
        var offsets = {};
        var runtimeOffsets = {};
        for (var n in model.vars) {
            if (!model.vars.hasOwnProperty(n))
                continue;
            var v = model.vars[n];
            if (v instanceof vars.Module) {
                run_initials.push(v);
                run_flows.push(v);
                run_stocks.push(v);
            }
            else if (v instanceof vars.Stock) {
                run_initials.push(v);
                run_stocks.push(v);
            }
            else if (v instanceof vars.Table) {
                run_flows.push(v);
            }
            else if (v.isConst()) {
                run_initials.push(v);
                run_stocks.push(v);
            }
            else {
                run_flows.push(v);
            }
            if (!(v instanceof vars.Module) && !isRef(n)) {
                var off = this.nextID(model.name);
                runtimeOffsets[n] = off;
                if (DEBUG) {
                    offsets[n] = off + '/*' + n + '*/';
                }
                else {
                    offsets[n] = off;
                }
            }
        }
        util.sort(run_initials);
        util.sort(run_flows);
        var initials = {};
        var tables = {};
        var ci = [], cf = [], cs = [];
        for (var i = 0; i < run_initials.length; i++) {
            var eqn = void 0;
            var v = run_initials[i];
            if (v instanceof vars.Module) {
                eqn = 'this.modules["' + v.name + '"].calcInitial(dt, curr);';
            }
            else {
                if (isRef(v.name))
                    continue;
                if (v.isConst())
                    initials[v.name] = parseFloat(v.eqn);
                eqn = "curr[" + offsets[v.name] + "] = " + vars.Variable.prototype.code.apply(v, [offsets]) + ';';
            }
            ci.push(eqn);
        }
        for (var i = 0; i < run_flows.length; i++) {
            var eqn = void 0;
            var v = run_flows[i];
            eqn = null;
            if (v instanceof vars.Module) {
                eqn = 'this.modules["' + v.name + '"].calcFlows(dt, curr);';
            }
            else if (!isRef(v.name)) {
                eqn = "curr[" + offsets[v.name] + "] = " + v.code(offsets) + ';';
            }
            if (!eqn)
                continue;
            cf.push(eqn);
        }
        for (var i = 0; i < run_stocks.length; i++) {
            var eqn;
            var v = run_stocks[i];
            if (v instanceof vars.Module) {
                cs.push('this.modules["' + v.name + '"].calcStocks(dt, curr, next);');
            }
            else if (!v.hasOwnProperty('initial')) {
                cs.push("next[" + offsets[v.name] + "] = curr[" + offsets[v.name] + '];');
            }
            else {
                cs.push("next[" + offsets[v.name] + "] = " + v.code(offsets) + ';');
            }
        }
        for (var n in model.tables) {
            if (!model.tables.hasOwnProperty(n))
                continue;
            tables[n] = {
                'x': model.tables[n].x,
                'y': model.tables[n].y,
            };
        }
        var additional = '';
        var init = [];
        if (Object.keys(model.modules).length) {
            if (model.name === 'main')
                additional = ' + 1';
            init.push('var off = Object.keys(this.offsets).length' + additional + ';');
        }
        var mods = [];
        mods.push('{');
        for (var n in model.modules) {
            if (!model.modules.hasOwnProperty(n))
                continue;
            init.push('var ' + n + 'Refs = {');
            for (var ref in model.modules[n].refs) {
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
    };
    Sim.prototype.nextID = function (modelName) {
        return this.idSeq[modelName]++;
    };
    Sim.prototype._post = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        var id = this.seq++;
        var deferred = Q.defer();
        this.promised[id] = deferred;
        this.worker.postMessage([id].concat(args));
        return deferred.promise;
    };
    Sim.prototype.close = function () {
        this.worker.terminate();
        this.worker = null;
    };
    Sim.prototype.reset = function () {
        return this._post('reset');
    };
    Sim.prototype.setValue = function (name, val) {
        return this._post('set_val', name, val);
    };
    Sim.prototype.value = function () {
        var names = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            names[_i - 0] = arguments[_i];
        }
        var args = ['get_val'].concat(names);
        return this._post.apply(this, args);
    };
    Sim.prototype.series = function () {
        var names = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            names[_i - 0] = arguments[_i];
        }
        var args = ['get_series'].concat(names);
        return this._post.apply(this, args);
    };
    Sim.prototype.runTo = function (time) {
        return this._post('run_to', time);
    };
    Sim.prototype.runToEnd = function () {
        return this._post('run_to_end');
    };
    Sim.prototype.setDesiredSeries = function (names) {
        return this._post('set_desired_series', names);
    };
    return Sim;
})();
exports.Sim = Sim;
