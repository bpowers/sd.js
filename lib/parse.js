// Copyright 2013 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

define(['./ast', './lex'], function(ast, lex) {
    'use strict';

    function parse(eqn) {
        var p = new Parser(eqn);
        var ast = p.parse();
        if (p.errs.length)
            return [null, p.errs];
        return [ast, null];
    }

    function Parser(eqn) {
        this.lex = new lex.Scanner(eqn);
        this.levels = [
            binaryLevel(0, this, '^'),
            binaryLevel(1, this, '*/'),
            binaryLevel(2, this, '+-'),
            this.factor,
        ];
    }
    Parser.prototype.parse = function() {
        return null;
    };
    Parser.prototype.factor = function() {
        return null;
    };
    Parser.prototype.consumeAnyOf = function(ops) {
        var peek = p.lex.peek();
        if (!peek || peek.type !== lex.TOKEN)
            return;
        
    };

    function binaryLevel(n, p, ops) {
        return function() {
            if (!p.lex.peek())
                return null;
            var next = p.levels[n+1];
            var lhs = next();
            if (!lhs)
                return;
            var op;
            for (op = p.consumeAnyOf(ops); op; op = p.consumeAnyOf(ops)) {
                var rhs = next();
                if (!rhs)
                    return;
                lhs = ast.BinaryExpr(lhs, 0, op, rhs);
            }
            return lhs;
        };
    }

    return {
        'parse': parse
    };
});
