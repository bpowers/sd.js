// Copyright 2011 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

define(["./util"], function(util) {
    const variable = {};

    function varCompare(other) {
        return 0;
    }

    function stockCompare(other) {
        return 0;
    }

    function varDeps(other) {
        return [];
    }

    function stockDeps(other) {
        return [];
    }

    const Variable = function Variable(name, type, eqn, inflows, outflows) {
        this.eqnOrig = eqn;
        eqn = eqn.toLowerCase();
        this.name = name;
        this.type = type;
        if (type === 'stock') {
            this.compare = stockCompare;
            this.deps = stockDeps;
            this.initial = eqn;
            this.inflows = inflows;
            this.outflows = outflows;
        } else {
            this.compare = varCompare;
            this.deps = varDeps;
            this.eqn = eqn;
        }
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
        if (this.type === 'stock') {
            return '';
        } else {
            return this.eqn;
        }
    }
    variable.Variable = Variable;

    return variable;
});
