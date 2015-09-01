// Copyright 2015 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

/// <reference path="../typings/tsd.d.ts" />

'use strict';

/* tslint:disable: align:arguments */
/* tslint:disable: typedef:call-signature */
/* tslint:disable: no-string-literal */

import chai = require('chai');

import sd = require('../src/sd');
import sd = require('../src/lex');

import {set} from '../src/util';

const assert = chai.assert;

let suite: any = {};
suite.identifierSet = function(test) {
	const iSet = lex.identifierSet('IF value THEN MAX(flow, 0) ELSE flow');

	test.ok(Object.keys(iSet).length === 2,
		'set len (want 2): ' + Object.keys(iSet).length);
	test.ok('value' in iSet, 'has "value"');
	test.ok('flow' in iSet, 'has "flow"');
	test.done();
};

suite.lex = function(test) {
	function testLex(str, expected, types) {
		let scanner = new lex.Scanner(str);
		let tok;
		let i = 0;

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
		[
			lex.RESERVED, lex.IDENT, lex.RESERVED, lex.IDENT,
			lex.TOKEN, lex.IDENT, lex.TOKEN, lex.NUMBER, lex.TOKEN,
			lex.RESERVED, lex.IDENT]);

	// we do a .toLowerCase internally, so both of these work.
	testLex('5E4', [50000], [lex.NUMBER]);
	testLex('5e10', [50000000000], [lex.NUMBER]);

	testLex('-3.222', ['-', 3.222], [lex.TOKEN, lex.NUMBER]);
	testLex('-3000.222', ['-', 3000.222], [lex.TOKEN, lex.NUMBER]);
	testLex('5.3e4.', [53000], [lex.NUMBER]);

	testLex('pulse(size_of_1_time_lynx_harvest, 4, 1e3)',
		['pulse', '(', 'size_of_1_time_lynx_harvest', ',', 4, ',', 1000, ')'],
		[
			lex.IDENT, lex.TOKEN, lex.IDENT, lex.TOKEN, lex.NUMBER,
			lex.TOKEN, lex.NUMBER, lex.TOKEN,
		]);


	test.done();
};

suite.lynx1 = function(test) {
	dataStore.getFile('test/data/lynx-hares2.xml', function(err, data) {
		let model;

		test.ok(!err, 'read file');
		if (err) {
			test.done();
			return;
		}

		model = sd.newModel('');
		test.ok(model === null && sd.error() === sd.errors.ERR_VERSION,
			'error on bad model');

		const xml = (new DOMParser()).parseFromString(data, 'application/xml');

		model = sd.newModel(xml);
		if (sd.error())
			console.log('new model error: ' + sd.error());
		test.ok(model instanceof sd.Model && !sd.error(),
			'model an object');

		function verifyVars(aSet, anArray) {
			test.ok(Object.keys(aSet).length === anArray.length,
				'num of vars ' + anArray.length +
				' (expected: ' + Object.keys(aSet).length + ')');
			for (let i = 0; i < anArray.length; ++i) {
				test.ok(anArray[i].name in aSet,
					'set contains: ' + anArray[i].name);
			}
		}

		let len = Object.keys(model.vars).length;
		test.ok(len === 14, 'vars len 14 (' + len + ')');

		const expectedInitials = set(
			'hares', 'lynx',
			'size_of_1_time_lynx_harvest', 'hare_birth_fraction',
			'area', 'lynx_birth_fraction');
		// verifyVars(expectedInitials, model.initials);

		const expectedStocks = expectedInitials;
		// verifyVars(expectedStocks, model.stocks);

		expectedFlows = set(
			'hare_births', 'hare_deaths',
			'lynx_births', 'lynx_deaths',
			'one_time_lynx_harvest',
			'hare_density',
			'lynx_death_fraction', 'hares_killed_per_lynx');
		// verifyVars(expectedFlows, model.flows);

		function pr(n, l) {
			console.log(n + ':');
			for (let i = 0; i < l.length; i++)
				console.log('    ' + l[i].name);
		}
		// pr('initial', model.initials);
		// pr('flows', model.flows);
		// pr('stocks', model.stocks);

		test.done();
	});
};

// check the variable dependencies used by the sorting routines.
suite['let - deps'] = function(test) {
	dataStore.getFile('test/data/lynx-hares2.xml', function(err, data) {
		let model;

		test.ok(!err, 'read file');
		if (err) {
			test.done();
			return;
		}

		const xml = (new DOMParser()).parseFromString(data, 'application/xml');

		model = sd.newModel(xml);
		test.ok(model instanceof sd.Model && !sd.error(),
			'model an object');

		function verifyDeps(name, depArray) {
			if (!model.vars.hasOwnProperty(name)) {
				test.ok(false, 'dep verify failed, unknown let ' + name);
				return;
			}
			const deps = model.vars[name].getDeps();
			const depsLen = Object.keys(deps).length;

			test.ok(depsLen === depArray.length,
				name +  ' expected len ' + depArray.length +
				', got ' + depsLen);

			let i;
			for (i = 0; i < depArray.length; ++i) {
				test.ok(depArray[i] in deps,
					name + ' has dep ' + depArray[i]);
			}
		}

		verifyDeps('hares', []);
		verifyDeps('one_time_lynx_harvest', ['size_of_1_time_lynx_harvest']);
		verifyDeps('hare_births', ['hares', 'hare_birth_fraction']);
		verifyDeps('hare_density', ['hares', 'area']);
		verifyDeps('area', []);

		test.done();
	});
};

suite['let - less than'] = function(test){
	dataStore.getFile('test/data/lynx-hares2.xml', function(err, data) {
		let model;

		test.ok(!err, 'read file');
		if (err) {
			test.done();
			return;
		}

		const xml = (new DOMParser()).parseFromString(data, 'application/xml');
		model = sd.newModel(xml);
		test.ok(model instanceof sd.Model && !sd.error(),
			'model an object');

		const vars = model.vars;

		test.ok(!vars['hare_births'].lessThan(vars['hare_birth_fraction']),
			'births lt birth_fraction');
		test.ok(vars['hare_birth_fraction'].lessThan(vars['hare_births']),
			'birth_fraction lt births');

		test.done();
	});
};

suite['let - tables'] = function(test){
	dataStore.getFile('test/data/lynx-hares2.xml', function(err, data) {
		let model;

		test.ok(!err, 'read file');
		if (err) {
			test.done();
			return;
		}

		const xml = (new DOMParser()).parseFromString(data, 'application/xml');
		model = sd.newModel(xml);
		test.ok(model instanceof sd.Model && !sd.error(),
			'model an object');

		const tables = model.tables;

		test.ok(Object.keys(tables).length === 2, 'tables len 2');

		let table;
		function expect(index, val) {
			const result = util.lookup(table, index);
			test.ok(result === val,
				'lookup expect result ' + result + ' === ' + val);
		}
		// we're not testing interpolation, that is tested below,
		// we're testing that we're correctly parsing in Table
		// definitions and constructing the x and y axis
		// correctly.
		table = tables['lynx_death_fraction'];
		expect(0, .94);
		expect(100, .05);
		expect(50, .25);

		table = tables['hares_killed_per_lynx'];
		expect(0, 0);
		expect(500, 500);
		expect(250, 250);

		test.done();
	});
};

suite['let - equations'] = function(test){
	dataStore.getFile('test/data/lynx-hares2.xml', function(err, data) {
		let model;

		test.ok(!err, 'read file');
		if (err) {
			test.done();
			return;
		}

		const xml = (new DOMParser()).parseFromString(data, 'application/xml');
		model = sd.newModel(xml);
		test.ok(model instanceof sd.Model && !sd.error(),
			'model an object');

		function expect(name, eq) {
			const modelEq = model.vars[name].equation();
			test.ok(eq === modelEq, 'equation for ' + name +
				' expected "' + eq + '" got "' + modelEq + '"');
		}

		// this is a stock, it needs to update next.
		// expect('lynx', '');

		test.done();
	});
};

suite.sort = function(test) {
	// wrap a list of primitive numbers in an object that provides
	// a lessThan method implementation.
	function wrapNum(): any[] {
		function num(n) {
			this.n = n;
		}
		num.prototype.lessThan = function(that) {
			return this.n < that.n;
		};
		let result: num[] = [];
		for (let i = 0; i < arguments.length; i++)
			result.push(new num(arguments[i]));
		return result;
	}
	// its not comprehensive, but its something.
	let toSort   = wrapNum(7, 5, 5, 7, 2, 1);
	const sorted = wrapNum(1, 2, 5, 5, 7, 7);

	// sorts in place;
	util.sort(toSort);
	let i;
	for (i = 0; i < sorted.length; ++i) {
		test.ok(sorted[i].n === toSort[i].n,
			sorted[i].n + ' === ' + toSort[i].n);
	}

	test.done();
};

suite.lookup = function(test) {
	let table;
	function expect(index, val) {
		const result = util.lookup(table, index);
		test.ok(result === val,
			'lookup expect result ' + result + ' === ' + val);
	}

	table = {
		x: [1, 2, 3],
		y: [1, 2, 3],
	};
	expect(0, 1);
	expect(1, 1);
	expect(1.5, 1.5);
	expect(2, 2);
	expect(3, 3);
	expect(9, 3);

	table = {
		x: [-1, 1, 2, 3],
		y: [.5, 1, 5, -5],
	};
	expect(-10, .5);
	expect(-1, .5);
	expect(0, .75);
	expect(1, 1);
	expect(1.5, 3);
	expect(2, 5);
	expect(2.5, 0);
	expect(2.75, -2.5);
	expect(3, -5);
	expect(9, -5);

	test.done();
};

suite['let - equations 2'] = function(test){
	dataStore.getFile('test/data/pop.xmile', function(err, data) {
		let model;

		test.ok(!err, 'read file');
		if (err) {
			test.done();
			return;
		}

		const xml = (new DOMParser()).parseFromString(data, 'application/xml');
		model = sd.newModel(xml);
		test.ok(model instanceof sd.Model && !sd.error(),
			'model an object');

		function expect(name, eq) {
			const modelEq = model.vars[name].eqn;
			test.ok(eq === modelEq, 'equation for ' + name +
				' expected "' + eq + '" got "' + modelEq + '"');
		}

		expect('births', 'population * birth_rate');

		test.done();
	});
};
