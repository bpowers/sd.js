// Copyright 2011 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

define(['./util', './common', './lex'], function(util, common, lex) {
    'use strict';

    var isOnlyNumber = function isOnlyNumber(n) {
        var m = n.match(/^-?\d*(\.\d+)?([eE]\d*(\.\d+)?)?$/);
        return m && m[0].length === n.length;
    };

    var Variable = function Variable(model, name, type, eqn) {
        // for subclasses, when instantiated for their prototypes
        if (arguments.length === 0)
            return;

        this.model = model;
        this.eqnOrig = eqn;
        eqn = eqn.toLowerCase();
        this.name = util.eName(name);
        this.type = type;
        this.eqn = eqn;

        // for a flow or aux, we depend on variables that aren't built
        // in functions in the equation.
        this._deps = lex.identifierSet(eqn);
    };
    // returns a string of this variables initial equation. suitable for
    // exec()'ing
    Variable.prototype.initialEquation = function() {
        return this.eqn;
    };
    Variable.prototype.equation = function(v) {
        if (this.isConst())
            return "this.initials['" + util.eName(this.name) + "']";
        var scanner = new lex.Scanner(this.eqn);
        var result = [];
        var tok;
        while ((tok = scanner.getToken())) {
            if (tok.tok in common.reserved) {
                switch (tok.tok) {
                case 'if':
                    break; // skip
                case 'then':
                    result.push('?');
                    break;
                case 'else':
                    result.push(':');
                    break;
                }
            } else if (tok.type !== lex.IDENT || tok.tok in common.builtins) {
                result.push(tok.tok);
            } else {
                result.push("this.curr[" + v[tok.tok] + "]");
            }
        }
        return result.join(' ');
    };
    Variable.prototype.getDeps = function() {
        if (this._allDeps)
            return this._allDeps;
        var allDeps = {};
        var v, n, nn, otherDeps;
        for (n in this._deps) {
            if (n in allDeps)
                continue;
            allDeps[n] = true;
            v = this.model.vars[n];
            if (!v)
                continue;
            otherDeps = v.getDeps();
            for (nn in otherDeps)
                allDeps[nn] = true;
        }
        this._allDeps = allDeps;
        return allDeps;
    };
    Variable.prototype.lessThan = function(that) {
        return this.name in that.getDeps();
    };
    Variable.prototype.isConst = function() {
        return isOnlyNumber(this.eqn);
    };


    var Stock = function Stock(model, name, type, eqn, inflows, outflows) {
        this.model = model;
        this.eqnOrig = eqn;
        eqn = eqn.toLowerCase();
        this.name = util.eName(name);
        this.type = type;
        this.initial = eqn;
        this.eqn = eqn;
        this.inflows = inflows;
        this.outflows = outflows;

        // for a stock, the dependencies are any identifiers (that
        // aren't references to builtin functions) in the initial
        // variable string.  Deps are used for sorting equations into
        // the right order, so for now we don't add any of the flows.
        this._deps = lex.identifierSet(eqn);
    };
    Stock.prototype = new Variable();
    // returns a string of this variables initial equation. suitable for
    // exec()'ing
    Stock.prototype.initialEquation = function() {
        return this.initial;
    };
    Stock.prototype.equation = function(v) {
        var eqn;
        eqn = "this.curr[" + v[this.name] + "] + (";
        if (this.inflows.length > 0)
            eqn += this.inflows.map(function(s) {return "this.curr[" + v[s] + "]";}).join('+');
        if (this.outflows.length > 0)
            eqn += '- (' + this.outflows.map(function(s) {return "this.curr[" + v[s] + "]";}).join('+') + ')';
        eqn += ')*dt';
        return eqn;
    };
    Stock.prototype.isConst = function() {
        return false;
    };

    var Table = function Table(model, name, eqn, gf) {
        this.model = model;
        this.eqnOrig = eqn;
        eqn = eqn.toLowerCase();
        this.eqn = eqn;
        this.name = util.eName(name);
        this.type = 'table';
        this.x = [];
        this.y = [];

        var floatAttr = util.floatAttr;

        var xypts = gf.getElementsByTagName('ypts')[0];
        var sep  = xypts.getAttribute('sep') || ',';
        var ypts = util.numArr(xypts.textContent.trim().split(sep));

        var xscale = gf.getElementsByTagName('xscale')[0];
        var xmin = floatAttr(xscale, 'min');
        var xmax = floatAttr(xscale, 'max');

        var i;
        for (i = 0; i < ypts.length; i++) {
            // linear mapping of points between xmin and xmax,
            // inclusive
            var x = (i/(ypts.length-1))*(xmax-xmin) + xmin;
            this.x.push(x);
            this.y.push(ypts[i]);
        }

        this._deps = lex.identifierSet(eqn);
    };
    Table.prototype = new Variable();
    Table.prototype.equation = function() {
        if (!this.eqn)
            return null;
        var index = Variable.prototype.equation.apply(this, arguments);
        return "lookup(this.tables['" + this.name + "'], " + index + ")";
    };

    return {
        'Variable': Variable,
        'Stock': Stock,
        'Table': Table
    };
});
