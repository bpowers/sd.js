// Copyright 2015 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.
'use strict';
var ast_1 = require('./ast');
var lex_1 = require('./lex');
function parse(eqn) {
    'use strict';
    var p = new Parser(eqn);
    var ast = p.parse();
    if (p.errs.length)
        return [null, p.errs];
    return [ast, null];
}
exports.parse = parse;
function binaryLevel(n, p, ops) {
    'use strict';
    return function () {
        if (!p.lexer.peek)
            return null;
        var next = p.levels[n + 1];
        var lhs = next();
        if (!lhs)
            return null;
        for (var op = p.consumeAnyOf(ops); op; op = p.consumeAnyOf(ops)) {
            var rhs = next();
            if (!rhs)
                return null;
            lhs = new ast_1.BinaryExpr(lhs, new lex_1.SourceLoc(0, 0), op.tok, rhs);
        }
        return lhs;
    };
}
var Parser = (function () {
    function Parser(eqn) {
        this.lexer = new lex_1.Lexer(eqn);
        this.levels = [
            binaryLevel(0, this, '^'),
            binaryLevel(1, this, '*/'),
            binaryLevel(2, this, '+-'),
            this.factor,
        ];
    }
    Parser.prototype.parse = function () {
        return this.levels[0]();
    };
    ;
    Parser.prototype.factor = function () {
        return null;
    };
    ;
    Parser.prototype.consumeAnyOf = function (ops) {
        var peek = this.lexer.peek;
        if (!peek || peek.type !== 0)
            return;
        if (ops.indexOf(peek.tok) > -1)
            return this.lexer.getToken();
        return;
    };
    ;
    return Parser;
})();
//# sourceMappingURL=parse.js.map