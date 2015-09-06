// Copyright 2015 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

'use strict';

import {Token, SourceLoc} from './lex';
import {canonicalize} from './xmile';

export interface Node {
	pos: SourceLoc;
	end: SourceLoc; // the char after this token

	walk(v: Visitor): boolean;
}

export interface Visitor {
	ident(n: Ident): boolean;
	constant(n: Constant): boolean;
	call(n: CallExpr): boolean;
	if(n: IfExpr): boolean;
	paren(n: ParenExpr): boolean;
	unary(n: UnaryExpr): boolean;
	binary(n: BinaryExpr): boolean;
}

export class Ident implements Node {
	ident: string;
	pos: SourceLoc;
	private len: number;

	constructor(pos: SourceLoc, name: string) {
		this.ident = canonicalize(name);
		this.pos = pos;
		// this.name is canonicalized, so we need to store the
		// original length.
		this.len = name.length;
	}

	get end(): SourceLoc { return this.pos.off(this.len); }

	walk(v: Visitor): boolean {
		return v.ident(this);
	}
}

export class Constant implements Node {
	value: number;
	_pos: SourceLoc;
	_len: number;

	constructor(pos: SourceLoc, value: string) {
		this.value = parseFloat(value);
		this._pos = pos;
		this._len = value.length;
	}

	get pos(): SourceLoc { return this._pos; }
	get end(): SourceLoc { return this._pos.off(this._len); }

	walk(v: Visitor): boolean {
		return v.constant(this);
	}
}

export class ParenExpr implements Node {
	x: Node;
	_lPos: SourceLoc;
	_rPos: SourceLoc;

	constructor(lPos: SourceLoc, x: Node, rPos: SourceLoc) {
		this.x = x;
		this._lPos = lPos;
		this._rPos = rPos;
	}

	get pos(): SourceLoc { return this._lPos; }
	get end(): SourceLoc { return this._rPos.off(1); }

	walk(v: Visitor): boolean {
		return v.paren(this);
	}
}

export class CallExpr implements Node {
	fun: Node;
	args: Node[];

	_lParenPos: SourceLoc;
	_rParenPos: SourceLoc;

	constructor(fun: Node, lParenPos: SourceLoc, args: Node[], rParenPos: SourceLoc) {
		this.fun = fun;
		this.args = args;
		this._lParenPos = lParenPos;
		this._rParenPos = rParenPos;
	}

	get pos(): SourceLoc { return this.fun.pos; }
	get end(): SourceLoc { return this._rParenPos.off(1); }

	walk(v: Visitor): boolean {
		return v.call(this);
	}
}

export class UnaryExpr implements Node {
	op: string;
	x: Node;
	_opPos: SourceLoc;

	constructor(opPos: SourceLoc, op: string, x: Node) {
		this.op = op;
		this.x = x;
		this._opPos = opPos;
	}

	get pos(): SourceLoc { return this._opPos; }
	get end(): SourceLoc { return this.x.end; }

	walk(v: Visitor): boolean {
		return v.unary(this);
	}
}

export class BinaryExpr implements Node {
	op: string;
	l: Node;
	r: Node;
	_opPos: SourceLoc;

	constructor(l: Node, opPos: SourceLoc, op: string, r: Node) {
		this.l = l;
		this.op = op;
		this.r = r;
		this._opPos = opPos;
	}

	get pos(): SourceLoc { return this.l.pos; }
	get end(): SourceLoc { return this.r.end; }

	walk(v: Visitor): boolean {
		return v.binary(this);
	}
}

export class IfExpr implements Node {
	cond: Node;
	t: Node;
	f: Node;
	_ifPos: SourceLoc;
	_thenPos: SourceLoc;
	_elsePos: SourceLoc;

	constructor(ifPos: SourceLoc, cond: Node, thenPos: SourceLoc, t: Node, elsePos: SourceLoc, f: Node) {
		this.cond = cond;
		this.t = t;
		this.f = f;
		this._ifPos = ifPos;
		this._thenPos = thenPos;
		this._elsePos = elsePos;
	}

	get pos(): SourceLoc { return this._ifPos; }
	get end(): SourceLoc { return this.f.end; }

	walk(v: Visitor): boolean {
		return v.if(this);
	}
}
