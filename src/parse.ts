// Copyright 2015 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

'use strict';

import {Node, BinaryExpr} from './ast';
import {Lexer, Token, TokenType, SourceLoc} from './lex';

export function parse(eqn: string): [Node, any] {
	'use strict';
	let p = new Parser(eqn);
	let ast = p.parse();
	if (p.errs.length)
		return [null, p.errs];
	return [ast, null];
}

function binaryLevel(n: number, p: Parser, ops: string): ()=>Node {
	'use strict';
	return function(): Node {
		if (!p.lexer.peek)
			return null;
		let next = p.levels[n+1];
		let lhs = next();
		if (!lhs)
			return null;
		for (let op = p.consumeAnyOf(ops); op; op = p.consumeAnyOf(ops)) {
			let rhs = next();
			if (!rhs)
				return null;
			lhs = new BinaryExpr(lhs, new SourceLoc(0, 0), <string>op.tok, rhs);
		}
		return lhs;
	};
}

class Parser {
	lexer: Lexer;
	errs: string[];
	levels: {[i: number]: ()=>Node};

	constructor(eqn: string) {
		this.lexer = new Lexer(eqn);
		this.levels = [
			binaryLevel(0, this, '^'),
			binaryLevel(1, this, '*/'),
			binaryLevel(2, this, '+-'),
			this.factor,
		];
	}
	parse(): Node {
		return this.levels[0]();
	};
	factor(): Node {
		return null;
	};
	consumeAnyOf(ops: string): Token {
		let peek = this.lexer.peek;
		if (!peek || peek.type !== TokenType.TOKEN)
			return;
		if (ops.indexOf(<string>peek.tok) > -1)
			return this.lexer.getToken();
		return;
	};
}
