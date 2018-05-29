// Copyright 2018 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

import { Record } from 'immutable';

import { Token, SourceLoc } from './type';
import { canonicalize } from './xmile';

export interface Node {
  pos: SourceLoc;
  end: SourceLoc; // the char after this token

  walk<T>(v: Visitor<T>): T;
}

export interface Visitor<T> {
  ident(n: Ident): T;
  constant(n: Constant): T;
  call(n: CallExpr): T;
  if(n: IfExpr): T;
  paren(n: ParenExpr): T;
  unary(n: UnaryExpr): T;
  binary(n: BinaryExpr): T;
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

  walk<T>(v: Visitor<T>): T {
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

  walk<T>(v: Visitor<T>): T {
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

  walk<T>(v: Visitor<T>): T {
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

  walk<T>(v: Visitor<T>): T {
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

  walk<T>(v: Visitor<T>): T {
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

  walk<T>(v: Visitor<T>): T {
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

  walk<T>(v: Visitor<T>): T {
    return v.if(this);
  }
}
