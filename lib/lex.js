'use strict';
var common_1 = require('./common');
var util_1 = require('./util');
var OP = {
    'not': '!',
    'and': '&',
    'or': '|',
    'mod': '%',
};
exports.RESERVED = util_1.set('if', 'then', 'else');
function isWhitespace(ch) {
    'use strict';
    return /\s/.test(ch);
}
function isNumberStart(ch) {
    'use strict';
    return /[\d\.]/.test(ch);
}
function isOperator(ch) {
    'use strict';
    return /[=><\[\]\(\)\^\+\-\*\/,]/.test(ch);
}
function isIdentifierStart(ch) {
    'use strict';
    return !isNumberStart(ch) && !isWhitespace(ch) && (/[_\"]/.test(ch) || !isOperator(ch));
}
var SourceLoc = (function () {
    function SourceLoc(line, pos) {
        this.line = line;
        this.pos = pos;
    }
    SourceLoc.prototype.off = function (n) {
        return new SourceLoc(this.line, this.pos + n);
    };
    return SourceLoc;
})();
exports.SourceLoc = SourceLoc;
var Token = (function () {
    function Token(tok, type, startLoc, endLoc) {
        this.tok = tok;
        this.type = type;
        this.startLoc = startLoc;
        this.endLoc = endLoc;
    }
    Object.defineProperty(Token.prototype, "value", {
        get: function () {
            if (this.type !== 3)
                return undefined;
            return parseFloat(this.tok);
        },
        enumerable: true,
        configurable: true
    });
    return Token;
})();
exports.Token = Token;
var Lexer = (function () {
    function Lexer(text) {
        this.text = text.toLowerCase();
        this.orig = text;
        this._len = text.length;
        this._pos = 0;
        this._line = 0;
        this._lstart = 0;
        this._peek = this.text[0];
        this._tpeek = null;
    }
    Lexer.prototype.peek = function () {
        if (!this._tpeek)
            this._tpeek = this.nextTok();
        return this._tpeek;
    };
    Lexer.prototype._nextRune = function () {
        if (this._pos < this._len - 1) {
            this._peek = this.text[this._pos + 1];
        }
        else {
            this._peek = null;
        }
        this._pos++;
        return this._peek;
    };
    Lexer.prototype._skipWhitespace = function () {
        var inComment = false;
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
    };
    Lexer.prototype._fastForward = function (num) {
        this._pos += num;
        if (this._pos < this._len) {
            this._peek = this.text[this._pos];
        }
        else {
            this._peek = null;
        }
    };
    Lexer.prototype._lexIdentifier = function (startPos) {
        var quoted = this._peek === '"';
        var line = this._line;
        var pos = this._pos;
        if (quoted)
            this._nextRune();
        var r;
        while ((r = this._nextRune())) {
            if ((isIdentifierStart(r) && r !== '"') || /\d/.test(r))
                continue;
            if (quoted) {
                if (r === '"') {
                    this._nextRune();
                    break;
                }
                if (isWhitespace(r))
                    continue;
            }
            break;
        }
        var len = this._pos - pos;
        var ident = this.text.substring(pos, pos + len);
        var type = 1;
        if (ident in exports.RESERVED) {
            type = 2;
        }
        else if (ident in OP) {
            type = 0;
            ident = OP[ident];
        }
        return new Token(ident, type, startPos, startPos.off(len));
    };
    Lexer.prototype._lexNumber = function (startPos) {
        var numStr = /\d*(\.\d*)?(e(\d?(\.\d*)?)?)?/.exec(this.text.substring(this._pos))[0];
        var len = numStr.length;
        this._fastForward(len);
        return new Token(numStr, 3, startPos, new SourceLoc(startPos.line, startPos.pos + len));
    };
    Lexer.prototype.nextTok = function () {
        if (this._tpeek) {
            var tpeek = this._tpeek;
            this._tpeek = null;
            return this._tpeek;
        }
        this._skipWhitespace();
        var peek = this._peek;
        if (peek === null || peek === undefined)
            return null;
        var start = this._pos - this._lstart;
        var startLoc = new SourceLoc(this._line, start);
        if (isNumberStart(peek))
            return this._lexNumber(startLoc);
        if (isIdentifierStart(peek))
            return this._lexIdentifier(startLoc);
        var pos = this._pos;
        var len = 1;
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
        var op = this.text.substring(pos, pos + len);
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
        return new Token(op, 0, startLoc, startLoc.off(len));
    };
    return Lexer;
})();
exports.Lexer = Lexer;
function identifierSet(str) {
    'use strict';
    var lexer = new Lexer(str);
    var result = {};
    var commentDepth = 0;
    var tok;
    while ((tok = lexer.nextTok())) {
        if (tok.tok === '{') {
            commentDepth++;
        }
        else if (tok.tok === '}') {
            commentDepth--;
        }
        else if (commentDepth > 0) {
            continue;
        }
        else if (tok.type === 1 && !(tok.tok in common_1.builtins)) {
            result[tok.tok] = true;
        }
    }
    return result;
}
exports.identifierSet = identifierSet;
