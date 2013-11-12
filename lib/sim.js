// Copyright 2013 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

// XXX: this sim module can't depend on the model module, as model
// imports sim, and we don't want circular dependencies.
define(['./util', './vars', './common'], function(util, vars, common) {

    var tmpl = "\n\
importScripts('{{&importURL}}');\n\
\n\
var {{&name}}Initials = {\n\
    'population': 100,\n\
    'birth_rate': 0.1,\n\
    'average_lifespan': 80,\n\
};\n\
\n\
var {{&name}}Timespec = {{&timespecVals}};\n\
\n\
var {{&className}} = function {{&className}}(name, coord) {\n\
    this.init(name, coord, {{&name}}Initials, {{&name}}Timespec);\n\
};\n\
{{&className}}.prototype = new Simulation();\n\
{{&className}}.prototype.calcInitial = function(dt) {\n\
    this.curr['population'] = this.coord.value('population')\n\
    this.curr['birth_rate'] = this.coord.value('birth_rate')\n\
    this.curr['average_lifespan'] = this.coord.value('average_lifespan')\n\
};\n\
{{&className}}.prototype.calcFlows = function(dt) {\n\
    this.curr['births'] = this.curr['population'] * this.curr['birth_rate']\n\
    this.curr['deaths'] = this.curr['population'] / this.curr['average_lifespan']\n\
};\n\
{{&className}}.prototype.calcStocks = function(dt) {\n\
    this.next['birth_rate'] = this.coord.value('birth_rate')\n\
    this.next['average_lifespan'] = this.coord.value('average_lifespan')\n\
    this.next['population'] = this.curr['population'] + (this.curr['births'] - this.curr['deaths'])*dt\n\
};\n\
\n\
var main = new {{&className}}('main', coord);\n\
\n\
var cmds = initCmds(coord, main);\n\
\n\
onmessage = handleMessage;\n\
";

    var Sim = function Sim(model) {
        this.model = model;
        this.seq = 1; // message id sequence
        this.promised = {}; //callback storage, keyed by message id
        var name = 'population';
        var source = Mustache.render(tmpl, {
            'importURL': window.location.origin + '/js/runtime.js',
            'name': name,
            'className': util.titleCase(name),
            'initialVals': JSON.stringify('', null, '\t'),
            'timespecVals': JSON.stringify(model.timespec, null, '\t'),
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
