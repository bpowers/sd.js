// Copyright 2011 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

define(['./util', './common', './lex'], function(util, common, lex) {
    const vars = {};

    const isOnlyNumber = function(n) {
        var m = n.match(/^-?\d*(\.\d+)?([eE]\d*(\.\d+)?)?$/);
        return m && m[0].length === n.length;
    }

    const Variable = function Variable(model, name, type, eqn) {
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
    }
    // returns a string of this variables initial equation. suitable for
    // exec()'ing
    Variable.prototype.initialEquation = function() {
        return this.eqn;
    }
    Variable.prototype.equation = function(v) {
        if (this.isConst())
            return "this.initials['" + util.eName(this.name) + "']";
        const scanner = new lex.Scanner(this.eqn);
        const result = [];
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
                result.push("this.curr[" + v[tok.tok] + "]")
            }
        }
        return result.join(' ');
    }
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
    }
    Variable.prototype.lessThan = function(that) {
        return this.name in that.getDeps();
    }
    Variable.prototype.isConst = function() {
        return isOnlyNumber(this.eqn);
    }


    const Stock = function Stock(model, name, type, eqn, inflows, outflows) {
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
    }
    Stock.prototype = new Variable();
    // returns a string of this variables initial equation. suitable for
    // exec()'ing
    Stock.prototype.initialEquation = function() {
        return this.initial;
    }
    Stock.prototype.equation = function(v) {
        var eqn;
        eqn = "this.curr[" + v[this.name] + "] + (";
        if (this.inflows.length > 0)
            eqn += this.inflows.map(function(s) {return "this.curr[" + v[s] + "]";}).join('+');
        if (this.outflows.length > 0)
            eqn += '- (' + this.outflows.map(function(s) {return "this.curr[" + v[s] + "]";}).join('+') + ')';
        eqn += ')*dt';
        return eqn;
    }

    const Table = function Table(model, name, eqn, gf) {
        this.model = model;
        this.eqnOrig = eqn;
        eqn = eqn.toLowerCase();
        this.eqn = eqn;
        this.name = util.eName(name);
        this.type = 'table';
        this.x = [];
        this.y = [];

        const floatAttr = util.floatAttr;

        const xypts = gf.getElementsByTagName('ypts')[0];
        const sep  = xypts.getAttribute('sep') || ',';
        const ypts = util.numArr(xypts.textContent.trim().split(sep));

        const xscale = gf.getElementsByTagName('xscale')[0];
        const xmin = floatAttr(xscale, 'min');
        const xmax = floatAttr(xscale, 'max');

        var i;
        for (i = 0; i < ypts.length; i++) {
            // linear mapping of points between xmin and xmax,
            // inclusive
            var x = (i/(ypts.length-1))*(xmax-xmin) + xmin;
            this.x.push(x);
            this.y.push(ypts[i]);
        }

        this._deps = lex.identifierSet(eqn);
    }
    Table.prototype = new Variable();
    Table.prototype.equation = function(v) {
        if (!this.eqn)
            return null;
        var index = Variable.prototype.equation.apply(this, arguments);
        return "lookup(this.tables['" + this.name + "'], " + index + ")";
    }

    vars.Variable = Variable;
    vars.Stock = Stock;
    vars.Table = Table;

    return vars;
});
