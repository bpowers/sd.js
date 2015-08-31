// Copyright 2015 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.
'use strict';

import common = require('./common');
import util = require('./util');

// constants, sort of...
export const enum TokenType {
	TOKEN,
	IDENT,
	RESERVED,
	NUMBER,
}

// the idea is to use the scanner (& an eventual parser) to validate
// the equations, especially for the macros

// these are words reserved by SMILE
export const reservedWords = util.set('if', 'then', 'else');

function isWhitespace(ch: string): boolean {
	'use strict';
	return (/\s/).test(ch);
}
function isNumberStart(ch: string): boolean {
	'use strict';
	return (/[\d\.]/).test(ch);
}
function isIdentifierStart(ch: string): boolean {
	'use strict';
	return (/[\w_]/).test(ch);
}

class SourceLoc {
	line: number;
	pos: number;

	constructor(line: number, pos: number) {
		this.line = line;
		this.pos = pos;
	}
}

export class Token {
	tok: string|number;
	type: TokenType;
	startLoc: SourceLoc;
	endLoc: SourceLoc;

	constructor(tok: string|number, type: TokenType, startLoc: SourceLoc, endLoc: SourceLoc) {
		this.tok = tok;
		this.type = type;
		this.startLoc = startLoc;
		this.endLoc = endLoc;
	}
}

export class Scanner {
	text: string;
	textOrig: string;
	_len: number;
	_pos: number;
	_peek: string;
	_line: number;
	_lineStart: number;

	constructor(text: string) {
		this.textOrig = text;
		this.text = text.toLowerCase();
		this._len = text.length;
		this._pos = 0;
		this._peek = this.text[0];
		this._line = 0;
		this._lineStart = 0;
	}

	_getChar(): string {
		if (this._pos < this._len - 1) {
			this._pos += 1;
			this._peek = this.text[this._pos];
		} else {
			this._peek = null;
		}

		return this._peek;
	}

	_skipWhitespace(): void {
		do {
			if (this._peek === '\n') {
				this._line += 1;
				this._lineStart = this._pos + 1;
			}
			if (!isWhitespace(this._peek))
				break;
		} while (this._getChar() !== null);
	}

	_fastForward(num: number): void {
		this._pos += num;
		if (this._pos < this._len) {
			this._peek = this.text[this._pos];
		} else {
			this._peek = null;
		}
	}

	_lexIdentifier(startPos: SourceLoc): Token {
		const ident = /[\w_][\w\d_]*/.exec(this.text.substring(this._pos))[0];
		const len = ident.length;
		this._fastForward(len);
		let type: TokenType;
		if (ident in reservedWords) {
			type = TokenType.RESERVED;
		} else {
			type = TokenType.IDENT;
		}
		return new Token(
			ident, type, startPos,
			new SourceLoc(startPos.line, startPos.pos + len));
	}

	_lexNumber(startPos: SourceLoc): Token {
		// we do a .toLowerCase before the string gets to here, so we
		// don't need to match for lower and upper cased 'e's.
		const numStr = /\d*(\.\d*)?(e(\d+(\.\d*)?)?)?/.exec(this.text.substring(this._pos))[0];
		const len = numStr.length;
		const num = parseFloat(numStr);
		this._fastForward(len);
		return new Token(
			num, TokenType.NUMBER, startPos,
			new SourceLoc(startPos.line, startPos.pos + len));
	}

	getToken(): Token {
		this._skipWhitespace();
		let peek = this._peek;

		// at the end of the input, peek is null.
		if (peek === null || peek === undefined)
			return null;

		// keep track of the start of the token, relative to the start of
		// the current line.
		let start: number = this._pos - this._lineStart;
		let startLoc = new SourceLoc(this._line, start);

		// match two-char tokens; if its not a 2 char token return the
		// single char tok.
		switch (peek) {
		case '=':
			this._getChar();
			if (this._peek === '=') {
				// eat the second '=', since we matched.
				this._getChar();
				return new Token(
					'==', TokenType.TOKEN, startLoc,
					new SourceLoc(this._line, start + 2));
			} else {
				return new Token(
					'=', TokenType.TOKEN, startLoc,
					new SourceLoc(this._line, start + 1));
			}
			break;
		default:
			break;
		}

		if (isNumberStart(peek))
			return this._lexNumber(startLoc);

		if (isIdentifierStart(peek))
			return this._lexIdentifier(startLoc);

		// if we haven't matched by here, it must be a simple one char
		// token.  Eat that char and return the new token object.
		this._getChar();

		return new Token(
			peek, TokenType.TOKEN, startLoc,
			new SourceLoc(this._line, start + 1));
	}
}

/**
 * For a given equation string, returns a set of the identifiers
 * found.  Identifiers exclude keywords (such as 'if' and 'then')
 * as well as builtin functions ('pulse', 'max', etc).
 *
 * @param str An equation string, to be parsed by our lexer.
 * @return A set of all identifiers.
 */
export function identifierSet(str: string): common.StringSet {
	'use strict';

	let scanner = new Scanner(str);
	let result: common.StringSet = {};
	let commentDepth = 0;
	let tok: Token;
	while ((tok = scanner.getToken())) {
		if (tok.tok === '{') {
			commentDepth++;
		} else if (tok.tok === '}') {
			commentDepth--;
		} else if (commentDepth > 0) {
			// if inside of a {} delimited comment, skip the token
			continue;
		} else if (tok.type === TokenType.IDENT && !(tok.tok in common.builtins)) {
			result[tok.tok] = true;
		}
	}
	return result;
}
