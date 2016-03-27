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
        var pos;
        if ((pos = this.consumeTok('('))) {
            lhs = this.expr();
            if (!lhs) {
                this.errs.push('expected an expression after an opening paren');
                return null;
            }
            var closing;
            if (!(closing = this.consumeTok(')'))) {
                this.errs.push('expected ")", not end-of-equation');
                return null;
            }
            return new ast_1.ParenExpr(pos, lhs, closing);
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
        var ifLoc;
        if ((ifLoc = this.consumeReserved('if'))) {
            var cond = this.expr();
            if (!cond) {
                this.errs.push('expected an expr to follow "IF"');
                return null;
            }
            var thenLoc;
            if (!(thenLoc = this.consumeReserved('then'))) {
                this.errs.push('expected "THEN"');
                return null;
            }
            var t = this.expr();
            if (!t) {
                this.errs.push('expected an expr to follow "THEN"');
                return null;
            }
            var elseLoc;
            if (!(elseLoc = this.consumeReserved('else'))) {
                this.errs.push('expected "ELSE"');
                return null;
            }
            var f = this.expr();
            if (!f) {
                this.errs.push('expected an expr to follow "ELSE"');
                return null;
            }
            return new ast_1.IfExpr(ifLoc, cond, thenLoc, t, elseLoc, f);
        }
        if ((lhs = this.ident())) {
            var lParenLoc;
            if ((lParenLoc = this.consumeTok('(')))
                return this.call(lhs, lParenLoc);
            else
                return lhs;
        }
        return null;
    };
    Parser.prototype.consumeAnyOf = function (ops) {
        var peek = this.lexer.peek();
        if (!peek || peek.type !== 0)
            return null;
        for (var i = 0; i < ops.length; i++) {
            if (peek.tok === ops[i])
                return this.lexer.nextTok();
        }
        return null;
    };
    Parser.prototype.consumeTok = function (s) {
        var t = this.lexer.peek();
        if (!t || t.type !== 0 || t.tok !== s)
            return null;
        this.lexer.nextTok();
        return t.startLoc;
    };
    Parser.prototype.consumeReserved = function (s) {
        var t = this.lexer.peek();
        if (!t || t.type !== 2 || t.tok !== s)
            return null;
        this.lexer.nextTok();
        return t.startLoc;
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
    Parser.prototype.call = function (fn, lParenLoc) {
        var args = [];
        var rParenLoc;
        if ((rParenLoc = this.consumeTok(')')))
            return new ast_1.CallExpr(fn, lParenLoc, args, rParenLoc);
        while (true) {
            var arg = this.expr();
            if (!arg) {
                this.errs.push('expected expression as arg in function call');
                return null;
            }
            args.push(arg);
            if (this.consumeTok(','))
                continue;
            if ((rParenLoc = this.consumeTok(')')))
                break;
            this.errs.push('call: expected "," or ")"');
            return null;
        }
        return new ast_1.CallExpr(fn, lParenLoc, args, rParenLoc);
    };
    return Parser;
})();
