// Copyright 2018 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

import { Record } from 'immutable';

import { canonicalize } from './common';
import { SourceLoc, Token, UnknownSourceLoc } from './type';

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

const identDefaults = {
  ident: '' as string,
  pos: UnknownSourceLoc,
};

export class Ident implements Node {
  ident: string;
  pos: SourceLoc;
  len: number;

  constructor(pos: SourceLoc, name: string) {
    this.ident = canonicalize(name);
    this.pos = pos;
    // this.name is canonicalized, so we need to store the
    // original length.
    this.len = name.length;
  }

  get end(): SourceLoc {
    return this.pos.off(this.len);
  }

  walk<T>(v: Visitor<T>): T {
    return v.ident(this);
  }
}

export class Constant implements Node {
  value: number;
  len: number;
  pos: SourceLoc;

  constructor(pos: SourceLoc, value: string) {
    this.value = parseFloat(value);
    this.pos = pos;
    this.len = value.length;
  }

  get end(): SourceLoc {
    return this.pos.off(this.len);
  }

  walk<T>(v: Visitor<T>): T {
    return v.constant(this);
  }
}

export class ParenExpr implements Node {
  x: Node;
  lPos: SourceLoc;
  rPos: SourceLoc;

  constructor(lPos: SourceLoc, x: Node, rPos: SourceLoc) {
    this.x = x;
    this.lPos = lPos;
    this.rPos = rPos;
  }

  get pos(): SourceLoc {
    return this.lPos;
  }
  get end(): SourceLoc {
    return this.rPos.off(1);
  }

  walk<T>(v: Visitor<T>): T {
    return v.paren(this);
  }
}

export class CallExpr implements Node {
  fun: Node;
  args: Node[];

  lParenPos: SourceLoc;
  rParenPos: SourceLoc;

  constructor(fun: Node, lParenPos: SourceLoc, args: Node[], rParenPos: SourceLoc) {
    this.fun = fun;
    this.args = args;
    this.lParenPos = lParenPos;
    this.rParenPos = rParenPos;
  }

  get pos(): SourceLoc {
    return this.fun.pos;
  }
  get end(): SourceLoc {
    return this.rParenPos.off(1);
  }

  walk<T>(v: Visitor<T>): T {
    return v.call(this);
  }
}

export class UnaryExpr implements Node {
  op: string;
  x: Node;
  opPos: SourceLoc;

  constructor(opPos: SourceLoc, op: string, x: Node) {
    this.op = op;
    this.x = x;
    this.opPos = opPos;
  }

  get pos(): SourceLoc {
    return this.opPos;
  }
  get end(): SourceLoc {
    return this.x.end;
  }

  walk<T>(v: Visitor<T>): T {
    return v.unary(this);
  }
}

export class BinaryExpr implements Node {
  op: string;
  l: Node;
  r: Node;
  opPos: SourceLoc;

  constructor(l: Node, opPos: SourceLoc, op: string, r: Node) {
    this.l = l;
    this.op = op;
    this.r = r;
    this.opPos = opPos;
  }

  get pos(): SourceLoc {
    return this.l.pos;
  }
  get end(): SourceLoc {
    return this.r.end;
  }

  walk<T>(v: Visitor<T>): T {
    return v.binary(this);
  }
}

export class IfExpr implements Node {
  cond: Node;
  t: Node;
  f: Node;
  ifPos: SourceLoc;
  thenPos: SourceLoc;
  elsePos: SourceLoc;

  constructor(
    ifPos: SourceLoc,
    cond: Node,
    thenPos: SourceLoc,
    t: Node,
    elsePos: SourceLoc,
    f: Node,
  ) {
    this.cond = cond;
    this.t = t;
    this.f = f;
    this.ifPos = ifPos;
    this.thenPos = thenPos;
    this.elsePos = elsePos;
  }

  get pos(): SourceLoc {
    return this.ifPos;
  }
  get end(): SourceLoc {
    return this.f.end;
  }

  walk<T>(v: Visitor<T>): T {
    return v.if(this);
  }
}
