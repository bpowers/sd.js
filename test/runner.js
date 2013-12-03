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
            cb(err, data.toString());
        });
    }

    var requirejs = require('requirejs');
    requirejs.config({
        nodeRequire: require,
        baseUrl: '.',
    });

    DOMParser = require('xmldom').DOMParser;

    exports['suite'] = requirejs('test/testsuite');

} else {
    // we're running in the browser
    dataStore.getFile = function(path, cb) {
        var req = new XMLHttpRequest();
        req.onreadystatechange = function() {
            if (req.readyState !== 4)
                return;
            if (req.status >= 200 && req.status < 300) {
                cb(null, req.responseText);
            }
        }
        req.open('GET', path, true);
        req.send();
    }

    require(['./testsuite'], function(suite){
        //run the tests when document is ready
        window.addEventListener("load", function() {
            nodeunit.run({
                'Engine Tests': suite
            });
        });
    });
}
