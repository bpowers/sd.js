// Copyright 2013 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

// XXX: this sim module can't depend on the model module, as model
// imports sim, and we don't want circular dependencies.
define(['./util', './vars', './common'], function(util, vars, common) {

    var Sim = function Sim(model) {
        this.model = model;
        this.seq = 1; // message id sequence
        this.promised = {}; //callback storage, keyed by message id
        this.worker = new Worker("/js/rabbit.js");
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
    Sim.prototype.value = function(name) {
        return this._post('get_val', name);
    }
    Sim.prototype.series = function(name) {
        return this._post('get_series', name);
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
