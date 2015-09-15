'use strict';

var through = require('through2');
var gutil = require('gulp-util');
var util = require('util');

var PluginError = gutil.PluginError;
var File = gutil.File;

var PLUGIN_NAME = 'build-runtime';

var DRAW_WRAP =
    '<defs><style>\n' +
    '/* <![CDATA[ */\n' +
    '%s\n' +
    '/* ]]> */\n' +
    '</style></defs>\n';

var WRAPPER =
    "// Copyright 2015 Bobby Powers. All rights reserved.\n" +
    "// Use of this source code is governed by the MIT\n" +
    "// license that can be found in the LICENSE file.\n" +
    "\n" +
    "'use strict';\n" +
    "\n" +
    "/* tslint:disable: max-line-length */\n" +
    "\n" +
    "export const preamble = %s;\n" +
    "\n" +
    "export const epilogue = %s;\n" +
    "\n" +
    "export const drawCSS = %s;\n";

var requiredInputs = [
    'runtime.js',
    'epilogue.js',
    'draw.css',
];

function buildRuntime(fileName) {
    if (!fileName)
        throw new PluginError(PLUGIN_NAME, 'Missing file name');
    else if (typeof fileName !== 'string')
        throw new PluginError(PLUGIN_NAME, 'buildRuntime arg should be string containing output file name');

    var files = {};
    var latestMod;
    var latestFile;

    function bufferContents(file, enc, cb) {
        // ignore empty files
        if (file.isNull()) {
            cb();
            return;
        }

        // we don't do streams (yet)
        if (file.isStream()) {
            this.emit('error', new PluginError(PLUGIN_NAME,  'Streaming not supported'));
            cb();
            return;
        }

        // set latest file if not already set,
        // or if the current file was modified more recently.
        if (!latestMod || file.stat && file.stat.mtime > latestMod) {
            latestFile = file;
            latestMod = file.stat && file.stat.mtime;
        }

        files[file.relative] = file.contents;
        cb();
    }

    function endStream(cb) {
        if (!latestFile || !Object.keys(files).length) {
            cb();
            return;
        }

        for (var i = 0; i < requiredInputs.length; i++) {
            if (!(requiredInputs[i] in files))
                new PluginError(PLUGIN_NAME,  'Missing required input ' + requiredInputs[i]);
        }

        var drawCSS = util.format(DRAW_WRAP, files['draw.css'].toString('utf8').trim());

        var out = new File({path: fileName});

        var contents = util.format(
            WRAPPER,
            JSON.stringify(files['runtime.js'].toString('utf8').trim()),
            JSON.stringify(files['epilogue.js'].toString('utf8').trim()),
            JSON.stringify(drawCSS));

        out.contents = new Buffer(contents);

        this.push(out);
        cb();
    }

    return through.obj(bufferContents, endStream);

};

module.exports = buildRuntime;
