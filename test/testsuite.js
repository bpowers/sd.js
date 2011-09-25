
this.engineSuite = {};
this.engineSuite.scanner = function(test) {
    const macro = 'IF value THEN MAX(flow, 0) ELSE flow';
    const expected = ['if', 'value', 'then', 'max', '(', 'flow', ',', 0, ')', 'else', 'flow'];

    var scanner = new boosd.Scanner(macro);
    var tok;
    var i = 0;
    while ((tok = scanner.getToken())) {
	test.ok(tok.tok === expected[i], 'checking ' + tok.tok);
	i += 1;
    }

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
