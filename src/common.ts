// Copyright 2015 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

import { Map, Set } from 'immutable';

export function exists<T>(object: T | null): T {
  if (object === null) {
    throw new Error('expected non-null object');
  }
  return object;
}

export function defined<T>(object: T | undefined): T {
  if (object === undefined) {
    throw new Error('expected non-undefined object');
  }
  return object;
}

export function titleCase(str: string): string {
  return str.replace(
    /(?:^|\s)\w/g,
    (match: string): string => {
      return match.toUpperCase();
    },
  );
}

export class Error {
  static Version: Error = new Error('bad xml or unknown smile version');
  static BadTime: Error = new Error('bad time (control) data');

  readonly msg: string;

  constructor(msg: string) {
    this.msg = msg;
  }
}

export interface Properties {
  usesTime?: boolean;
}

// whether identifiers are a builtin.  Implementation is in
// Builtin module in runtime_src.js
export const builtins: Map<string, Properties> = Map({
  abs: {},
  arccos: {},
  arcsin: {},
  arctan: {},
  cos: {},
  exp: {},
  inf: {},
  int: {},
  ln: {},
  log10: {},
  max: {},
  min: {},
  pi: {},
  pulse: {
    usesTime: true,
  },
  sin: {},
  sqrt: {},
  safediv: {},
  tan: {},
});

export const reserved: Set<string> = Set<string>(['if', 'then', 'else']);
