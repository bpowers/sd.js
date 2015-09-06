// Copyright 2015 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

/// <reference path="../typings/tsd.d.ts" />

'use strict';

import chai = require('chai');

import {SourceLoc} from '../lib/lex';
import {Node, Constant, Ident, BinaryExpr} from '../lib/ast';
import * as parse from '../lib/parse';

const expect = chai.expect;

interface ParseTestData {
	in: string;
	out: Node;
}

function l(line: number, pos: number): SourceLoc {
	'use strict';
	return new SourceLoc(line, pos);
}

const PARSE_TESTS: ParseTestData[] = [
	{
		in: "a",
		out: new Ident(l(0, 0), "a")
	},
	{
		in: "3.2 <> åbc",
		out: new BinaryExpr(
			new Constant(l(0, 0), "3.2"),
			l(0, 4), '≠',
			new Ident(l(0, 7), 'åbc'))
	},
	{
		in: "hares * birth_fraction",
		out: new BinaryExpr(
			new Ident(l(0, 0), "hares"),
			l(0, 6), '*',
			new Ident(l(0, 8), 'birth_fraction'))
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
			if (err) {
				for (let i = 0; i < err.length; i++)
					console.log(err[i]);
			}
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
