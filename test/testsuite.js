
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

        function setSameLen(aSet, anArray) {
            return Object.keys(aSet).length === anArray.length;
        }

        test.ok(Object.keys(model.vars).length === 14, 'wrong vars len');

        expectedInitials = set('hares', 'lynx');
        test.ok(setSameLen(expectedInitials, model.initials),
                'wrong num of initials ' + model.initials.length);

        expectedStocks = set('hares', 'lynx');
        test.ok(setSameLen(expectedStocks, model.stocks),
                'wrong num of stocks ' + model.stocks.length);

        expectedFlows = set('hare_births', 'hare_deaths',
                            'lynx_births', 'lynx_deaths',
                            'one_time_lynx_harvest',
                            'hare_birth_fraction', 'hare_density',
                            'area', 'lynx_birth_fraction',
                            'size_of_1_time_lynx_harvest',
                            'lynx_death_fraction', 'hares_killed_per_lynx');
        test.ok(setSameLen(expectedFlows, model.flows),
                'wrong num of flows ' + model.flows.length + ' (want:' +
                Object.keys(expectedFlows).length + ')');

        test.done();
    });
};
