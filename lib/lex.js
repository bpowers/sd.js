'use strict';
var common_1 = require('./common');
var util_1 = require('./util');
exports.reservedWords = util_1.set('if', 'then', 'else');
function isWhitespace(ch) {
    'use strict';
    return (/\s/).test(ch);
}
function isNumberStart(ch) {
    'use strict';
    return (/[\d\.]/).test(ch);
}
function isIdentifierStart(ch) {
    'use strict';
    return (/[\w_]/).test(ch);
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
var Scanner = (function () {
    function Scanner(text) {
        this.textOrig = text;
        this.text = text.toLowerCase();
        this._len = text.length;
        this._pos = 0;
        this._peek = this.text[0];
        this._line = 0;
        this._lineStart = 0;
    }
    Object.defineProperty(Scanner.prototype, "peek", {
        get: function () {
            return this.getToken();
        },
        enumerable: true,
        configurable: true
    });
    Scanner.prototype._getChar = function () {
        if (this._pos < this._len - 1) {
            this._pos += 1;
            this._peek = this.text[this._pos];
        }
        else {
            this._peek = null;
        }
        return this._peek;
    };
    Scanner.prototype._skipWhitespace = function () {
        do {
            if (this._peek === '\n') {
                this._line += 1;
                this._lineStart = this._pos + 1;
            }
            if (!isWhitespace(this._peek))
                break;
        } while (this._getChar() !== null);
    };
    Scanner.prototype._fastForward = function (num) {
        this._pos += num;
        if (this._pos < this._len) {
            this._peek = this.text[this._pos];
        }
        else {
            this._peek = null;
        }
    };
    Scanner.prototype._lexIdentifier = function (startPos) {
        var ident = /[\w_][\w\d_]*/.exec(this.text.substring(this._pos))[0];
        var len = ident.length;
        this._fastForward(len);
        var type;
        if (ident in exports.reservedWords) {
            type = 2;
        }
        else {
            type = 1;
        }
        return new Token(ident, type, startPos, new SourceLoc(startPos.line, startPos.pos + len));
    };
    Scanner.prototype._lexNumber = function (startPos) {
        var numStr = /\d*(\.\d*)?(e(\d+(\.\d*)?)?)?/.exec(this.text.substring(this._pos))[0];
        var len = numStr.length;
        this._fastForward(len);
        return new Token(numStr, 3, startPos, new SourceLoc(startPos.line, startPos.pos + len));
    };
    Scanner.prototype.getToken = function () {
        this._skipWhitespace();
        var peek = this._peek;
        if (peek === null || peek === undefined)
            return null;
        var start = this._pos - this._lineStart;
        var startLoc = new SourceLoc(this._line, start);
        switch (peek) {
            case '=':
                this._getChar();
                if (this._peek === '=') {
                    this._getChar();
                    return new Token('==', 0, startLoc, new SourceLoc(this._line, start + 2));
                }
                else {
                    return new Token('=', 0, startLoc, new SourceLoc(this._line, start + 1));
                }
                break;
            default:
                break;
        }
        if (isNumberStart(peek))
            return this._lexNumber(startLoc);
        if (isIdentifierStart(peek))
            return this._lexIdentifier(startLoc);
        this._getChar();
        return new Token(peek, 0, startLoc, new SourceLoc(this._line, start + 1));
    };
    return Scanner;
})();
exports.Scanner = Scanner;
function identifierSet(str) {
    'use strict';
    var scanner = new Scanner(str);
    var result = {};
    var commentDepth = 0;
    var tok;
    while ((tok = scanner.getToken())) {
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
//# sourceMappingURL=lex.js.map