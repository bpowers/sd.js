
this.engineSuite = {};
this.engineSuite.lynx1 = function(test) {
    dataStore.getFile('test/data/lynx-hares2.xml', function(err, data) {
	var model;

        test.ok(!err, 'error reading file');
        if (err) {
            test.done();
            return;
        }

	const xmlString = '' + data;
	model = boosd.modelGen('');
	test.ok(model == null && boosd.err == boosd.ERR_VERSION,
		'no error on bad model');

	model = boosd.modelGen(xmlString);
	test.ok(model && typeof model === 'object' && !boosd.err,
		'model not an object')

	test.done();
    });
};
