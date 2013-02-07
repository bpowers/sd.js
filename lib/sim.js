// Copyright 2011 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

// NOTE: while it might seem strange, this sim module can't depend on
// the model module, as model imports sim, and I don't want circular
// dependencies.
define(['./util', './vars', './common'], function(util, vars, common) {
    const sim = {};

    // this constructor doesn't do anything, as all the instantiated
    // sims are their own class which inherits from this parent Sim.
    const Sim = function Sim(model, timespec) {
        this._model = model;
        this._ts = timespec;
        this._series = [];
        this._timeSeries = [];
        this._curr = {};
        this._next = {};
        this._stepNum = 0;
        // the binary or forces the result to be an integer.  See:
	// http://jibbering.com/faq/notes/type-conversion/#tcToInt32
        this._saveEvery = (timespec.saveSpec/timespec.dt + .5)|0;
    };
    /**
       Run the sim to the specified time.  If the time is past the end
       time of the model, it runs the sim to the end.  If the time is
       before or equal to the current time of the simulation, nothing
       happens.

       @param time The new desired time for the sim.
       @return The (possibly changed) current time of the simulation.
    */
    Sim.prototype.runTo = function(aTime) {
        // euler
        var time;
        while (this._curr.time <= aTime) {
            this._model.step(this, this._ts.dt);

            if (this._stepNum % this._saveEvery === 0) {
                this._timeSeries.push(this._curr.time);
                this._series.push(this._curr);
            }
            this._stepNum++;

            this._next.time = this._curr.time + this._ts.dt;
            this._curr = this._next;
            this._next = {}
        }
        return time;
    }
    /**
       Run the sim to the end time specified in the model.

       @return The current time of the model; should be equal to the
       end time.
    */
    Sim.prototype.runToEnd = function() {
        return this.runTo(this.time.step);
    }
    /**
       Get the value of a variable at the current time step.

       @param varName Name of the variable to get data for.
       @return The value at the current time, or NaN on error.
    */
    Sim.prototype.getValue = function(varName) {
        return this._curr[varName];
    }
    /**
       Get all of the saved values of a variable.

       @param varName Name of the variable to get data for.
       @return An n-by-2 array of time/value pairs, or null on error.
    */
    Sim.prototype.getValueSeries = function(varName) {
	var result = [];
	result.push(this._timeSeries);
	var data;
	var i;
	for (i = 0; i < this._series.length; i++) {
	    data.push(this._series[i][varName]);
	}
	result.push(data);
        return result;
    }
    sim.Sim = Sim;

    return sim;
});
