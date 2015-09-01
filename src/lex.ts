// Copyright 2015 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.
'use strict';

import {builtins} from './common';
import {StringSet} from './type';
import {set} from './util';

// constants, sort of...
export const enum TokenType {
	TOKEN,
	IDENT,
	RESERVED,
	NUMBER,
}

const OP: {[n: string]: string} = {
	'not': '!',
	'and': '&',
	'or':  '|',
	'mod': '%',
};

// the idea is to use the scanner (& an eventual parser) to validate
// the equations, especially for the macros

// these are words reserved by SMILE
export const RESERVED = set('if', 'then', 'else');

function isWhitespace(ch: string): boolean {
	'use strict';
	return /\s/.test(ch);
}
function isNumberStart(ch: string): boolean {
	'use strict';
	return /[\d\.]/.test(ch);
}
// For use in isIdentifierStart.  See below.
function isOperator(ch: string): boolean {
	'use strict';
	return /[=><\[\]\(\)\^\+\-\*\/,]/.test(ch);
}
// It is the year 2015, but JS regex's don't support Unicode. The \w
// character class only matches Latin1.  Work around this by sort of
// fuzzing this test - instead of checking for \w, check that we're
// not an operator or number or space.  I think this should be ok, but
// I can also imagine it missing something important.
function isIdentifierStart(ch: string): boolean {
	'use strict';
	return !isNumberStart(ch) && !isWhitespace(ch) && (/[_\"]/.test(ch) || !isOperator(ch));
}

export class SourceLoc {
	line: number;
	pos: number;

	constructor(line: number, pos: number) {
		this.line = line;
		this.pos = pos;
	}

	off(n: number): SourceLoc {
		return new SourceLoc(this.line, this.pos+n);
	}
}

export class Token {
	tok: string;
	type: TokenType;
	startLoc: SourceLoc;
	endLoc: SourceLoc;

	constructor(tok: string, type: TokenType, startLoc?: SourceLoc, endLoc?: SourceLoc) {
		this.tok = tok;
		this.type = type;
		this.startLoc = startLoc;
		this.endLoc = endLoc;
	}

	get value(): number {
		if (this.type !== TokenType.NUMBER)
			return undefined;

		return parseFloat(this.tok);
	}
}

// TODO(bp) better errors
export class Lexer {
	text: string;
	orig: string; // keep original string for error diagnostics

	_len: number;
	_pos: number;
	_line: number;
	_lstart: number;

	_peek: string; // single rune
	_tpeek: Token; // next token

	constructor(text: string) {
		this.text = text.toLowerCase();
		this.orig = text;

		this._len = text.length;
		this._pos = 0;
		this._line = 0;
		this._lstart = 0;

		this._peek = this.text[0];
		this._tpeek = null;
	}

	peek(): Token {
		if (!this._tpeek)
			this._tpeek = this.nextTok();

		return this._tpeek;
	}

	_nextRune(): string {
		if (this._pos < this._len - 1) {
			this._peek = this.text[this._pos+1];
		} else {
			this._peek = null;
		}
		this._pos++;

		return this._peek;
	}

	_skipWhitespace(): void {
		let inComment = false;
		do {
			if (this._peek === '\n') {
				this._line++;
				this._lstart = this._pos + 1;
			}
			if (inComment) {
				if (this._peek === '}')
					inComment = false;
				continue;
			}
			if (this._peek === '{') {
				inComment = true;
				continue;
			}
			if (!isWhitespace(this._peek))
				break;
		} while (this._nextRune() !== null);
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
		const quoted = this._peek === '"';

		let line = this._line;
		let pos = this._pos;

		if (quoted)
			this._nextRune();

		let r: string;
		while ((r = this._nextRune())) {
			if ((isIdentifierStart(r) && r !== '"') || /\d/.test(r))
				continue;
			if (quoted) {
				if (r === '"') {
					// eat closing "
					this._nextRune();
					break;
				}
				if (isWhitespace(r))
					continue;
			}
			break;
		}

		let len = this._pos - pos;
		let ident = this.text.substring(pos, pos+len);

		let type = TokenType.IDENT;

		if (ident in RESERVED) {
			type = TokenType.RESERVED;
		} else if (ident in OP) {
			type = TokenType.TOKEN;
			ident = OP[ident];
		}

		return new Token(ident, type, startPos, startPos.off(len));
	}

	_lexNumber(startPos: SourceLoc): Token {
		// we do a .toLowerCase before the string gets to here, so we
		// don't need to match for lower and upper cased 'e's.
		const numStr = /\d*(\.\d*)?(e(\d?(\.\d*)?)?)?/.exec(this.text.substring(this._pos))[0];
		const len = numStr.length;
		this._fastForward(len);
		return new Token(
			numStr, TokenType.NUMBER, startPos,
			new SourceLoc(startPos.line, startPos.pos + len));
	}

	nextTok(): Token {
		if (this._tpeek) {
			let tpeek = this._tpeek;
			this._tpeek = null;
			return this._tpeek;
		}

		this._skipWhitespace();
		let peek = this._peek;

		// at the end of the input, peek is null.
		if (peek === null || peek === undefined)
			return null;

		// keep track of the start of the token, relative to the start of
		// the current line.
		let start: number = this._pos - this._lstart;
		let startLoc = new SourceLoc(this._line, start);

		if (isNumberStart(peek))
			return this._lexNumber(startLoc);

		if (isIdentifierStart(peek))
			return this._lexIdentifier(startLoc);

		let pos = this._pos;
		let len = 1;

		// match two-char tokens; if its not a 2 char token return the
		// single char tok.
		switch (peek) {
		case '=':
			this._nextRune();
			if (this._peek === '=') {
				this._nextRune();
				len++;
			}
			break;
		case '<':
			this._nextRune();
			if (this._peek === '=' || this._peek === '>') {
				this._nextRune();
				len++;
			}
			break;
		case '>':
			this._nextRune();
			if (this._peek === '=') {
				this._nextRune();
				len++;
			}
			break;
		default:
			this._nextRune();
			break;
		}

		let op = this.text.substring(pos, pos+len);
		// replace common multi-run ops with single-rune
		// equivalents.
		switch (op) {
		case '>=':
			op = '≥';
			break;
		case '<=':
			op = '≤';
			break;
		case '<>':
			op = '≠';
			break;
		default:
			break;
		}

		return new Token(op, TokenType.TOKEN, startLoc, startLoc.off(len));
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
export function identifierSet(str: string): StringSet {
	'use strict';

	let lexer = new Lexer(str);
	let result: StringSet = {};
	let commentDepth = 0;
	let tok: Token;
	while ((tok = lexer.nextTok())) {
		if (tok.type === TokenType.IDENT && !(tok.tok in builtins)) {
			result[tok.tok] = true;
		}
	}
	return result;
}
