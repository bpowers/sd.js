// Copyright 2015 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.
'use strict';

import {builtins} from './common';
import {StringSet} from './type';
import {exists, set} from './util';

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

function isWhitespace(ch: string | null): boolean {
	'use strict';
	if (ch === null)
		return false;
	return /\s/.test(ch);
}
function isNumberStart(ch: string | null): boolean {
	'use strict';
	if (ch === null)
		return false;
	return /[\d\.]/.test(ch);
}
// For use in isIdentifierStart.  See below.
function isOperator(ch: string | null): boolean {
	'use strict';
	if (ch === null)
		return false;
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
	constructor(
		public line: number,
		public pos: number) {}

	off(n: number): SourceLoc {
		return new SourceLoc(this.line, this.pos+n);
	}
}

export class Token {
	constructor(
		public tok: string,
		public type: TokenType,
		public startLoc?: SourceLoc,
		public endLoc?: SourceLoc) {}

	get value(): number {
		if (this.type !== TokenType.NUMBER)
			throw 'Token.value called for non-number: ' + this.type;

		return parseFloat(this.tok);
	}
}

// TODO(bp) better errors
export class Lexer {
	text: string;
	orig: string; // keep original string for error diagnostics

	private len: number;
	private pos: number;
	private line: number;
	private lstart: number;

	private rpeek: string | null; // single rune
	private tpeek: Token | null; // next token

	constructor(text: string) {
		this.text = text.toLowerCase();
		this.orig = text;

		this.len = text.length;
		this.pos = 0;
		this.line = 0;
		this.lstart = 0;

		this.rpeek = this.text[0];
		this.tpeek = null;
	}

	peek(): Token | null {
		if (!this.tpeek)
			this.tpeek = this.nextTok();

		return this.tpeek;
	}

	nextTok(): Token | null {
		if (this.tpeek) {
			let tpeek = this.tpeek;
			this.tpeek = null;
			return tpeek;
		}

		this.skipWhitespace();
		let peek = this.rpeek;

		// at the end of the input, peek is null.
		if (peek === null || peek === undefined)
			return null;

		// keep track of the start of the token, relative to the start of
		// the current line.
		let start: number = this.pos - this.lstart;
		let startLoc = new SourceLoc(this.line, start);

		if (isNumberStart(peek))
			return this.lexNumber(startLoc);

		if (isIdentifierStart(peek))
			return this.lexIdentifier(startLoc);

		let pos = this.pos;
		let len = 1;

		// match two-char tokens; if its not a 2 char token return the
		// single char tok.
		switch (peek) {
		case '=':
			this.nextRune();
			if (this.rpeek === '=') {
				this.nextRune();
				len++;
			}
			break;
		case '<':
			this.nextRune();
			if (this.rpeek === '=' || this.rpeek === '>') {
				this.nextRune();
				len++;
			}
			break;
		case '>':
			this.nextRune();
			if (this.rpeek === '=') {
				this.nextRune();
				len++;
			}
			break;
		default:
			this.nextRune();
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

	private nextRune(): string | null {
		if (this.pos < this.len - 1) {
			this.rpeek = this.text[this.pos+1];
		} else {
			this.rpeek = null;
		}
		this.pos++;

		return this.rpeek;
	}

	private skipWhitespace(): void {
		let inComment = false;
		do {
			if (this.rpeek === '\n') {
				this.line++;
				this.lstart = this.pos + 1;
			}
			if (inComment) {
				if (this.rpeek === '}')
					inComment = false;
				continue;
			}
			if (this.rpeek === '{') {
				inComment = true;
				continue;
			}
			if (!isWhitespace(this.rpeek))
				break;
		} while (this.nextRune() !== null);
	}

	private fastForward(num: number): void {
		this.pos += num;
		if (this.pos < this.len) {
			this.rpeek = this.text[this.pos];
		} else {
			this.rpeek = null;
		}
	}

	private lexIdentifier(startPos: SourceLoc): Token {
		const quoted = this.rpeek === '"';

		let line = this.line;
		let pos = this.pos;

		if (quoted)
			this.nextRune();

		let r: string | null;
		while ((r = this.nextRune())) {
			if (r === null)
				break;
			if ((isIdentifierStart(r) && r !== '"') || /\d/.test(r))
				continue;
			if (quoted) {
				if (r === '"') {
					// eat closing "
					this.nextRune();
					break;
				}
				if (isWhitespace(r))
					continue;
			}
			break;
		}

		let len = this.pos - pos;
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

	private lexNumber(startPos: SourceLoc): Token {
		// we do a .toLowerCase before the string gets to here, so we
		// don't need to match for lower and upper cased 'e's.
		const numStr = exists(/\d*(\.\d*)?(e(\d?(\.\d*)?)?)?/.exec(this.text.substring(this.pos)))[0];
		const len = numStr.length;
		this.fastForward(len);
		return new Token(
			numStr, TokenType.NUMBER, startPos,
			new SourceLoc(startPos.line, startPos.pos + len));
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
	for (let tok = lexer.nextTok(); tok !== null; tok = lexer.nextTok()) {
		if (tok.type === TokenType.IDENT && !(tok.tok in builtins)) {
			result[tok.tok] = true;
		}
	}
	return result;
}
