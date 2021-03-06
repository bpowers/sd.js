// Copyright 2019 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

import { Record } from 'immutable';

// split out of lex

// constants, sort of...
export const enum TokenType {
  TOKEN,
  IDENT,
  RESERVED,
  NUMBER,
}

const sourceLocDefaults = {
  line: -1,
  pos: -1,
};

export class SourceLoc extends Record(sourceLocDefaults) {
  constructor(line: number, pos: number) {
    super({ line, pos });
  }

  off(n: number): SourceLoc {
    return new SourceLoc(this.line, this.pos + n);
  }
}

export const UnknownSourceLoc = new SourceLoc(-1, -1);

const tokenDefaults = {
  tok: '',
  type: TokenType.TOKEN,
  startLoc: UnknownSourceLoc,
  endLoc: UnknownSourceLoc,
};

export class Token extends Record(tokenDefaults) {
  constructor(tok: string, type: TokenType, startLoc: SourceLoc, endLoc: SourceLoc) {
    super({ endLoc, startLoc, tok, type });
  }

  get value(): number {
    if (this.type !== TokenType.NUMBER) {
      throw new Error(`Token.value called for non-number: ${this.type}`);
    }

    return parseFloat(this.tok);
  }
}
