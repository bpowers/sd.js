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
    if (p.errs)
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
            if (!rhs)
                return null;
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
            if (!lhs)
                return null;
            if (!this.consumeTok(')'))
                return null;
            return new ast_1.ParenExpr(new lex_1.SourceLoc(0, 0), lhs, new lex_1.SourceLoc(0, 0));
        }
        var op;
        if ((op = this.consumeAnyOf(UNARY))) {
        }
        return null;
    };
    Parser.prototype.consumeAnyOf = function (ops) {
        var peek = this.lexer.peek();
        if (!peek || peek.type !== 0)
            return;
        if (ops.indexOf(peek.tok) > -1)
            return this.lexer.nextTok();
        return;
    };
    Parser.prototype.consumeTok = function (s) {
        var t = this.lexer.peek();
        if (!t) {
            this.errs.push('expected "' + s + '", not end-of-equation.');
            return false;
        }
        else if (t.type !== 0) {
            this.errs.push('expected "' + s + '", not ' + t.type + '("' + t.tok + '").');
            return false;
        }
        else if (s !== t.tok) {
            this.errs.push('expected "' + s + '", not "' + t.tok + '".');
            return false;
        }
        this.lexer.nextTok();
        return true;
    };
    return Parser;
})();
