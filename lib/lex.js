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
        this.len = text.length;
        this.pos = 0;
        this.line = 0;
        this.lstart = 0;
        this.rpeek = this.text[0];
        this.tpeek = null;
    }
    Lexer.prototype.peek = function () {
        if (!this.tpeek)
            this.tpeek = this.nextTok();
        return this.tpeek;
    };
    Lexer.prototype.nextTok = function () {
        if (this.tpeek) {
            var tpeek = this.tpeek;
            this.tpeek = null;
            return this.tpeek;
        }
        this.skipWhitespace();
        var peek = this.rpeek;
        if (peek === null || peek === undefined)
            return null;
        var start = this.pos - this.lstart;
        var startLoc = new SourceLoc(this.line, start);
        if (isNumberStart(peek))
            return this.lexNumber(startLoc);
        if (isIdentifierStart(peek))
            return this.lexIdentifier(startLoc);
        var pos = this.pos;
        var len = 1;
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
    Lexer.prototype.nextRune = function () {
        if (this.pos < this.len - 1) {
            this.rpeek = this.text[this.pos + 1];
        }
        else {
            this.rpeek = null;
        }
        this.pos++;
        return this.rpeek;
    };
    Lexer.prototype.skipWhitespace = function () {
        var inComment = false;
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
    };
    Lexer.prototype.fastForward = function (num) {
        this.pos += num;
        if (this.pos < this.len) {
            this.rpeek = this.text[this.pos];
        }
        else {
            this.rpeek = null;
        }
    };
    Lexer.prototype.lexIdentifier = function (startPos) {
        var quoted = this.rpeek === '"';
        var line = this.line;
        var pos = this.pos;
        if (quoted)
            this.nextRune();
        var r;
        while ((r = this.nextRune())) {
            if ((isIdentifierStart(r) && r !== '"') || /\d/.test(r))
                continue;
            if (quoted) {
                if (r === '"') {
                    this.nextRune();
                    break;
                }
                if (isWhitespace(r))
                    continue;
            }
            break;
        }
        var len = this.pos - pos;
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
    Lexer.prototype.lexNumber = function (startPos) {
        var numStr = /\d*(\.\d*)?(e(\d?(\.\d*)?)?)?/.exec(this.text.substring(this.pos))[0];
        var len = numStr.length;
        this.fastForward(len);
        return new Token(numStr, 3, startPos, new SourceLoc(startPos.line, startPos.pos + len));
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
        if (tok.type === 1 && !(tok.tok in common_1.builtins)) {
            result[tok.tok] = true;
        }
    }
    return result;
}
exports.identifierSet = identifierSet;
