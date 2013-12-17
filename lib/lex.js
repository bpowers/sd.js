// Copyright 2013 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

define(['./common', './util'], function(common, util) {
    'use strict';

    var lex = {};

    // constants, sort of...
    lex.TOKEN = 'token';
    lex.IDENT = 'word';
    lex.RESERVED = 'reserved';
    lex.NUMBER = 'number';

    // the idea is to use the scanner (& an eventual parser) to validate
    // the equations, especially for the macros

    // these are words reserved by SMILE
    var reservedWords = util.set('if', 'then', 'else');

    var isWhitespace = function isWhitespace(ch) {
        return (/\s/).test(ch);
    };
    var isNumberStart = function isNumberStart(ch) {
        return (/[\d\.]/).test(ch);
    };
    var isIdentifierStart = function isIdentifierStart(ch) {
        return (/[\w_]/).test(ch);
    };

    function Token(str, type, startLoc, endLoc) {
        this.tok = str;
        this.type = type;
        this.startLoc = startLoc;
        this.endLoc = endLoc;
    }

    function SourceLoc(line, pos) {
        this.line = line;
        this.pos = pos;
    }

    function Scanner(text) {
        this.textOrig = text;
        this.text = text.toLowerCase();
        this._len = text.length;
        this._pos = 0;
        this._peek = this.text[0];
        this._line = 0;
        this._lineStart = 0;
    }

    Scanner.prototype._getChar = function() {
        if (this._pos < this._len - 1) {
            this._pos += 1;
            this._peek = this.text[this._pos];
        } else {
            this._peek = null;
        }

        return this._peek;
    };
    Scanner.prototype._skipWhitespace = function() {
        do {
            if (this._peek === '\n') {
                this._line += 1;
                this._lineStart = this._pos + 1;
            }
            if (!isWhitespace(this._peek))
                break;
        } while (this._getChar() !== null);
    };
    Scanner.prototype._fastForward = function(num) {
        this._pos += num;
        if (this._pos < this._len) {
            this._peek = this.text[this._pos];
        } else {
            this._peek = null;
        }
    };
    Scanner.prototype._lexIdentifier = function(startPos) {
        var ident = /[\w_][\w\d_]*/.exec(this.text.substring(this._pos))[0];
        var len = ident.length;
        this._fastForward(len);
        var type;
        if (ident in reservedWords)
            type = lex.RESERVED;
        else
            type = lex.IDENT;
        return new Token(ident, type, startPos,
                         new SourceLoc(startPos.line, startPos.pos + len));
    };
    Scanner.prototype._lexNumber = function(startPos) {
        // we do a .toLowerCase before the string gets to here, so we
        // don't need to match for lower and upper cased 'e's.
        var numStr = /\d*(\.\d*)?(e(\d+(\.\d*)?)?)?/.exec(this.text.substring(this._pos))[0];
        var len = numStr.length;
        var num = parseFloat(numStr);
        this._fastForward(len);
        return new Token(num, lex.NUMBER, startPos,
                         new SourceLoc(startPos.line, startPos.pos + len));
    };
    Scanner.prototype.getToken = function() {
        this._skipWhitespace();
        var peek = this._peek;

        // at the end of the input, peek is null.
        if (peek === null || peek === undefined)
            return null;

        // keep track of the start of the token, relative to the start of
        // the current line.
        var start = this._pos - this._lineStart;
        var startLoc = new SourceLoc(this._line, start);

        // match two-char tokens; if its not a 2 char token return the
        // single char tok.
        switch (peek) {
        case '=':
            this._getChar();
            if (this._peek === '=') {
                // eat the second '=', since we matched.
                this.getChar();
                return new Token('==', lex.TOKEN, startLoc,
                                 new SourceLoc(this._line, start + 2));
            } else {
                return new Token('=', lex.TOKEN, startLoc,
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

        return new Token(peek, lex.TOKEN, startLoc,
                         new SourceLoc(this._line, start + 1));
    };
    lex.Scanner = Scanner;


    /**
       For a given equation string, returns a set of the identifiers
       found.  Identifiers exclude keywords (such as 'if' and 'then')
       as well as builtin functions ('pulse', 'max', etc).

       @param str An equation string, to be parsed by our lexer.
       @return A set of all identifiers.
    */
    lex.identifierSet = function identifierSet(str) {
        var scanner = new lex.Scanner(str);
        var result = {};
        var commentDepth = 0;
        var tok;
        while ((tok = scanner.getToken())) {
            if (tok.tok === '{') {
                commentDepth++;
            } else if (tok.tok === '}') {
                commentDepth--;
            } else if (commentDepth > 0) {
                // if inside of a {} delimited comment, skip the token
                continue;
            } else if (tok.type === lex.IDENT && !(tok.tok in common.builtins)) {
                result[tok.tok] = true;
            }
        }
        return result;
    };

    return lex;
});
