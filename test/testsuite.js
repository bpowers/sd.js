
const set = boosd.set;

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
        model = boosd.newModel('');
        test.ok(model == null && boosd.err == boosd.ERR_VERSION,
                'no error on bad model');

        model = boosd.newModel(xmlString);
        test.ok(model instanceof boosd.Model && !boosd.err,
                'model not an object')

	function verifyVars(aSet, anArray) {
            test.ok(Object.keys(aSet).length === anArray.length,
                    'num of vars ' + anArray.length +
		    ' (expected: ' + Object.keys(aSet).length + ')');
	    var i;
	    for (i = 0; i < anArray.length; ++i) {
		test.ok(anArray[i].name in aSet,
			'set contains: ' + anArray[i].name);
	    }
	}

        test.ok(Object.keys(model.vars).length === 14, 'wrong vars len');

        expectedInitials = set('hares', 'lynx');
	verifyVars(expectedInitials, model.initials);

        expectedStocks = set('hares', 'lynx');
        verifyVars(expectedStocks, model.stocks);

        expectedFlows = set('hare_births', 'hare_deaths',
                            'lynx_births', 'lynx_deaths',
                            'one_time_lynx_harvest',
                            'hare_birth_fraction', 'hare_density',
                            'area', 'lynx_birth_fraction',
                            'size_of_1_time_lynx_harvest',
                            'lynx_death_fraction', 'hares_killed_per_lynx');
        verifyVars(expectedFlows, model.flows);

        test.done();
    });
};

this.engineSuite.sort = function(test) {
    // its not comprehensive, but its something.
    var toSort   = [7, 5, 5, 7, 2, 1];
    const sorted = [1, 2, 5, 5, 7, 7];

    // sorts in place;
    boosd.sort(toSort);
    var i;
    for (i = 0; i < sorted.length; ++i) {
	test.ok(sorted[i] === toSort[i], sorted[i] + ' === ' + toSort[i]);
    }

    test.done();
};