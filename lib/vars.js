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
var lex_1 = require('./lex');
var parse = require('./parse');
var JS_OP = {
    '&': '&&',
    '|': '||',
    '≥': '>=',
    '≤': '<=',
    '≠': '!==',
    '=': '===',
};
var CodegenVisitor = (function () {
    function CodegenVisitor(offsets, isMain) {
        this.code = '';
        this.offsets = offsets;
        this.isMain = isMain;
        this.scope = isMain ? 'curr' : 'globalCurr';
    }
    CodegenVisitor.prototype.ident = function (n) {
        if (n.ident === 'time')
            this.refTime();
        else if (n.ident in this.offsets)
            this.refDirect(n.ident);
        else
            this.refIndirect(n.ident);
        return true;
    };
    CodegenVisitor.prototype.constant = function (n) {
        this.code += ('' + n.value);
        return true;
    };
    CodegenVisitor.prototype.call = function (n) {
        if (!n.fun.hasOwnProperty('ident')) {
            console.log('// for now, only idents can be used as fns.');
            console.log(n);
            return false;
        }
        var fn = n.fun.ident;
        if (!(fn in common.builtins)) {
            console.log('// unknown builtin: ' + fn);
            return false;
        }
        this.code += fn;
        this.code += '(';
        if (common.builtins[fn].usesTime) {
            this.code += 'dt, ';
            this.refTime();
            if (n.args.length)
                this.code += ', ';
        }
        for (var i = 0; i < n.args.length; i++) {
            n.args[i].walk(this);
            if (i !== n.args.length - 1)
                this.code += ', ';
        }
        this.code += ')';
        return true;
    };
    CodegenVisitor.prototype.if = function (n) {
        this.code += '(';
        n.cond.walk(this);
        this.code += ' ? ';
        n.t.walk(this);
        this.code += ' : ';
        n.f.walk(this);
        this.code += ')';
        return true;
    };
    CodegenVisitor.prototype.paren = function (n) {
        this.code += '(';
        n.x.walk(this);
        this.code += ')';
        return true;
    };
    CodegenVisitor.prototype.unary = function (n) {
        var op = n.op === '!' ? '+!' : n.op;
        this.code += op;
        n.x.walk(this);
        return true;
    };
    CodegenVisitor.prototype.binary = function (n) {
        if (n.op === '^') {
            this.code += 'Math.pow(';
            n.l.walk(this);
            this.code += ',';
            n.r.walk(this);
            this.code += ')';
            return true;
        }
        var op = n.op;
        if (n.op in JS_OP)
            op = JS_OP[n.op];
        this.code += '(';
        n.l.walk(this);
        this.code += op;
        n.r.walk(this);
        this.code += ')';
        return true;
    };
    CodegenVisitor.prototype.refTime = function () {
        this.code += this.scope;
        this.code += '[0]';
    };
    CodegenVisitor.prototype.refDirect = function (ident) {
        this.code += 'curr[';
        this.code += this.offsets[ident];
        this.code += ']';
    };
    CodegenVisitor.prototype.refIndirect = function (ident) {
        this.code += "globalCurr[this.ref['";
        this.code += ident;
        this.code += "']]";
    };
    return CodegenVisitor;
})();
exports.CodegenVisitor = CodegenVisitor;
var Variable = (function () {
    function Variable(model, v) {
        if (!arguments.length)
            return;
        this.model = model;
        this.xmile = v;
        this.ident = v.ident;
        this.eqn = v.eqn;
        var errs;
        _a = parse.eqn(this.eqn), this.ast = _a[0], errs = _a[1];
        if (errs) {
            console.log('// parse failed for ' + this.ident + ': ' + errs[0]);
            this.valid = false;
        }
        else {
            this.valid = true;
        }
        this._deps = lex_1.identifierSet(this.eqn);
        var _a;
    }
    ;
    Variable.prototype.initialEquation = function () {
        return this.eqn;
    };
    ;
    Variable.prototype.code = function (offsets) {
        if (this.isConst())
            return "this.initials['" + this.ident + "']";
        var visitor = new CodegenVisitor(offsets, this.model.ident === 'main');
        var ok = this.ast.walk(visitor);
        if (!ok) {
            console.log('// codegen failed for ' + this.ident);
            return '';
        }
        return visitor.code;
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
        _super.call(this, model, v);
        this.initial = v.eqn;
        this.inflows = v.inflows;
        this.outflows = v.outflows;
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
        _super.call(this, model, v);
        this.x = [];
        this.y = [];
        this.ok = true;
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
