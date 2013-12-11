/* global main: false, print: true, mainMapping: false */

// work under both node and d8
if (typeof console !== 'undefined')
    print = console.log;

main.runToEnd();
var series = {};
var header = 'time\t';
var v;
for (v in mainMapping) {
    if (v === 'time')
        continue;
    header += v + '\t';
    series[v] = main.series(v);
}
print(header.substr(0, header.length-1));

var nSteps = main.series('time').time.length;
var i;
var msg = '';
for (i = 0; i < nSteps; i++) {
    msg = '';
    for (v in series) {
        if (msg === '')
            msg += series[v].time[i] + '\t';
        msg += series[v].values[i] + '\t';
    }
    print(msg.substr(0, msg.length-1));
}
