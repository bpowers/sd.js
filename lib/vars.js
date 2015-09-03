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
var lex = require('./lex');
var xmile = require('./xmile');
var opMap = {
    '&': '&&',
    '|': '||',
    '≥': '>=',
    '≤': '<=',
    '≠': '!==',
    '=': '===',
};
var Variable = (function () {
    function Variable(model, v) {
        if (arguments.length === 0)
            return;
        this.model = model;
        this.xmile = v;
        this.eqn = v.eqn;
        this.ident = v.ident;
        this._deps = lex.identifierSet(this.eqn);
    }
    ;
    Variable.prototype.initialEquation = function () {
        return this.eqn;
    };
    ;
    Variable.prototype.code = function (v) {
        if (this.isConst())
            return "this.initials['" + this.ident + "']";
        var lexer = new lex.Lexer(this.eqn);
        var result = [];
        var commentDepth = 0;
        var scope;
        var tok;
        while ((tok = lexer.nextTok())) {
            var ident = xmile.canonicalize(tok.tok);
            if (tok.tok in common.reserved) {
                switch (ident) {
                    case 'if':
                        break;
                    case 'then':
                        result.push('?');
                        break;
                    case 'else':
                        result.push(':');
                        break;
                    default:
                        console.log('ERROR: unexpected tok: ' + ident);
                }
            }
            else if (tok.type !== 1) {
                var op = tok.tok;
                if (op in opMap)
                    op = opMap[op];
                result.push('' + op);
            }
            else if (ident in common.builtins) {
                result.push('' + ident);
                if (common.builtins[ident].usesTime) {
                    lexer.nextTok();
                    scope = this.model.ident === 'main' ? 'curr' : 'globalCurr';
                    result.push('(', 'dt', ',', scope + '[0]', ',');
                }
            }
            else if (ident in v) {
                result.push("curr[" + v[ident] + "]");
            }
            else if (ident === 'time') {
                scope = this.model.ident === 'main' ? 'curr' : 'globalCurr';
                result.push(scope + '[0]');
            }
            else {
                result.push('globalCurr[this.ref["' + ident + '"]]');
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
        return this.ident in that.getDeps();
    };
    Variable.prototype.isConst = function () {
        return isFinite(this.eqn);
    };
    return Variable;
})();
exports.Variable = Variable;
var Stock = (function (_super) {
    __extends(Stock, _super);
    function Stock(model, v) {
        _super.call(this);
        this.model = model;
        this.xmile = v;
        this.ident = v.ident;
        this.initial = v.eqn;
        this.eqn = v.eqn;
        this.inflows = v.inflows;
        this.outflows = v.outflows;
        this._deps = lex.identifierSet(this.initial);
    }
    Stock.prototype.initialEquation = function () {
        return this.initial;
    };
    Stock.prototype.code = function (v) {
        var eqn = "curr[" + v[this.ident] + "] + (";
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
    function Table(model, v) {
        _super.call(this);
        this.x = [];
        this.y = [];
        this.ok = true;
        this.model = model;
        this.xmile = v;
        this.eqn = v.eqn;
        this.ident = v.ident;
        var ypts = v.gf.yPoints;
        var xpts = v.gf.xPoints;
        var xscale = v.gf.xScale;
        var xmin = xscale ? xscale.min : 0;
        var xmax = xscale ? xscale.max : 0;
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
        this._deps = lex.identifierSet(this.eqn);
    }
    Table.prototype.code = function (v) {
        if (!this.eqn)
            return null;
        var index = _super.prototype.code.call(this, v);
        return "lookup(this.tables['" + this.ident + "'], " + index + ")";
    };
    return Table;
})(Variable);
exports.Table = Table;
var Module = (function (_super) {
    __extends(Module, _super);
    function Module(project, parent, v) {
        _super.call(this);
        this.project = project;
        this.parent = parent;
        this.xmile = v;
        this.ident = v.ident;
        this.modelName = this.ident;
        this.refs = {};
        this._deps = {};
        for (var i = 0; i < v.connections.length; i++) {
            var ref = new Reference(v.connections[i]);
            this.refs[ref.ident] = ref;
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
    function Reference(conn) {
        _super.call(this);
        this.xmile = null;
        this.xmileConn = conn;
        this.ident = conn.to;
        this.ptr = conn.from;
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
