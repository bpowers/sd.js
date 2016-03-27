'use strict';
var xmile_1 = require('./xmile');
var Ident = (function () {
    function Ident(pos, name) {
        this.ident = xmile_1.canonicalize(name);
        this.pos = pos;
        this.len = name.length;
    }
    Object.defineProperty(Ident.prototype, "end", {
        get: function () { return this.pos.off(this.len); },
        enumerable: true,
        configurable: true
    });
    Ident.prototype.walk = function (v) {
        return v.ident(this);
    };
    return Ident;
})();
exports.Ident = Ident;
var Constant = (function () {
    function Constant(pos, value) {
        this.value = parseFloat(value);
        this._pos = pos;
        this._len = value.length;
    }
    Object.defineProperty(Constant.prototype, "pos", {
        get: function () { return this._pos; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Constant.prototype, "end", {
        get: function () { return this._pos.off(this._len); },
        enumerable: true,
        configurable: true
    });
    Constant.prototype.walk = function (v) {
        return v.constant(this);
    };
    return Constant;
})();
exports.Constant = Constant;
var ParenExpr = (function () {
    function ParenExpr(lPos, x, rPos) {
        this.x = x;
        this._lPos = lPos;
        this._rPos = rPos;
    }
    Object.defineProperty(ParenExpr.prototype, "pos", {
        get: function () { return this._lPos; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ParenExpr.prototype, "end", {
        get: function () { return this._rPos.off(1); },
        enumerable: true,
        configurable: true
    });
    ParenExpr.prototype.walk = function (v) {
        return v.paren(this);
    };
    return ParenExpr;
})();
exports.ParenExpr = ParenExpr;
var CallExpr = (function () {
    function CallExpr(fun, lParenPos, args, rParenPos) {
        this.fun = fun;
        this.args = args;
        this._lParenPos = lParenPos;
        this._rParenPos = rParenPos;
    }
    Object.defineProperty(CallExpr.prototype, "pos", {
        get: function () { return this.fun.pos; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(CallExpr.prototype, "end", {
        get: function () { return this._rParenPos.off(1); },
        enumerable: true,
        configurable: true
    });
    CallExpr.prototype.walk = function (v) {
        return v.call(this);
    };
    return CallExpr;
})();
exports.CallExpr = CallExpr;
var UnaryExpr = (function () {
    function UnaryExpr(opPos, op, x) {
        this.op = op;
        this.x = x;
        this._opPos = opPos;
    }
    Object.defineProperty(UnaryExpr.prototype, "pos", {
        get: function () { return this._opPos; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(UnaryExpr.prototype, "end", {
        get: function () { return this.x.end; },
        enumerable: true,
        configurable: true
    });
    UnaryExpr.prototype.walk = function (v) {
        return v.unary(this);
    };
    return UnaryExpr;
})();
exports.UnaryExpr = UnaryExpr;
var BinaryExpr = (function () {
    function BinaryExpr(l, opPos, op, r) {
        this.l = l;
        this.op = op;
        this.r = r;
        this._opPos = opPos;
    }
    Object.defineProperty(BinaryExpr.prototype, "pos", {
        get: function () { return this.l.pos; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BinaryExpr.prototype, "end", {
        get: function () { return this.r.end; },
        enumerable: true,
        configurable: true
    });
    BinaryExpr.prototype.walk = function (v) {
        return v.binary(this);
    };
    return BinaryExpr;
})();
exports.BinaryExpr = BinaryExpr;
var IfExpr = (function () {
    function IfExpr(ifPos, cond, thenPos, t, elsePos, f) {
        this.cond = cond;
        this.t = t;
        this.f = f;
        this._ifPos = ifPos;
        this._thenPos = thenPos;
        this._elsePos = elsePos;
    }
    Object.defineProperty(IfExpr.prototype, "pos", {
        get: function () { return this._ifPos; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(IfExpr.prototype, "end", {
        get: function () { return this.f.end; },
        enumerable: true,
        configurable: true
    });
    IfExpr.prototype.walk = function (v) {
        return v.if(this);
    };
    return IfExpr;
})();
exports.IfExpr = IfExpr;
