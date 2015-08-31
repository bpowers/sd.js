/// <reference path="./generated.d.ts" />


/* global main: false, print: true */

let pr: (...args: string[])=>void;

if (typeof console === 'undefined') {
	pr = print;
} else {
	pr = console.log;
}

main.runToEnd();
export var series: {[name: string]: Series} = {};
export var header = 'time\t';
export var vars = main.varNames();
for (let i = 0; i < vars.length; i++) {
	let v = vars[i];
	if (v === 'time')
		continue;
	header += v + '\t';
	series[v] = main.series(v);
}
pr(header.substr(0, header.length-1));

export var nSteps = main.series('time').time.length;
for (let i = 0; i < nSteps; i++) {
	let msg = '';
	for (let v in series) {
		if (!series.hasOwnProperty(v))
			continue;
		if (msg === '')
			msg += series[v].time[i] + '\t';
		msg += series[v].values[i] + '\t';
	}
	pr(msg.substr(0, msg.length-1));
}
