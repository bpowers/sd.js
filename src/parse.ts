// Copyright 2015 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

'use strict';

import {Node, BinaryExpr, ParenExpr, Ident, Constant} from './ast';
import {Lexer, Token, TokenType, SourceLoc} from './lex';


const RESERVED = [
	"if",
	"then",
	"else"
];

const WORD_OPS = {
	"not": "!",
	"and": "&",
	"or": "|",
	"mod": "%"
};

const UNARY = "+-!";

const BINARY = [
	"^",
	"!", // FIXME(bp) right-associativity
	"*/%",
	"+-",
	"><≥≤",
	"=≠",
	"&",
	"|",
];

export function eqn(eqn: string): [Node, string[]] {
	'use strict';
	let p = new Parser(eqn);
	let ast = p.expr();
	if (p.errs)
		return [null, p.errs];
	return [ast, null];
}

function binaryLevel(n: number, p: Parser, ops: string): ()=>Node {
	'use strict';
	return function(): Node {
		let t = p.lexer.peek();
		if (!t)
			return null;
		let next = p.levels[n+1];
		let lhs = next();
		if (!lhs)
			return null;
		// its ok if we didn't have a binary operator
		for (let op = p.consumeAnyOf(ops); op; op = p.consumeAnyOf(ops)) {
			// must call the next precedence level to
			// preserve left-associativity
			let rhs = next();
			if (!rhs)
				return null;

			lhs = new BinaryExpr(lhs, op.startLoc, op.tok, rhs);
		}
		return lhs;
	};
}

class Parser {
	lexer: Lexer;
	errs: string[] = [];
	levels: Array<()=>Node> = [];

	constructor(eqn: string) {
		this.lexer = new Lexer(eqn);
		for (let i = 0; i < BINARY.length; i++) {
			this.levels.push(binaryLevel(i, this, BINARY[i]));
		}
		this.levels.push(this.factor.bind(this));
	}
	get errors(): string[] {
		return this.errs;
	}

	expr(): Node {
		return this.levels[0]();
	}
	factor(): Node {
		let lhs: Node;
		if (this.consumeTok('(')) {
			lhs = this.expr();
			if (!lhs)
				return null;
			if (!this.consumeTok(')'))
				return null;
			return new ParenExpr(new SourceLoc(0, 0), lhs, new SourceLoc(0, 0));
		}

		let op: Token;
		if ((op = this.consumeAnyOf(UNARY))) {
		}

		return null;
	}
	consumeAnyOf(ops: string): Token {
		let peek = this.lexer.peek();
		if (!peek || peek.type !== TokenType.TOKEN)
			return;
		if (ops.indexOf(<string>peek.tok) > -1)
			return this.lexer.nextTok();
		return;
	}
	consumeTok(s: string): boolean {
		let t = this.lexer.peek();
		if (!t) {
			this.errs.push('expected "' + s + '", not end-of-equation.');
			return false;
		} else if (t.type !== TokenType.TOKEN) {
			this.errs.push('expected "' + s + '", not ' + t.type + '("' + t.tok + '").');
			return false;
		} else if (s !== t.tok) {
			this.errs.push('expected "' + s + '", not "' + t.tok + '".');
			return false;
		}
		// consume match
		this.lexer.nextTok();
		return true;
	}
}
