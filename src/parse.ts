// Copyright 2015 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

'use strict';

import {Node, BinaryExpr, UnaryExpr, ParenExpr, IfExpr, CallExpr,
	Ident, Constant} from './ast';
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
	if (p.errs && p.errs.length)
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
			if (!rhs) {
				p.errs.push('expected rhs of expr after "' + op.tok + '"');
				return null;
			}

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
		let pos: SourceLoc;
		if ((pos = this.consumeTok('('))) {
			lhs = this.expr();
			if (!lhs) {
				this.errs.push('expected an expression after an opening paren');
				return null;
			}
			let closing: SourceLoc;
			if (!(closing = this.consumeTok(')'))) {
				this.errs.push('expected ")", not end-of-equation');
				return null;
			}
			return new ParenExpr(pos, lhs, closing);
		}

		let op: Token;
		if ((op = this.consumeAnyOf(UNARY))) {
			lhs = this.expr();
			if (!lhs) {
				this.errs.push('unary operator "' + op.tok + '" without operand.');
				return null;
			}
			return new UnaryExpr(op.startLoc, op.tok, lhs);
		}

		if ((lhs = this.num()))
			return lhs;

		if (this.consumeReserved('if')) {
			let cond = this.expr();
			if (!cond) {
				this.errs.push('expected an expr to follow "IF"');
				return null;
			}
			if (!this.consumeReserved('then')) {
				this.errs.push('expected "THEN"');
				return null;
			}
			let t = this.expr();
			if (!t) {
				this.errs.push('expected an expr to follow "THEN"');
				return null;
			}
			if (!this.consumeReserved('then')) {
				this.errs.push('expected "THEN"');
				return null;
			}
			let f = this.expr();
			if (!f) {
				this.errs.push('expected an expr to follow "ELSE"');
				return null;
			}
			// FIXME: record SourceLocs for IF/THEN/ELSE
			let l = new SourceLoc(0, 0);
			return new IfExpr(l, cond, l, t, l, f);
		}

		if ((lhs = this.ident())) {
			// check if this is a function call
			if (this.consumeTok('('))
				return this.call(lhs);
			else
				return lhs;
		}

		// an empty expression isn't necessarily an error
		return null;
	}

	consumeAnyOf(ops: string): Token {
		let peek = this.lexer.peek();
		if (!peek || peek.type !== TokenType.TOKEN)
			return null;
		for (let i = 0; i < ops.length; i++) {
			if (peek.tok === ops[i])
				return this.lexer.nextTok();
		}
		return null;
	}

	consumeTok(s: string): SourceLoc {
		let t = this.lexer.peek();
		if (!t || t.type !== TokenType.TOKEN || t.tok !== s)
			return null;
		// consume match
		this.lexer.nextTok();
		return t.startLoc;
	}

	consumeReserved(s: string): SourceLoc {
		let t = this.lexer.peek();
		if (!t || t.type !== TokenType.RESERVED || t.tok !== s)
			return null;
		// consume match
		this.lexer.nextTok();
		return t.startLoc;
	}

	num(): Node {
		let t = this.lexer.peek();
		if (!t || t.type !== TokenType.NUMBER)
			return null;
		// consume number
		this.lexer.nextTok();
		return new Constant(t.startLoc, t.tok);
	}

	ident(): Node {
		let t = this.lexer.peek();
		if (!t || t.type !== TokenType.IDENT)
			return null;
		// consume ident
		this.lexer.nextTok();
		return new Ident(t.startLoc, t.tok);
	}

	call(fn: Node): Node {
		let args: Node[] = [];
		// FIXME real source locs
		let l = new SourceLoc(0, 0);

		// no-arg call - simplifies logic to special case this.
		if (this.consumeTok(')'))
			return new CallExpr(fn, l, args, l);

		while (true) {
			let arg = this.expr();
			if (!arg) {
				this.errs.push('expected expression as arg in function call');
				return null;
			}
			args.push(arg);
			if (this.consumeTok(','))
				continue;
			if (this.consumeTok(')'))
				break;
			this.errs.push('call: expected "," or ")"');
			return null;
		}

		return new CallExpr(fn, l, args, l);
	}
}
