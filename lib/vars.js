// Copyright 2011 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

define(['./util', './common', './lex'], function(util, common, lex) {
    'use strict';

    var Variable = function Variable(model, xmile) {
        // for subclasses, when instantiated for their prototypes
        if (arguments.length === 0)
            return;

        this.model = model;
        this.xmile = xmile;
        var eqn = xmile.eqn.toString().toLowerCase();
        this.eqn = eqn;
        this.name = util.eName(xmile['@name']);

        // for a flow or aux, we depend on variables that aren't built
        // in functions in the equation.
        this._deps = lex.identifierSet(eqn);
    };
    // returns a string of this variables initial equation. suitable for
    // exec()'ing
    Variable.prototype.initialEquation = function() {
        return this.eqn;
    };
    Variable.prototype.code = function(v) {
        if (this.isConst())
            return "this.initials['" + util.eName(this.name) + "']";
        var scanner = new lex.Scanner(this.eqn);
        var result = [];
        var commentDepth = 0;
        var scope;
        var tok;
        while ((tok = scanner.getToken())) {
            if (tok.tok === '{') {
                commentDepth++;
            } else if (tok.tok === '}') {
                commentDepth--;
            } else if (commentDepth > 0) {
                // if inside of a {} delimited comment, skip the token
                continue;
            } else if (tok.tok in common.reserved) {
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
            } else if (tok.type !== lex.IDENT) {
                result.push(tok.tok);
            } else if (tok.tok in common.builtins) {
                result.push(tok.tok);
                if (common.builtins[tok.tok].usesTime) {
                    scanner.getToken(); // is '('
                    scope = this.model.name === 'main' ? 'curr' : 'globalCurr';
                    result.push('(', 'dt', ',', scope + '[0]', ',');
                }
            } else if (tok.tok in v){
                result.push("curr[" + v[tok.tok] + "]");
            } else {
                result.push('globalCurr[this.ref["' + tok.tok + '"]]')
            }
        }
        if (!result.length) {
            //console.log('COMPAT empty equation for ' + this.name);
            result.push('0');
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
        return isFinite(this.eqn);
    };


    var Stock = function Stock(model, xmile) {
        this.model = model;
        this.xmile = xmile;
        var eqn = xmile.eqn.toString().toLowerCase();
        this.name = util.eName(xmile['@name']);
        this.initial = eqn;
        this.eqn = eqn;
        if (!xmile.inflow)
            xmile.inflow = [];
        if (!(xmile.inflow instanceof Array))
            xmile.inflow = [xmile.inflow];
        if (!xmile.outflow)
            xmile.outflow = [];
        if (!(xmile.outflow instanceof Array))
            xmile.outflow = [xmile.outflow];
        this.inflows = xmile.inflow;
        this.outflows = xmile.outflow;

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
    Stock.prototype.code = function(v) {
        var eqn = "curr[" + v[this.name] + "] + (";
        if (this.inflows.length > 0)
            eqn += this.inflows.map(function(s) {return "curr[" + v[s] + "]";}).join('+');
        if (this.outflows.length > 0)
            eqn += '- (' + this.outflows.map(function(s) {return "curr[" + v[s] + "]";}).join('+') + ')';
        // stocks can have no inflows or outflows and still be valid
        if (this.inflows.length === 0 && this.outflows.length === 0) {
            eqn += '0';
        }
        eqn += ')*dt';
        return eqn;
    };

    var Table = function Table(model, xmile) {
        this.model = model;
        this.xmile = xmile;
        var eqn = xmile.eqn.toString().toLowerCase();
        this.eqn = eqn;
        this.name = util.eName(xmile['@name']);
        this.x = [];
        this.y = [];

        var ypts, sep;
        if (typeof xmile.gf.ypts === 'object') {
            sep = xmile.gf.ypts['@sep'] || ',';
            ypts = util.numArr(xmile.gf.ypts.keyValue.split(sep));
        } else {
            ypts = util.numArr(xmile.gf.ypts.split(','));
        }

        // FIXME(bp) unit test
        var xpts = null;
        if (typeof xmile.gf.xpts === 'object') {
            sep = xmile.gf.xpts['@sep'] || ',';
            xpts = util.numArr(xmile.gf.xpts.keyValue.split(sep));
        } else if (xmile.gf.xpts) {
            xpts = util.numArr(xmile.gf.xpts.split(','));
        }

        var xscale = xmile.gf.xscale;
        var xmin = xscale['@min'];
        var xmax = xscale['@max'];

        var i = 0, x = 0;
        for (i = 0; i < ypts.length; i++) {
            // either the x points have been explicitly specified, or
            // it is a linear mapping of points between xmin and xmax,
            // inclusive
            if (xpts)
                x = xpts[i];
            else
                x = (i/(ypts.length-1))*(xmax-xmin) + xmin;
            this.x.push(x);
            this.y.push(ypts[i]);
        }

        this._deps = lex.identifierSet(eqn);
    };
    Table.prototype = new Variable();
    Table.prototype.code = function() {
        if (!this.eqn)
            return null;
        var index = Variable.prototype.code.apply(this, arguments);
        return "lookup(this.tables['" + this.name + "'], " + index + ")";
    };

    var Module = function Module(project, parent, xmile) {
        this.project = project;
        this.parent = parent;
        this.xmile = xmile;
        this.name = util.eName(xmile['@name']);
        this.modelName = this.name;
        if (!xmile.connect)
            xmile.connect = [];
        if (!(xmile.connect instanceof Array))
            xmile.connect = [xmile.connect];
        this.refs = {};
        this._deps = {};
        var i, conn, ref;
        for (i = 0; i < xmile.connect.length; i++) {
            ref = new Reference(xmile.connect[i]);
            this.refs[ref.name] = ref;
            this._deps[ref.ptr] = true;
        }
    };
    Module.prototype = new Variable();
    Module.prototype.getDeps = function() {
        if (this._allDeps)
            return this._allDeps;
        var allDeps = {};
        var v, n, nn, otherDeps, context, parts;
        for (n in this._deps) {
            if (n in allDeps)
                continue;
            if (n[0] === '.') {
                context = this.project.model(this.project.main.modelName);
                n = n.substr(1);
            } else {
                context = this.parent;
            }
            parts = n.split('.');
            v = context.lookup(n);
            if (!v) {
                console.log('couldnt find ' + n);
                continue;
            }
            if (!(v instanceof Stock))
                allDeps[parts[0]] = true;
            otherDeps = v.getDeps();
            for (nn in otherDeps)
                allDeps[nn] = true;
        }
        this._allDeps = allDeps;
        return allDeps;
    };
    Module.prototype.referencedModels = function(all) {
        if (!all)
            all = {};
        var mdl = this.project.model(this.modelName);
        var name = mdl.name;
        if (all[name]) {
            all[name].modules.push(this);
        } else {
            all[name] = {
                model:   mdl,
                modules: [this],
            };
        }
        var n;
        for (n in mdl.modules)
            mdl.modules[n].referencedModels(all);
        return all;
    };

    var Reference = function Reference(xmile) {
        this.xmile = xmile
        this.name = util.eName(xmile['@to']);
        this.ptr = util.eName(xmile['@from']);
    };
    Reference.prototype = new Variable();
    Reference.prototype.code = function() {
        return 'curr["' + this.ptr + '"]';
    };
    Reference.prototype.lessThan = function(that) {
        return this.ptr in that.getDeps();
    };
    Reference.prototype.isConst = function() {
        // FIXME(bp) should actually lookup whether this.ptr is const,
        // but that requires module instance walking in Model which I
        // don't want to implement yet.
        return false;
    };

    return {
        'Variable': Variable,
        'Stock': Stock,
        'Table': Table,
        'Module': Module,
        'Reference': Reference,
    };
});
