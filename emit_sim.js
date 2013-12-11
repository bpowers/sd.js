#!/usr/bin/env node

DOMParser = require('xmldom').DOMParser;
Mustache = require('./lib/vendor/mustache');

var fs = require('fs');
var sd = require('./build/sd.nakid').sd;

var argv = process.argv;
if (argv.length < 3) {
    console.log('usage: ./emit_sim.js XMILE_FILE')
    process.exit(1);
}

fs.readFile(argv[2], function(err, data) {
    var ctx = new sd.Project(data.toString());
    var mdl = ctx.model();
    var sim = mdl.sim(true);
});
