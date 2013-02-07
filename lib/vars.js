// Copyright 2011 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

define(['./util', './common', './lex'], function(util, common, lex) {
    const vars = {};


    const Variable = function Variable(name, type, eqn) {
        // for subclasses, when instantiated for their prototypes
        if (arguments.length === 0)
            return;

        this.eqnOrig = eqn;
        eqn = eqn.toLowerCase();
        this.name = name;
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
    Variable.prototype.equation = function() {
        return this.eqn;
    }
    Variable.prototype.getDeps = function() {
        return this._deps;
    }
    Variable.prototype.lessThan = function(that) {
        if (this.name in that.getDeps()) {
            return true;
        } else {
            return false;
        }
    }


    const Stock = function Stock(name, type, eqn, inflows, outflows) {
        this.eqnOrig = eqn;
        eqn = eqn.toLowerCase();
        this.name = name;
        this.type = type;
        this.initial = eqn;
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
    Stock.prototype.equation = function() {
        var eqn;
        eqn = this.initial + ',';
        if (this.inflows.length > 0)
            eqn += this.inflows.join(',');
        if (this.outflows.length > 0)
            eqn += '- (' + this.outflows.join(',') + ')';
    }


    const Table = function Table(name, eqn, gf) {
        this.eqnOrig = eqn;
        eqn = eqn.toLowerCase();
        this.name = name;
        this.type = 'table';
        this._deps = lex.identifierSet(eqn);
    }
    Table.prototype = new Variable();

    vars.Variable = Variable;
    vars.Stock = Stock;
    vars.Table = Table;

    return vars;
});
