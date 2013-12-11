/* jshint globalstrict: true, unused: false */
/* global cmds: false */
'use strict';

var i32 = function i32(n) {
    return n|0;
};

var Simulation = function() {};
Simulation.prototype.init = function(name, parent, initials, timespec, tables, mapping) {
    this.name = name;
    this.parent = parent;
    this.initials = initials;
    this.timespec = timespec;
    this.tables = tables;
    this.v = mapping;
    this.nVars = Object.keys(this.v).length;

    this.reset();
};
Simulation.prototype.reset = function() {
    var timespec = this.timespec;

    this.stepNum = 0;
    this.saveNum = 0;

    this.history = [];

    this.curr = new Float64Array(this.nVars);
    this.next = new Float64Array(this.nVars);

    this.curr[this.offset('time')] = timespec.start;

    var nSteps = i32((timespec.stop - timespec.start)/timespec.savestep + 1);
    this.saveEvery = Math.max(1, i32(timespec.savestep/timespec.dt+0.5));

    this.timeSeries = new Float64Array(nSteps);

    this.calcInitial(this.timespec.dt, this.curr);
};
Simulation.prototype.runTo = function(endTime) {
    var timeOff = this.offset('time');
    var dt = this.timespec.dt;

    var time, tmp;
    while (this.curr[timeOff] <= endTime) {
        this.calcFlows(dt, this.curr);
        this.calcStocks(dt, this.curr, this.next);

        time = this.curr[timeOff];
        if (this.stepNum % this.saveEvery === 0) {
            this.timeSeries[this.saveNum] = time;
            this.history.push(this.curr);
            tmp = null;

            this.saveNum++;
        } else {
            // if we're not saving the results in curr, reuse the
            // buffer to reduce GC pressure
            tmp = this.curr;
        }
        this.stepNum++;

        this.next[timeOff] = time + dt;
        this.curr = this.next;
        if (tmp)
            this.next = tmp;
        else
            this.next = new Float64Array(this.nVars);
    }
};
Simulation.prototype.offset = function(name) {
    // detect if we're running in debug mode where we're using named
    // property access instead of offsets into a Float64Array
    if (typeof this.v[name] === 'string')
        return name;
    else
        return this.v[name];
};
Simulation.prototype.runToEnd = function() {
    return this.runTo(this.timespec.stop + 0.5*this.timespec.dt);
};
Simulation.prototype.setValue = function(name, value) {
    this.curr[this.offset(name)] = value;
};
Simulation.prototype.value = function(name) {
    return this.history[Math.max(this.saveNum-1, 0)][this.offset(name)];
};
Simulation.prototype.series = function(name) {
    var time = this.timeSeries.subarray(0, this.saveNum);
    var values = new Float64Array(time.length);
    var off = this.offset(name);
    var i;
    for (i=0; i < time.length; i++)
        values[i] = this.history[i][off];
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
            return [main.curr.time, null];
        },
        'run_to_end': function() {
            main.runToEnd();
            return [main.curr.time, null];
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
