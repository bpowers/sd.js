#!/usr/bin/env node

DOMParser = require('xmldom').DOMParser;
Mustache = require('mustache');

var fs = require('fs');
var sd = require('../lib/sd').sd;

var argv = process.argv;
if (argv.length < 3) {
    console.log('usage: ./emit_sim.js XMILE_FILE')
    process.exit(1);
}

fs.readFile(argv[2], function(err, data) {
    var xml = (new DOMParser()).parseFromString(data.toString(), 'application/xml');
    var ctx = new sd.Project(xml);
    var mdl = ctx.model();
    var sim = mdl.sim(true);
});
