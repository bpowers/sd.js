// Copyright 2015 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

/// <reference path="../typings/tsd.d.ts" />

'use strict';

import chai = require('chai');

import {Node, Constant, Ident, BinaryExpr} from '../lib/ast';
import * as parse from '../lib/parse';

const expect = chai.expect;

interface ParseTestData {
	in: string;
	out: Node;
}

const PARSE_TESTS: ParseTestData[] = [
	{
		in: "a",
		out: new Ident(null, "a")
	},
	{
		in: "3.2 <> åbc",
		out: new BinaryExpr(
			new Constant(null, "3.2"),
			null, '≠',
			new Ident(null, 'åbc'))
	},
	{
		in: "hares * birth_fraction",
		out: new BinaryExpr(
			new Ident(null, "hares"),
			null, '*',
			new Ident(null, 'birth_fraction'))
	}
];

const PARSE_TEST_FAILURES = [
	"(",
	"(3",
	"3 +",
	"3 *",
	"(3 +)",
	"call(a,",
	"call(a,1+",
	"if if",
	"if 1 then",
	"if then",
	"if 1 then 2 else",
];

describe('parse', function(): void {
	PARSE_TESTS.forEach(function(t: ParseTestData): void {
		it('should parse ' + t.in, function(): void {
			let [node, err] = parse.eqn(t.in);
			expect(node).not.to.be.null;
			expect(err).to.be.null;
			expect(node).to.deep.equal(t.out);
		});
	});
});

describe('parse-failures', function(): void {
	PARSE_TEST_FAILURES.forEach(function(eqn: string): void {
		it('shouldn\'t parse ' + eqn, function(): void {
			let [node, err] = parse.eqn(eqn);
			expect(node).to.be.null;
			expect(err).not.to.be.null;
		});
	});
});
