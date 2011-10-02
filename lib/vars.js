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
        if (this.type === 'stock') {
            return this.initial;
        } else {
            return this.eqn;
        }
    }
    Variable.prototype.equation = function() {
        var eqn;
        if (this.type === 'stock') {
            eqn = this.initial + ',';
            if (this.inflows.length > 0)
                eqn += this.inflows.join(',');
            if (this.outflows.length > 0)
                eqn += '- (' + this.outflows.join(',') + ')';
        } else {
            return this.eqn;
        }
    }
    Variable.prototype.getDeps = function() {
        return this._deps;
    }
    Variable.prototype.compareTo = function(that) {
        ourDeps = this.getDeps();
        thierDeps = that.getDeps();
    }

    const Stock = function Stock(name, type, eqn, inflows, outflows) {
        this.eqnOrig = eqn;
        eqn = eqn.toLowerCase();
        this.name = name;
        this.type = type;
        this.initial = eqn;
        this.inflows = inflows;
        this.outflows = outflows;

        function addKeys(obj, arr) {
            var i;
            for (i = 0; i < arr.length; ++i) {
                obj[arr[i]] = true;
            }
        }

        // for a stock, the dependencies are any identifiers (that
        // aren't references to builtin functions) in the initial
        // variable string
        this._deps = lex.identifierSet(eqn);
        addKeys(this._deps, inflows);
        addKeys(this._deps, outflows);
    }
    Stock.prototype = new Variable();

    vars.Variable = Variable;
    vars.Stock = Stock;

    return vars;
});
