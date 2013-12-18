/* jshint globalstrict: true, unused: false */
/* global cmds: false, TIME: false, DEBUG: false */
'use strict';

var i32 = function i32(n) {
    return n|0;
};

var Simulation = function() {};
Simulation.prototype.lookupOffset = function(id) {
    //print(this.name + ': ' + id + ' resolving (' + this._shift + ')');
    if (id === 'time')
        return 0;
    if (id[0] === '.')
        id = id.substr(1);
    if (id in this.offsets)
        return this._shift + this.offsets[id];
    var parts = id.split('.');
    if (parts.length === 1 && id === "" && this.name in this.offsets)
        return this._shift + this.offsets[this.name];
    var nextSim = this.modules[parts[0]];
    if (!nextSim)
        return -1;
    return nextSim.lookupOffset(parts.slice(1).join('.'));
};
Simulation.prototype.resolveAllSymbolicRefs = function() {
    var n, ctx;
    for (n in this.symRefs) {
        if (this.symRefs[n][0] === '.')
            ctx = main;
        else
            ctx = this.parent;
        this.ref[n] = ctx.lookupOffset(this.symRefs[n]);
        //print(this.name + ': ' + n + ' resolved to ' + this.ref[n]);
    }
    for (n in this.modules)
        this.modules[n].resolveAllSymbolicRefs();
};
Simulation.prototype.varNames = function() {
    var result = Object.keys(this.offsets).slice();
    var ids;
    for (v in this.modules) {
        ids = this.modules[v].varNames().map(function(n) {
            return v + '.' + n;
        });
        result = result.concat(ids);
    }
    if (this.name === 'main')
        result.push('time');

    return result;
}
Simulation.prototype.getNVars = function() {
    var nVars = Object.keys(this.offsets).length;
    var n;
    for (n in this.modules)
        nVars += this.modules[n].getNVars();
    // if we're main, claim time
    if (this.name === 'main')
        nVars++;
    return nVars;
};
Simulation.prototype.reset = function() {
    var timespec = this.timespec;
    var nSteps = i32((timespec.stop - timespec.start)/timespec.dt + 1);

    this.stepNum = 0;

    this.slab = new Float64Array(this.nVars*(nSteps));

    var curr = this.curr();
    curr[TIME] = timespec.start;
    this.saveEvery = Math.max(1, i32(timespec.savestep/timespec.dt+0.5));

    this.calcInitial(this.timespec.dt, curr);
};
Simulation.prototype.runTo = function(endTime) {
    var dt = this.timespec.dt;

    var curr = this.curr();
    var next = this.slab.subarray((this.stepNum+1)*this.nVars,
                                  (this.stepNum+2)*this.nVars);

    while (curr[TIME] <= endTime) {
        this.calcFlows(dt, curr);
        this.calcStocks(dt, curr, next);

        this.stepNum++;

        next[TIME] = curr[TIME] + dt;

        curr = next;
        next = this.slab.subarray((this.stepNum+1)*this.nVars,
                                  (this.stepNum+2)*this.nVars);
    }
};
Simulation.prototype.runToEnd = function() {
    return this.runTo(this.timespec.stop + 0.5*this.timespec.dt);
};
Simulation.prototype.curr = function() {
    return this.slab.subarray((this.stepNum)*this.nVars,
                              (this.stepNum+1)*this.nVars);
};
Simulation.prototype.setValue = function(name, value) {
    var off = this.lookupOffset(name);
    if (off === -1)
        return;
    this.curr()[off] = value;
};
Simulation.prototype.value = function(name) {
    var off = this.lookupOffset(name);
    if (off === -1)
        return;
    var saveNum = i32(this.stepNum/this.saveEvery);
    var slabOff = this.nVars*(saveNum*this.saveEvery);
    return this.slab.subarray(slabOff, slabOff + this.nVars)[off];
};
Simulation.prototype.series = function(name) {
    var saveNum = i32(this.stepNum/this.saveEvery);
    var time = new Float64Array(saveNum+1);
    var values = new Float64Array(saveNum+1);
    var off = this.lookupOffset(name);
    if (off === -1)
        return;
    //print(this.name + ': ' + name + ' resolved to ' + off);
    var i, curr;
    for (i=0; i < time.length; i++) {
        curr = this.slab.subarray((i*this.saveEvery)*this.nVars,
                                  (i*this.saveEvery+1)*this.nVars);
        time[i] = curr[0];
        values[i] = curr[off];
    }
    return {
        'name': name,
        'time': time,
        'values': values,
    };
};

function handleMessage(e) {
    var id = e.data[0];
    var cmd = e.data[1];
    var args = e.data.slice(2);
    var result;

    if (cmds.hasOwnProperty(cmd))
        result = cmds[cmd].apply(null, args);
    else
        result = [null, 'unknown command "' + cmd + '"'];

    if (!Array.isArray(result))
        result = [null, 'no result for [' + e.data.join(', ') + ']'];

    // TODO(bp) look into transferrable objects
    var msg = [id, result];
    postMessage(msg);
}

function initCmds(main) {
    return {
        'reset': function() {
            main.reset();
            return ['ok', null];
        },
        'set_val': function(name, val) {
            main.setValue(name, val);
            return ['ok', null];
        },
        'get_val': function() {
            var result = {};
            var i;
            for (i=0; i < arguments.length; i++)
                result[arguments[i]] = main.value(arguments[i]);
            return [result, null];
        },
        'get_series': function() {
            var result = {};
            var i;
            for (i=0; i<arguments.length; i++)
                result[arguments[i]] = main.series(arguments[i]);
            return [result, null];
        },
        'run_to': function(time) {
            main.runTo(time);
            return [main.value('time'), null];
        },
        'run_to_end': function() {
            main.runToEnd();
            return [main.value('time'), null];
        },
    };
}

function lookup(table, index) {
    var size = table.x.length;
    if (size === 0)
        return NaN;

    var x = table.x;
    var y = table.y;

    if (index <= x[0])
        return y[0];
    else if (index >= x[size - 1])
        return y[size - 1];

    // binary search seems to be the most appropriate choice here.
    var low = 0;
    var high = size;
    var mid;
    while (low < high) {
        mid = Math.floor(low + (high - low)/2);
        if (x[mid] < index) {
            low = mid + 1;
        } else {
            high = mid;
        }
    }

    var i = low;
    if (x[i] === index) {
        return y[i];
    } else {
        // slope = deltaY/deltaX
        var slope = (y[i] - y[i-1]) / (x[i] - x[i-1]);
        // y = m*x + b
        return (index - x[i-1])*slope + y[i-1];
    }
}

function max(a, b) {
    a = +a;
    b = +b;
    return a > b ? a : b;
}

function min(a, b) {
    a = +a;
    b = +b;
    return a < b ? a : b;
}

function pulse(dt, time, volume, firstPulse, interval) {
    if (time < firstPulse)
        return 0;
    var nextPulse = firstPulse;
    while (time >= nextPulse) {
        if (time < nextPulse + dt)
            return volume/dt;
        else if (interval <= 0.0)
            break;
        else
            nextPulse += interval;
    }
    return 0;
}
