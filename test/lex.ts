// Copyright 2015 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

/// <reference path="../typings/tsd.d.ts" />

'use strict';

/* tslint:disable: align:arguments */
/* tslint:disable: typedef:call-signature */
/* tslint:disable: no-string-literal */

import chai = require('chai');

import {Token, TokenType, Scanner} from '../lib/lex';

const expect = chai.expect;

interface LexTestData {
	in: string;
	out: Token[];
}

const LEX_TESTS: LexTestData[] = [
	{
		in: "a",
		out: [
			new Token("a", TokenType.IDENT),
		]
	},
	{
		in: "å",
		out: [
			new Token("å", TokenType.IDENT),
		]
	},
	{
		in: "a1_åbc________",
		out: [
			new Token("a1_åbc________", TokenType.IDENT),
		]
	},
	{
		in: "IF value THEN MAX(flow, 1) ELSE flow",
		out: [
			new Token("if", TokenType.RESERVED),
			new Token("value", TokenType.IDENT),
			new Token("then", TokenType.RESERVED),
			new Token("max", TokenType.IDENT),
			new Token("(", TokenType.TOKEN),
			new Token("flow", TokenType.IDENT),
			new Token(",", TokenType.TOKEN),
			new Token("1", TokenType.NUMBER),
			new Token(")", TokenType.TOKEN),
			new Token("else", TokenType.RESERVED),
			new Token("flow", TokenType.IDENT),
		]
	},
	{
		in: "if a < 1 then 1 else 0",
		out: [
			new Token("if", TokenType.RESERVED),
			new Token("a", TokenType.IDENT),
			new Token("<", TokenType.TOKEN),
			new Token("1", TokenType.NUMBER),
			new Token("then", TokenType.RESERVED),
			new Token("1", TokenType.NUMBER),
			new Token("else", TokenType.RESERVED),
			new Token("0", TokenType.NUMBER),
		]
	},
	{
		in: "IF a = b THEN 1 ELSE 0",
		out: [
			new Token("if", TokenType.RESERVED),
			new Token("a", TokenType.IDENT),
			new Token("=", TokenType.TOKEN),
			new Token("b", TokenType.IDENT),
			new Token("then", TokenType.RESERVED),
			new Token("1", TokenType.NUMBER),
			new Token("else", TokenType.RESERVED),
			new Token("0", TokenType.NUMBER),
		]
	},
	{
		in: "IF a >= 1 THEN b ELSE c",
		out: [
			new Token("if", TokenType.RESERVED),
			new Token("a", TokenType.IDENT),
			new Token("≥", TokenType.TOKEN),
			new Token("1", TokenType.NUMBER),
			new Token("then", TokenType.RESERVED),
			new Token("b", TokenType.IDENT),
			new Token("else", TokenType.RESERVED),
			new Token("c", TokenType.IDENT),
		]
	},
	// exponent 'e' is case insensitive
	{
		in: "5E4",
		out: [
			new Token("5e4", TokenType.NUMBER),
		]
	},
	{
		in: "5e4",
		out: [
			new Token("5e4", TokenType.NUMBER),
			]
	},
	{
		in: "5.0000000000000e4.00000000000000",
		out: [
			new Token("5.0000000000000e4.00000000000000", TokenType.NUMBER),
		]
	},
	{
		in: "3",
		out: [
			new Token("3", TokenType.NUMBER),
		]
	},
	{
		in: "3.1.1e.1.1e1e1",
		out: [
			new Token("3.1", TokenType.NUMBER),
			new Token(".1e.1", TokenType.NUMBER),
			new Token(".1e1", TokenType.NUMBER),
			new Token("e1", TokenType.IDENT),
		]
	},
	{
		in: "-3.222\n",
		out: [
			new Token("-", TokenType.TOKEN),
			new Token("3.222", TokenType.NUMBER),
		]
	},
	{
		in: "-30000.222",
		out: [
			new Token("-", TokenType.TOKEN),
			new Token("30000.222", TokenType.NUMBER),
		]
	},
	{
		in: "5.3e4.",
		out: [
			new Token("5.3e4.", TokenType.NUMBER),
		]
	},
	{
		in: "3 == 4 \n\n= 1",
		out: [
			new Token("3", TokenType.NUMBER),
			new Token("==", TokenType.TOKEN),
			new Token("4", TokenType.NUMBER),
			new Token("=", TokenType.TOKEN),
			new Token("1", TokenType.NUMBER),
		]
	},
	{
		in: "3 <> 4",
		out: [
			new Token("3", TokenType.NUMBER),
			new Token("≠", TokenType.TOKEN),
			new Token("4", TokenType.NUMBER),
		]
	},
	{
		in: "3 >< 4",
		out: [
			new Token("3", TokenType.NUMBER),
			new Token(">", TokenType.TOKEN),
			new Token("<", TokenType.TOKEN),
			new Token("4", TokenType.NUMBER),
		]
	},
	{
		in: "3 <= 4",
		out: [
			new Token("3", TokenType.NUMBER),
			new Token("≤", TokenType.TOKEN),
			new Token("4", TokenType.NUMBER),
		]
	},
	{
		in: "3 AND 4",
		out: [
			new Token("3", TokenType.NUMBER),
			new Token("&", TokenType.TOKEN),
			new Token("4", TokenType.NUMBER),
		]
	},
	{
		in: "3 OR 4",
		out: [
			new Token("3", TokenType.NUMBER),
			new Token("|", TokenType.TOKEN),
			new Token("4", TokenType.NUMBER),
		]
	},
	{
		in: "NOT 0",
		out: [
			new Token("!", TokenType.TOKEN),
			new Token("0", TokenType.NUMBER),
		]
	},
	{
		in: "3 >= 4",
		out: [
			new Token("3", TokenType.NUMBER),
			new Token("≥", TokenType.TOKEN),
			new Token("4", TokenType.NUMBER),
		]
	},
	{
		in: "hares * birth_fraction",
		out: [
			new Token("hares", TokenType.IDENT),
			new Token("*", TokenType.TOKEN),
			new Token("birth_fraction", TokenType.IDENT),
		]
	},
	{
		in: "", out: []
	},
	{
		in: "\n", out: []
	},
	{
		in: "{comment}", out: []
	},
	{
		in: "{unclosed comment", out: []
	},
	{
		in: "{comment before num}3",
		out: [
			new Token("3", TokenType.NUMBER),
		]
	},
	{
		in: "{}", out: [] // empty comment
	},
	{
		in: "pulse(size_of_1_time_lynx_harvest, 4, 1e3)\n",
		out: [
			new Token("pulse", TokenType.IDENT),
			new Token("(", TokenType.TOKEN),
			new Token("size_of_1_time_lynx_harvest", TokenType.IDENT),
			new Token(",", TokenType.TOKEN),
			new Token("4", TokenType.NUMBER),
			new Token(",", TokenType.TOKEN),
			new Token("1e3", TokenType.NUMBER),
			new Token(")", TokenType.TOKEN),
		]
	},
	{
		in: "\"hares\" * \"birth fraction\"",
		out: [
			new Token("\"hares\"", TokenType.IDENT),
			new Token("*", TokenType.TOKEN),
			new Token("\"birth fraction\"", TokenType.IDENT),
		]
	},
];

describe('lex', function() {
	LEX_TESTS.forEach(function(t) {
		it('should lex ' + t.in, function() {
			let lex = new Scanner(t.in);
			let count = 0;
			let tok: Token;
			while ((tok = lex.getToken())) {
				count++;
			}
			expect(count).to.equal(t.out.length);
		});
	});
});
