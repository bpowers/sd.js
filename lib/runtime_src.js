var Simulation = function() {}
Simulation.prototype.init = function(name, coord, initials, timespec, tables, mapping) {
    coord.register(name, this);
    this.name = name;
    this.coord = coord;
    this.initials = initials;
    this.timespec = timespec;
    this.tables = tables;
    this.v = mapping;
    this.nVars = Object.keys(this.v).length;

    this.reset();
};
Simulation.prototype.reset = function() {
    const timespec = this.timespec;

    this.stepNum = 0;
    this.saveNum = 0;

    this.history = [];

    this.curr = new Float64Array(this.nVars);
    this.next = new Float64Array(this.nVars);

    var v;
    for (v in this.initials)
        coord.setValue(v, this.initials[v]);

    this.curr[this.v.time] = timespec.start;

    var nSteps = ((timespec.stop - timespec.start)/timespec.savestep + 1)|0
    this.saveEvery = Math.max(1, (timespec.savestep/timespec.dt+.5)|0)

    this.timeSeries = new Float64Array(nSteps);
};
Simulation.prototype.runTo = function(time) {
    const timeOff = this.v.time;
    const dt = this.timespec.dt;
    if (this.curr[timeOff] === this.timespec.start)
        this.calcInitial(dt);

    while (this.curr[timeOff] <= time) {
        this.calcFlows(dt);
        this.calcStocks(dt);

        if (this.stepNum % this.saveEvery == 0) {
            this.timeSeries[this.saveNum] = this.curr[timeOff];
            this.history.push(this.curr);

            this.saveNum++;
        }
        this.stepNum++;

        this.next[timeOff] = this.curr[timeOff] + dt;
        this.curr = this.next;
        this.next = new Float64Array(this.nVars);
    }
};
Simulation.prototype.runToEnd = function() {
    return this.runTo(this.timespec.stop + .5*this.timespec.dt)
};
Simulation.prototype.value = function(name) {
    return this.history[this.saveNum-1][name];
};
Simulation.prototype.series = function(name) {
    var time = this.timeSeries.subarray(0, this.saveNum);
    var values = new Float64Array(time.length);
    var off = this.v[name];
    var i;
    for (i=0; i < time.length; i++)
        values[i] = this.history[i][off];
    return {
        'name': name,
        'time': time,
        'values': values,
    };
};

var Coordinator = function Coordinator() {
    this.constants = {};
    this.sims = {};
};
Coordinator.prototype.setValue = function(name, val) {
    this.constants[name] = val;
    this.sims['main'].curr[name] = val;
};
Coordinator.prototype.value = function(name) {
    return this.constants[name];
};
Coordinator.prototype.register = function(name, sim) {
    this.sims[name] = sim;
};

var handleMessage = function(e) {
    var id = e.data[0];
    var cmd = e.data[1];
    var args = e.data.slice(2);
    var result;

    if (cmds.hasOwnProperty(cmd))
        result = cmds[cmd].apply(this, args);
    else
        result = [null, 'unknown command "' + cmd + '"'];

    if (!Array.isArray(result))
        result = [null, 'no result for [' + e.data.join(', ') + ']'];

    // TODO(bp) look into transferrable objects
    var msg = [id, result];
    postMessage(msg);
};

var initCmds = function(coord, main) {
    return {
        'reset': function() {
            main.reset();
            return ['ok', null];
        },
        'set_val': function(name, val) {
            coord.setValue(name, val);
            return ['ok', null];
        },
        'get_val': function() {
            var result = {};
            var i;
            for (i=0; i < arguments.length; i++)
                result[arguments[i]] = main.value(arguments[i]);
            return [result, null];
        },
        'get_series': function(name) {
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
};

const lookup = function(table, index) {
    const size = table.x.length;
    if (size === 0)
        return NaN;

    const x = table.x;
    const y = table.y;

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
        const slope = (y[i] - y[i-1]) / (x[i] - x[i-1]);
        // y = m*x + b
        return (index - x[i-1])*slope + y[i-1];
    }
};

var coord = new Coordinator();

const max = function(a, b) {
    return a > b ? a : b;
};

const min = function(a, b) {
    return a < b ? a : b;
};
