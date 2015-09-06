// Copyright 2015 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

/// <reference path="../typings/tsd.d.ts" />

'use strict';

import chai = require('chai');

import {SourceLoc} from '../lib/lex';
import {Node, BinaryExpr, UnaryExpr, ParenExpr, IfExpr, CallExpr,
	Ident, Constant} from '../lib/ast';
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
	},
	{
		in: "(5. * åbc)",
		out: new ParenExpr(
			l(0, 0),
			new BinaryExpr(
				new Constant(l(0, 1), "5."),
				l(0, 4), '*',
				new Ident(l(0, 6), 'åbc')),
			l(0, 9))
	},
	{
		in: "(5. * åbc4)",
		out: new ParenExpr(
			l(0, 0),
			new BinaryExpr(
				new Constant(l(0, 1), "5."),
				l(0, 4), '*',
				new Ident(l(0, 6), 'åbc4')),
			l(0, 10))
	}
/*
	}},
	{"smooth()", {
		{N_CALL, 0, NULL},
		{N_IDENT, 0, "smooth"},
	}},
	{"smooth(1, 2 + 3, d)", {
		{N_CALL, 0, NULL},
		{N_IDENT, 0, "smooth"},
		{N_FLOATLIT, 0, "1"},
		{N_BINARY, '+', NULL},
		{N_FLOATLIT, 0, "2"},
		{N_FLOATLIT, 0, "3"},
		{N_IDENT, 0, "d"},
	}},
	{"IF a THEN b ELSE c", {
		{N_IF, 0, NULL},
		{N_IDENT, 0, "a"},
		{N_IDENT, 0, "b"},
		{N_IDENT, 0, "c"},
	}},
	{"a > 1", {
		{N_BINARY, '>', NULL},
		{N_IDENT, 0, "a"},
		{N_FLOATLIT, 0, "1"},
	}},
	{"a = 1", {
		{N_BINARY, '=', NULL},
		{N_IDENT, 0, "a"},
		{N_FLOATLIT, 0, "1"},
	}},
	{"IF a > 1 THEN b ELSE c", {
		{N_IF, 0, NULL},
		{N_BINARY, '>', NULL},
		{N_IDENT, 0, "a"},
		{N_FLOATLIT, 0, "1"},
		{N_IDENT, 0, "b"},
		{N_IDENT, 0, "c"},
	}},
	{"IF a >= 1 THEN b ELSE c", {
		{N_IF, 0, NULL},
		{N_BINARY, u'≥', NULL},
		{N_IDENT, 0, "a"},
		{N_FLOATLIT, 0, "1"},
		{N_IDENT, 0, "b"},
		{N_IDENT, 0, "c"},
	}},
	{"4 - 5 + 6", {
		{N_BINARY, '+', NULL},
		{N_BINARY, '-', NULL},
		{N_FLOATLIT, 0, "4"},
		{N_FLOATLIT, 0, "5"},
		{N_FLOATLIT, 0, "6"},
	}},
	*/
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
