// Copyright 2011 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

dataStore = {};

// handle the cases of running in the browser or headless under node
if (typeof module !== 'undefined' && module.exports) {
    // we're running in node
    var fs = require('fs');
    dataStore.getFile = function(path, cb) {
        fs.readFile(path, function(err, data) {
            cb(err, data);
        });
    }

    var requirejs = require('requirejs');
    requirejs.config({
        nodeRequire: require,
        baseUrl: '.',
    });

    $ = require('jquery');
    _ = require('underscore');

    requirejs(['test/testsuite'], function(suite){
        exports.suite = suite;
    });

} else {
    // we're running in the browser
    dataStore.getFile = function(path, cb) {
        $.ajax(path, {
            'dataType': 'text',
            'success': function(data) {
                cb(null, data);
            }
        });
    }

    require(['./testsuite'], function(suite){
        //run the tests when document is ready
        $(function(){
            nodeunit.run({
                'Engine Tests': suite
            });
        });
    });
}
