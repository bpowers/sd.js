
this.engineSuite = {};
this.engineSuite.scanner = function(test) {
    const testLex = function(str, expected) {
	var scanner = new boosd.Scanner(str);
	var tok;
	var i = 0;

	while ((tok = scanner.getToken())) {
	    test.ok(tok.tok === expected[i],
		    'checking ' + tok.tok + ' === ' + expected[i]);
	    i += 1;
	}
    }
    testLex('IF value THEN MAX(flow, 0) ELSE flow',
	    ['if', 'value', 'then', 'max', '(', 'flow', ',', 0, ')', 'else', 'flow']);

    // we do a .toLowerCase internally, so both of these work.
    testLex('5E4', [50000]);
    testLex('5e4', [50000]);

    test.done();
};

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
