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
    const Sim = function Sim() {
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
        var end = util.min(aTime, this.time.end);
        var time;
        for (time = this._curr.time; time <= end; time += this.time.step) {
            // 1 - update time

            // 2 - update flows

            // 3 - update stocks

            // keep a hold of the data if its a save step.

            // swap _curr and _next
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
        return NaN;
    }
    /**
       Get all of the saved values of a variable.

       @param varName Name of the variable to get data for.
       @return An n-by-2 array of time/value pairs, or null on error.
    */
    Sim.prototype.getValueSeries = function(varName) {
        return null;
    }
    sim.Sim = Sim;

    return sim;
});
