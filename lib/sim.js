// Copyright 2013 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

// XXX: this sim module can't depend on the model module, as model
// imports sim, and we don't want circular dependencies.
define(['./util', './vars', './common', './lex'], function(util, vars, common, lex) {

    var tmpl = "\n\
importScripts('{{&importURL}}');\n\
\n\
var {{&name}}Initials = {{&initialVals}};\n\
\n\
var {{&name}}Timespec = {{&timespecVals}};\n\
\n\
var {{&className}} = function {{&className}}(name, coord) {\n\
    this.init(name, coord, {{&name}}Initials, {{&name}}Timespec);\n\
};\n\
{{&className}}.prototype = new Simulation();\n\
{{&className}}.prototype.calcInitial = function(dt) {\n\
    {{&calcI}}\n\
};\n\
{{&className}}.prototype.calcFlows = function(dt) {\n\
    {{&calcF}}\n\
};\n\
{{&className}}.prototype.calcStocks = function(dt) {\n\
    {{&calcS}}\n\
};\n\
\n\
var main = new {{&className}}('main', coord);\n\
\n\
var cmds = initCmds(coord, main);\n\
\n\
onmessage = handleMessage;\n\
";

    var varEqn = function(v) {
        const scanner = new lex.Scanner(v.eqn);
        const result = [];
        var tok;
        while ((tok = scanner.getToken())) {
            if (tok.type !== lex.IDENT || tok.tok in common.builtins)
                result.push(tok.tok);
            else
                result.push("this.curr['" + tok.tok + "']")
        }
        return result.join(' ');
    }

    var Sim = function Sim(model) {
        this.model = model;
        this.seq = 1; // message id sequence
        this.promised = {}; //callback storage, keyed by message id
        var initials = {};
        var ci = [], cf = [], cs = [];
        var i, v, n;
        for (i = 0; i < model.initials.length; i++) {
            v = model.initials[i];
            n = util.eName(v.name);
            initials[n] = v.eqn;
            ci.push("this.curr['" + n + "'] = " + vars.Variable.prototype.equation.apply(v) + ';');
        }
        for (i = 0; i < model.flows.length; i++) {
            v = model.flows[i];
            n = util.eName(v.name);
            cf.push("this.curr['" + n + "'] = " + varEqn(v) + ';');
        }
        for (i = 0; i < model.stocks.length; i++) {
            v = model.stocks[i];
            n = util.eName(v.name);
            cs.push("this.next['" + n + "'] = " + v.equation() + ';');
        }
        var name = util.eName(model.name);
        var source = Mustache.render(tmpl, {
            'importURL': window.location.origin + '/js/runtime.js',
            'name': name,
            'className': util.titleCase(name),
            'initialVals': JSON.stringify(initials, null, '\t'),
            'timespecVals': JSON.stringify(model.timespec, null, '\t'),
            'calcI': ci.join('\n    '),
            'calcF': cf.join('\n    '),
            'calcS': cs.join('\n    '),
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
    }
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
    }
    Sim.prototype.close = function() {
        this.worker.terminate();
        this.worker = null;
    }
    Sim.prototype.setValue = function(name, val) {
        return this._post('set_val', name, val);
    }
    Sim.prototype.value = function() {
        args = ['get_val'].concat(Array.prototype.slice.call(arguments));
        return this._post.apply(this, args);
    }
    Sim.prototype.series = function() {
        args = ['get_series'].concat(Array.prototype.slice.call(arguments));
        return this._post.apply(this, args);
    }
    Sim.prototype.runTo = function(time) {
        return this._post('run_to', time);
    }
    Sim.prototype.runToEnd = function() {
        return this._post('run_to_end');
    }

    return {
        'Sim': Sim,
    };
});
