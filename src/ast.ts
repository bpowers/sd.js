// Copyright 2013 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

'use strict';

export function Ident(pos, name) {
	this.name = name;
	this._pos = pos;
}

function Constant(pos, value) {
	this.value = value;
	this._pos = pos;
}

function ParenExpr(lPos, x, rPos) {
	this.x = x;
	this._lPos = lPos;
	this._rPos = rPos;
}

function CallExpr(fun, lParenPos, args, rParenPos) {
	this.fun = fun;
	this.args = args;
	this._lParenPos = lParenPos;
	this._rParenPos = rParenPos;
}

function UnaryExpr(opPos, op, x) {
	this.op = op;
	this.x = x;
	this._opPos = opPos;
}

function BinaryExpr(x, opPos, op, y) {
	this.x = x;
	this.op = op;
	this.y = y;
	this._opPos = opPos;
}

function TernaryExpr(ifPos, cond, thenPos, a, elsePos, b) {
	this.cond = cond;
	this.a = a;
	this.b = b;
	this._ifPos = ifPos;
	this._thenPos = thenPos;
	this._elsePos = elsePos;
}

Ident.prototype.pos = function() { return this._pos; };
Constant.prototype.pos = function() { return this._pos; };
ParenExpr.prototype.pos = function() { return this._lPos; };
CallExpr.prototype.pos = function() { return this.fun.pos(); };
UnaryExpr.prototype.pos = function() { return this._opPos; };
BinaryExpr.prototype.pos = function() { return this.x.pos(); };
TernaryExpr.prototype.pos = function() { return this._ifPos; };

Ident.prototype.end = function() { return this._pos + this.name.length; };
Constant.prototype.end = function() { return this._pos + this.value.length; };
ParenExpr.prototype.end = function() { return this._rPos + 1; };
CallExpr.prototype.end = function() { return this._rParenPos + 1; };
UnaryExpr.prototype.end = function() { return this.x.end(); };
BinaryExpr.prototype.end = function() { return this.y.end(); };
TernaryExpr.prototype.end = function() { return this.b.end(); };
