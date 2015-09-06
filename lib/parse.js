// Copyright 2015 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.
'use strict';
var ast_1 = require('./ast');
var lex_1 = require('./lex');
var RESERVED = [
    "if",
    "then",
    "else"
];
var WORD_OPS = {
    "not": "!",
    "and": "&",
    "or": "|",
    "mod": "%"
};
var UNARY = "+-!";
var BINARY = [
    "^",
    "!",
    "*/%",
    "+-",
    "><≥≤",
    "=≠",
    "&",
    "|",
];
function eqn(eqn) {
    'use strict';
    var p = new Parser(eqn);
    var ast = p.expr();
    if (p.errs && p.errs.length)
        return [null, p.errs];
    return [ast, null];
}
exports.eqn = eqn;
function binaryLevel(n, p, ops) {
    'use strict';
    return function () {
        var t = p.lexer.peek();
        if (!t)
            return null;
        var next = p.levels[n + 1];
        var lhs = next();
        if (!lhs)
            return null;
        for (var op = p.consumeAnyOf(ops); op; op = p.consumeAnyOf(ops)) {
            var rhs = next();
            if (!rhs) {
                p.errs.push('expected rhs of expr after "' + op.tok + '"');
                return null;
            }
            lhs = new ast_1.BinaryExpr(lhs, op.startLoc, op.tok, rhs);
        }
        return lhs;
    };
}
var Parser = (function () {
    function Parser(eqn) {
        this.errs = [];
        this.levels = [];
        this.lexer = new lex_1.Lexer(eqn);
        for (var i = 0; i < BINARY.length; i++) {
            this.levels.push(binaryLevel(i, this, BINARY[i]));
        }
        this.levels.push(this.factor.bind(this));
    }
    Object.defineProperty(Parser.prototype, "errors", {
        get: function () {
            return this.errs;
        },
        enumerable: true,
        configurable: true
    });
    Parser.prototype.expr = function () {
        return this.levels[0]();
    };
    Parser.prototype.factor = function () {
        var lhs;
        if (this.consumeTok('(')) {
            lhs = this.expr();
            if (!lhs) {
                this.errs.push('expected an expression after an opening paren');
                return null;
            }
            if (!this.consumeTok(')')) {
                this.errs.push('expected ")", not end-of-equation');
                return null;
            }
            return new ast_1.ParenExpr(new lex_1.SourceLoc(0, 0), lhs, new lex_1.SourceLoc(0, 0));
        }
        var op;
        if ((op = this.consumeAnyOf(UNARY))) {
            lhs = this.expr();
            if (!lhs) {
                this.errs.push('unary operator "' + op.tok + '" without operand.');
                return null;
            }
            return new ast_1.UnaryExpr(op.startLoc, op.tok, lhs);
        }
        if ((lhs = this.num()))
            return lhs;
        if (this.consumeReserved('if')) {
            var cond = this.expr();
            if (!cond) {
                this.errs.push('expected an expr to follow "IF"');
                return null;
            }
            if (!this.consumeReserved('then')) {
                this.errs.push('expected "THEN"');
                return null;
            }
            var t = this.expr();
            if (!t) {
                this.errs.push('expected an expr to follow "THEN"');
                return null;
            }
            if (!this.consumeReserved('then')) {
                this.errs.push('expected "THEN"');
                return null;
            }
            var f = this.expr();
            if (!f) {
                this.errs.push('expected an expr to follow "ELSE"');
                return null;
            }
            var l = new lex_1.SourceLoc(0, 0);
            return new ast_1.IfExpr(l, cond, l, t, l, f);
        }
        if ((lhs = this.ident())) {
            if (this.consumeTok('('))
                return this.call(lhs);
            else
                return lhs;
        }
        return null;
    };
    Parser.prototype.consumeAnyOf = function (ops) {
        var peek = this.lexer.peek();
        if (!peek || peek.type !== 0)
            return null;
        if (ops.indexOf(peek.tok) > -1)
            return this.lexer.nextTok();
        return null;
    };
    Parser.prototype.consumeTok = function (s) {
        var t = this.lexer.peek();
        if (!t) {
            return false;
        }
        else if (t.type !== 0) {
            return false;
        }
        else if (s !== t.tok) {
            return false;
        }
        this.lexer.nextTok();
        return true;
    };
    Parser.prototype.consumeReserved = function (s) {
        var t = this.lexer.peek();
        if (!t || t.type !== 2 || t.tok !== s)
            return false;
        this.lexer.nextTok();
        return true;
    };
    Parser.prototype.num = function () {
        var t = this.lexer.peek();
        if (!t || t.type !== 3)
            return null;
        this.lexer.nextTok();
        return new ast_1.Constant(t.startLoc, t.tok);
    };
    Parser.prototype.ident = function () {
        var t = this.lexer.peek();
        if (!t || t.type !== 1)
            return null;
        this.lexer.nextTok();
        return new ast_1.Ident(t.startLoc, t.tok);
    };
    Parser.prototype.call = function (fn) {
        var args = [];
        var l = new lex_1.SourceLoc(0, 0);
        if (this.consumeTok(')'))
            return new ast_1.CallExpr(fn, l, args, l);
        while (true) {
            var arg = this.expr();
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
        return new ast_1.CallExpr(fn, l, args, l);
    };
    return Parser;
})();
