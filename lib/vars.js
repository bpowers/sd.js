// Copyright 2011 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

define(['util', 'common'], function(util, common) {
    const vars = {};

    const Variable = function Variable(name, type, eqn) {
        if (arguments.length === 0)
            return;

        this.eqnOrig = eqn;
        eqn = eqn.toLowerCase();
        this.name = name;
        this.type = type;
        this.eqn = eqn;
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
    Variable.prototype.getDeps = new function() {

    }
    Variable.prototype.compareTo = function(that) {
        ourDeps = this.getDeps();
        thierDeps = that.getDeps();
    }
    vars.Variable = Variable;

    const Stock = function Stock(name, type, eqn, inflows, outflows) {
        this.eqnOrig = eqn;
        eqn = eqn.toLowerCase();
        this.name = name;
        this.type = type;
        this.initial = eqn;
        this.inflows = inflows;
        this.outflows = outflows;
    }
    Stock.prototype = new Variable();
    vars.Stock = Stock;

    return vars;
});
