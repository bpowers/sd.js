'use strict';
function i32(n) {
    'use strict';
    return n | 0;
}
var Simulation = (function () {
    function Simulation() {
    }
    Simulation.prototype.lookupOffset = function (id) {
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
    Simulation.prototype.root = function () {
        if (!this.parent)
            return this;
        return this.parent.root();
    };
    Simulation.prototype.resolveAllSymbolicRefs = function () {
        for (var n in this.symRefs) {
            if (!this.symRefs.hasOwnProperty(n))
                continue;
            var ctx = void 0;
            if (this.symRefs[n][0] === '.') {
                ctx = this.root();
            }
            else {
                ctx = this.parent;
            }
            this.ref[n] = ctx.lookupOffset(this.symRefs[n]);
        }
        for (var n in this.modules) {
            if (!this.modules.hasOwnProperty(n))
                continue;
            this.modules[n].resolveAllSymbolicRefs();
        }
    };
    Simulation.prototype.varNames = function () {
        var result = Object.keys(this.offsets).slice();
        for (var v in this.modules) {
            if (!this.modules.hasOwnProperty(v))
                continue;
            var ids = [];
            var modVarNames = this.modules[v].varNames();
            for (var n in modVarNames) {
                if (modVarNames.hasOwnProperty(n))
                    ids.push(v + '.' + modVarNames[n]);
            }
            result = result.concat(ids);
        }
        if (this.name === 'main')
            result.push('time');
        return result;
    };
    Simulation.prototype.getNVars = function () {
        var nVars = Object.keys(this.offsets).length;
        for (var n in this.modules) {
            if (this.modules.hasOwnProperty(n))
                nVars += this.modules[n].getNVars();
        }
        if (this.name === 'main')
            nVars++;
        return nVars;
    };
    Simulation.prototype.reset = function () {
        var spec = this.simSpec;
        var nSaveSteps = i32((spec.stop - spec.start) / spec.saveStep + 1);
        this.stepNum = 0;
        this.slab = new Float64Array(this.nVars * (nSaveSteps + 1));
        var curr = this.curr();
        curr[0] = spec.start;
        this.saveEvery = Math.max(1, i32(spec.saveStep / spec.dt + 0.5));
        this.calcInitial(this.simSpec.dt, curr);
    };
    Simulation.prototype.runTo = function (endTime) {
        var dt = this.simSpec.dt;
        var curr = this.curr();
        var next = this.slab.subarray((this.stepNum + 1) * this.nVars, (this.stepNum + 2) * this.nVars);
        while (curr[0] <= endTime) {
            this.calcFlows(dt, curr);
            this.calcStocks(dt, curr, next);
            next[0] = curr[0] + dt;
            if (this.stepNum++ % this.saveEvery !== 0) {
                curr.set(next);
            }
            else {
                curr = next;
                next = this.slab.subarray((i32(this.stepNum / this.saveEvery) + 1) * this.nVars, (i32(this.stepNum / this.saveEvery) + 2) * this.nVars);
            }
        }
    };
    Simulation.prototype.runToEnd = function () {
        return this.runTo(this.simSpec.stop + 0.5 * this.simSpec.dt);
    };
    Simulation.prototype.curr = function () {
        return this.slab.subarray((this.stepNum) * this.nVars, (this.stepNum + 1) * this.nVars);
    };
    Simulation.prototype.setValue = function (name, value) {
        var off = this.lookupOffset(name);
        if (off === -1)
            return;
        this.curr()[off] = value;
    };
    Simulation.prototype.value = function (name) {
        var off = this.lookupOffset(name);
        if (off === -1)
            return;
        var saveNum = i32(this.stepNum / this.saveEvery);
        var slabOff = this.nVars * saveNum;
        return this.slab.subarray(slabOff, slabOff + this.nVars)[off];
    };
    Simulation.prototype.series = function (name) {
        var saveNum = i32(this.stepNum / this.saveEvery);
        var time = new Float64Array(saveNum);
        var values = new Float64Array(saveNum);
        var off = this.lookupOffset(name);
        if (off === -1)
            return;
        for (var i = 0; i < time.length; i++) {
            var curr = this.slab.subarray(i * this.nVars, (i + 1) * this.nVars);
            time[i] = curr[0];
            values[i] = curr[off];
        }
        return {
            'name': name,
            'time': time,
            'values': values,
        };
    };
    return Simulation;
})();
var cmds;
function handleMessage(e) {
    'use strict';
    var id = e.data[0];
    var cmd = e.data[1];
    var args = e.data.slice(2);
    var result;
    if (cmds.hasOwnProperty(cmd)) {
        result = cmds[cmd].apply(null, args);
    }
    else {
        result = [null, 'unknown command "' + cmd + '"'];
    }
    if (!Array.isArray(result))
        result = [null, 'no result for [' + e.data.join(', ') + ']'];
    var msg = [id, result];
    this.postMessage(msg);
}
var desiredSeries = null;
function initCmds(main) {
    'use strict';
    return {
        'reset': function () {
            main.reset();
            return ['ok', null];
        },
        'set_val': function (name, val) {
            main.setValue(name, val);
            return ['ok', null];
        },
        'get_val': function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i - 0] = arguments[_i];
            }
            var result = {};
            for (var i = 0; i < args.length; i++)
                result[args[i]] = main.value(args[i]);
            return [result, null];
        },
        'get_series': function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i - 0] = arguments[_i];
            }
            var result = {};
            for (var i = 0; i < args.length; i++)
                result[args[i]] = main.series(args[i]);
            return [result, null];
        },
        'run_to': function (time) {
            main.runTo(time);
            return [main.value('time'), null];
        },
        'run_to_end': function () {
            var result = {};
            main.runToEnd();
            if (desiredSeries) {
                for (var i = 0; i < desiredSeries.length; i++)
                    result[desiredSeries[i]] = main.series(desiredSeries[i]);
                return [result, null];
            }
            else {
                return [main.value('time'), null];
            }
        },
        'set_desired_series': function (names) {
            desiredSeries = names;
            return ['ok', null];
        },
    };
}
function lookup(table, index) {
    'use strict';
    var size = table.x.length;
    if (size === 0)
        return NaN;
    var x = table.x;
    var y = table.y;
    if (index <= x[0]) {
        return y[0];
    }
    else if (index >= x[size - 1]) {
        return y[size - 1];
    }
    var low = 0;
    var high = size;
    var mid;
    while (low < high) {
        mid = Math.floor(low + (high - low) / 2);
        if (x[mid] < index) {
            low = mid + 1;
        }
        else {
            high = mid;
        }
    }
    var i = low;
    if (x[i] === index) {
        return y[i];
    }
    else {
        var slope = (y[i] - y[i - 1]) / (x[i] - x[i - 1]);
        return (index - x[i - 1]) * slope + y[i - 1];
    }
}
function max(a, b) {
    'use strict';
    a = +a;
    b = +b;
    return a > b ? a : b;
}
function min(a, b) {
    'use strict';
    a = +a;
    b = +b;
    return a < b ? a : b;
}
function pulse(dt, time, volume, firstPulse, interval) {
    'use strict';
    if (time < firstPulse)
        return 0;
    var nextPulse = firstPulse;
    while (time >= nextPulse) {
        if (time < nextPulse + dt) {
            return volume / dt;
        }
        else if (interval <= 0.0) {
            break;
        }
        else {
            nextPulse += interval;
        }
    }
    return 0;
}

var Main = function Main(name, parent, offset, symRefs) {
	this.name = name;
	this.parent = parent;
	// if we are a module, record the offset in the curr & next
	// arrays we should be writing at
	this._shift = i32(offset);
	
	this.modules = {
	};
	// symbolic references, which will get resolved into integer
	// offsets in the ref map after all Simulation objects have
	// been initialized.
	this.symRefs = symRefs || {};
	this.ref = {};
	this.nVars = this.getNVars();
	if (name === 'main')
		this.reset();
};

Main.prototype = new Simulation();
Main.prototype.initials = {
	"price": 9,
	"revenue": 9
};
Main.prototype.simSpec = {
	"start": 1,
	"stop": 13,
	"dt": 0.25,
	"saveStep": 0.25,
	"method": "euler",
	"timeUnits": "",
	"dtReciprocal": 4
};
Main.prototype.offsets = {
	"price": 1,
	"revenue": 2,
	"sales": 3
};
Main.prototype.tables = {};
Main.prototype.calcInitial = function(dt, curr) {
	dt = +dt;
	curr[1/*price*/] = this.initials['price'];
	curr[2/*revenue*/] = this.initials['revenue'];
};
Main.prototype.calcFlows = function(dt, curr) {
	dt = +dt;
	curr[3/*sales*/] = (curr[1/*price*/]*curr[2/*revenue*/]);
};
Main.prototype.calcStocks = function(dt, curr, next) {
	dt = +dt;
	next[1/*price*/] = curr[1/*price*/];
	next[2/*revenue*/] = curr[2/*revenue*/];
};

var main = new Main('main');

main.resolveAllSymbolicRefs();

var cmds = initCmds(main);

/// <reference path="./generated.d.ts" />
var pr;
if (typeof console === 'undefined') {
    pr = print;
}
else {
    pr = console.log;
}
main.runToEnd();
var series = {};
var header = 'time\t';
var vars = main.varNames();
for (var i = 0; i < vars.length; i++) {
    var v = vars[i];
    if (v === 'time')
        continue;
    header += v + '\t';
    series[v] = main.series(v);
}
pr(header.substr(0, header.length - 1));
var nSteps = main.series('time').time.length;
for (var i = 0; i < nSteps; i++) {
    var msg = '';
    for (var v in series) {
        if (!series.hasOwnProperty(v))
            continue;
        if (msg === '')
            msg += series[v].time[i] + '\t';
        msg += series[v].values[i] + '\t';
    }
    pr(msg.substr(0, msg.length - 1));
}
