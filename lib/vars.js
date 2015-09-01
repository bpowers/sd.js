// Copyright 2015 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.
'use strict';
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var common = require('./common');
var util = require('./util');
var lex = require('./lex');
var Variable = (function () {
    function Variable(model, xmile) {
        if (arguments.length === 0)
            return;
        this.model = model;
        this.xmile = xmile;
        var eqn = '';
        if (xmile.eqn)
            eqn = xmile.eqn.toString().toLowerCase();
        this.eqn = eqn;
        this.name = util.eName(xmile['@name']);
        this._deps = lex.identifierSet(eqn);
    }
    ;
    Variable.prototype.initialEquation = function () {
        return this.eqn;
    };
    ;
    Variable.prototype.code = function (v) {
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
            }
            else if (tok.tok === '}') {
                commentDepth--;
            }
            else if (commentDepth > 0) {
                continue;
            }
            else if (tok.tok in common.reserved) {
                switch (tok.tok) {
                    case 'if':
                        break;
                    case 'then':
                        result.push('?');
                        break;
                    case 'else':
                        result.push(':');
                        break;
                    default:
                        console.log('ERROR: unexpected tok: ' + tok.tok);
                }
            }
            else if (tok.type !== 1) {
                result.push('' + tok.tok);
            }
            else if (tok.tok in common.builtins) {
                result.push('' + tok.tok);
                if (common.builtins[tok.tok].usesTime) {
                    scanner.getToken();
                    scope = this.model.name === 'main' ? 'curr' : 'globalCurr';
                    result.push('(', 'dt', ',', scope + '[0]', ',');
                }
            }
            else if (tok.tok in v) {
                result.push("curr[" + v[tok.tok] + "]");
            }
            else {
                result.push('globalCurr[this.ref["' + tok.tok + '"]]');
            }
        }
        if (!result.length) {
            result.push('0');
        }
        return result.join(' ');
    };
    Variable.prototype.getDeps = function () {
        if (this._allDeps)
            return this._allDeps;
        var allDeps = {};
        for (var n in this._deps) {
            if (n in allDeps)
                continue;
            allDeps[n] = true;
            var v = this.model.vars[n];
            if (!v)
                continue;
            var otherDeps = v.getDeps();
            for (var nn in otherDeps) {
                if (otherDeps.hasOwnProperty(nn))
                    allDeps[nn] = true;
            }
        }
        this._allDeps = allDeps;
        return allDeps;
    };
    Variable.prototype.lessThan = function (that) {
        return this.name in that.getDeps();
    };
    Variable.prototype.isConst = function () {
        return isFinite(this.eqn);
    };
    return Variable;
})();
exports.Variable = Variable;
var Stock = (function (_super) {
    __extends(Stock, _super);
    function Stock(model, xmile) {
        _super.call(this);
        this.model = model;
        this.xmile = xmile;
        var eqn = '';
        if (xmile.eqn)
            eqn = xmile.eqn.toString().toLowerCase();
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
        this.inflows = xmile.inflow.map(function (s) {
            return util.eName(s);
        });
        this.outflows = xmile.outflow.map(function (s) {
            return util.eName(s);
        });
        this._deps = lex.identifierSet(eqn);
    }
    Stock.prototype.initialEquation = function () {
        return this.initial;
    };
    Stock.prototype.code = function (v) {
        var eqn = "curr[" + v[this.name] + "] + (";
        if (this.inflows.length > 0)
            eqn += this.inflows.map(function (s) { return "curr[" + v[s] + "]"; }).join('+');
        if (this.outflows.length > 0)
            eqn += '- (' + this.outflows.map(function (s) { return "curr[" + v[s] + "]"; }).join('+') + ')';
        if (this.inflows.length === 0 && this.outflows.length === 0) {
            eqn += '0';
        }
        eqn += ')*dt';
        return eqn;
    };
    return Stock;
})(Variable);
exports.Stock = Stock;
var Table = (function (_super) {
    __extends(Table, _super);
    function Table(model, xmile) {
        _super.call(this);
        this.model = model;
        this.xmile = xmile;
        var eqn = '';
        if (eqn)
            eqn = xmile.eqn.toString().toLowerCase();
        this.eqn = eqn;
        this.name = util.eName(xmile['@name']);
        this.x = [];
        this.y = [];
        this.ok = true;
        if (!xmile.gf.ypts) {
            this.ok = false;
            return;
        }
        var ypts;
        var sep;
        if (typeof xmile.gf.ypts === 'object') {
            sep = xmile.gf.ypts['@sep'] || ',';
            ypts = util.numArr(xmile.gf.ypts.keyValue.split(sep));
        }
        else {
            ypts = util.numArr(xmile.gf.ypts.split(','));
        }
        var xpts = null;
        if (typeof xmile.gf.xpts === 'object') {
            sep = xmile.gf.xpts['@sep'] || ',';
            xpts = util.numArr(xmile.gf.xpts.keyValue.split(sep));
        }
        else if (xmile.gf.xpts) {
            xpts = util.numArr(xmile.gf.xpts.split(','));
        }
        var xscale = xmile.gf.xscale;
        var xmin = xscale ? xscale['@min'] : 0;
        var xmax = xscale ? xscale['@max'] : 0;
        for (var i = 0; i < ypts.length; i++) {
            var x = void 0;
            if (xpts) {
                x = xpts[i];
            }
            else {
                x = (i / (ypts.length - 1)) * (xmax - xmin) + xmin;
            }
            this.x.push(x);
            this.y.push(ypts[i]);
        }
        this._deps = lex.identifierSet(eqn);
    }
    Table.prototype.code = function (v) {
        if (!this.eqn)
            return null;
        var index = _super.prototype.code.call(this, v);
        return "lookup(this.tables['" + this.name + "'], " + index + ")";
    };
    return Table;
})(Variable);
exports.Table = Table;
var Module = (function (_super) {
    __extends(Module, _super);
    function Module(project, parent, xmile) {
        _super.call(this);
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
        for (var i = 0; i < xmile.connect.length; i++) {
            var ref = new Reference(xmile.connect[i]);
            this.refs[ref.name] = ref;
            this._deps[ref.ptr] = true;
        }
    }
    Module.prototype.getDeps = function () {
        if (this._allDeps)
            return this._allDeps;
        var allDeps = {};
        for (var n in this._deps) {
            if (!this._deps.hasOwnProperty(n))
                continue;
            if (n in allDeps)
                continue;
            var context_1 = void 0;
            if (n[0] === '.') {
                context_1 = this.project.model(this.project.main.modelName);
                n = n.substr(1);
            }
            else {
                context_1 = this.parent;
            }
            var parts = n.split('.');
            var v = context_1.lookup(n);
            if (!v) {
                console.log('couldnt find ' + n);
                continue;
            }
            if (!(v instanceof Stock))
                allDeps[parts[0]] = true;
            var otherDeps = v.getDeps();
            for (var nn in otherDeps) {
                if (otherDeps.hasOwnProperty(nn))
                    allDeps[nn] = true;
            }
        }
        this._allDeps = allDeps;
        return allDeps;
    };
    Module.prototype.referencedModels = function (all) {
        if (!all)
            all = {};
        var mdl = this.project.model(this.modelName);
        var name = mdl.name;
        if (all[name]) {
            all[name].modules.push(this);
        }
        else {
            all[name] = {
                model: mdl,
                modules: [this],
            };
        }
        for (var n in mdl.modules) {
            if (mdl.modules.hasOwnProperty(n))
                mdl.modules[n].referencedModels(all);
        }
        return all;
    };
    return Module;
})(Variable);
exports.Module = Module;
var Reference = (function (_super) {
    __extends(Reference, _super);
    function Reference(xmile) {
        _super.call(this);
        this.xmile = xmile;
        this.name = util.eName(xmile['@to']);
        this.ptr = util.eName(xmile['@from']);
    }
    Reference.prototype.code = function (v) {
        return 'curr["' + this.ptr + '"]';
    };
    Reference.prototype.lessThan = function (that) {
        return this.ptr in that.getDeps();
    };
    ;
    Reference.prototype.isConst = function () {
        return false;
    };
    return Reference;
})(Variable);
exports.Reference = Reference;
