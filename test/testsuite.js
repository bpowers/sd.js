// Copyright 2011 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.
define(['../lib/sd', '../lib/lex', '../lib/util'], function(sd, lex, util) {

    const set = util.set;

    var suite = {};
    suite.identifierSet = function(test) {
        const iSet = lex.identifierSet('IF value THEN MAX(flow, 0) ELSE flow');

        test.ok(Object.keys(iSet).length === 2,
                'set len (want 2): ' + Object.keys(iSet).length);
        test.ok('value' in iSet, 'has "value"');
        test.ok('flow' in iSet, 'has "flow"');
        test.done();
    }

    suite.lex = function(test) {
        const testLex = function(str, expected, types) {
            var scanner = new lex.Scanner(str);
            var tok;
            var i = 0;

            while ((tok = scanner.getToken())) {
                test.ok(tok.tok === expected[i],
                        'checking ' + tok.tok + ' === ' + expected[i]);
                test.ok(tok.type === types[i],
                        'checking ' + tok.type + ' === ' + types[i]);
                i += 1;
            }
        }
        testLex('IF value THEN MAX(flow, 0) ELSE flow',
                ['if', 'value', 'then', 'max', '(', 'flow', ',', 0, ')', 'else', 'flow'],
                [lex.RESERVED, lex.IDENT, lex.RESERVED, lex.IDENT,
                 lex.TOKEN, lex.IDENT, lex.TOKEN, lex.NUMBER, lex.TOKEN,
                 lex.RESERVED, lex.IDENT]);

        // we do a .toLowerCase internally, so both of these work.
        testLex('5E4', [50000], [lex.NUMBER]);
        testLex('5e4', [50000], [lex.NUMBER]);

        testLex('pulse(size_of_1_time_lynx_harvest, 4, 1e3)',
                ['pulse', '(', 'size_of_1_time_lynx_harvest', ',', 4, ',', 1000, ')'],
                [lex.IDENT, lex.TOKEN, lex.IDENT, lex.TOKEN, lex.NUMBER,
                 lex.TOKEN, lex.NUMBER, lex.TOKEN])


        test.done();
    };

    suite.lynx1 = function(test) {
        dataStore.getFile('test/data/lynx-hares2.xml', function(err, data) {
            var model;

            test.ok(!err, 'error reading file');
            if (err) {
                test.done();
                return;
            }

            // on node data is a byte array.  this forces it into a
            // string.
            const xmlString = '' + data;
            model = sd.newModel('');
            test.ok(model === null && sd.error() === sd.errors.ERR_VERSION,
                    'no error on bad model');

            model = sd.newModel(xmlString);
            test.ok(model instanceof sd.Model && !sd.error(),
                    'model not an object');

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

    // check the variable dependencies used by the sorting routines.
    suite.varDeps = function(test) {
        dataStore.getFile('test/data/lynx-hares2.xml', function(err, data) {
            var model;

            test.ok(!err, 'error reading file');
            if (err) {
                test.done();
                return;
            }

            // on node data is a byte array.  this forces it into a
            // string.
            const xmlString = '' + data;

            model = sd.newModel(xmlString);
            test.ok(model instanceof sd.Model && !sd.error(),
                    'model not an object');

            function verifyDeps(name, depArray) {
                if (!model.vars.hasOwnProperty(name)) {
                    test.ok(false, 'dep verify failed, unknown var ' + name);
                    return;
                }
                const deps = model.vars[name].getDeps();
                const depsLen = _.keys(deps).length;

                test.ok(depsLen === depArray.length,
                        'expected ' + depArray.length + ', got ' + depsLen);

                var i;
                for (i = 0; i < depArray.length; ++i) {
                    test.ok(depArray[i] in deps,
                            name + ' has dep ' + depArray[i]);
                }
            }

            verifyDeps('hares', ['hare_births', 'hare_deaths']);
            verifyDeps('one_time_lynx_harvest', ['size_of_1_time_lynx_harvest']);
            verifyDeps('hare_births', ['hares', 'hare_birth_fraction']);
            verifyDeps('hare_density', ['hares', 'area']);
            verifyDeps('area', []);

            test.done();
        });
    };

    suite.sort = function(test) {
        // its not comprehensive, but its something.
        var toSort   = [7, 5, 5, 7, 2, 1];
        const sorted = [1, 2, 5, 5, 7, 7];

        // sorts in place;
        util.sort(toSort);
        var i;
        for (i = 0; i < sorted.length; ++i) {
            test.ok(sorted[i] === toSort[i], sorted[i] + ' === ' + toSort[i]);
        }

        test.done();
    };

    return suite;
});
