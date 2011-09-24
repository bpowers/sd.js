// Copyright 2011 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.
var fs = require('fs');
var $ = require('jquery');
var _ = require('underscore');
var boosd = require('../engine.js');

exports.lynx1 = function(test) {
    fs.readFile('test/data/lynx-hares2.xml', function(err, data) {
	var model;

        test.ok(!err, 'error reading file');
        if (err) {
            test.done();
            return;
        }

	const xmlString = '' + data;
	model = boosd.modelGen("");
	test.ok(model == null && boosd.err == boosd.ERR_VERSION,
		'no error on bad model');

	model = boosd.modelGen(xmlString);
	test.ok(model && typeof model === 'object' && !boosd.err,
		'model not an object')

	test.done();
    });
}
