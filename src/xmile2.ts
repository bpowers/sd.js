// Copyright 2018 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

import { Record } from 'immutable';

export const camelCase = (s: string): string => {
  let i = 0;
  while ((i = s.indexOf('_')) >= 0 && i < s.length - 1) {
    s = s.slice(0, i) + s.slice(i + 1, i + 2).toUpperCase() + s.slice(i + 2);
  }
  return s;
};

export const splitOnComma = (str: string): string[] => {
  return str.split(',').map(el => el.trim());
};

export const numberize = (arr: string[]): number[] => {
  return arr.map(el => parseFloat(el));
};

export const i32 = (n: number): number => {
  return n | 0;
};
declare function isFinite(n: string | number): boolean;

// expects name to be lowercase
const attr = (el: Element, name: string): string | undefined => {
  for (let i = 0; i < el.attributes.length; i++) {
    const attr = el.attributes.item(i);
    if (attr.name.toLowerCase() === name) {
      return attr.value;
    }
  }
  return undefined;
};

const parseText = (val: string): string | boolean | number | undefined => {
  val = val.trim();
  if (/^\s*$/.test(val)) {
    return undefined;
  }
  if (/^(?:true|false)$/i.test(val)) {
    return val.toLowerCase() === 'true';
  }
  if (isFinite(val)) {
    return parseFloat(val);
  }
  return val;
};

const content = (el: Element): string => {
  let text = '';
  if (el.hasChildNodes()) {
    for (let i = 0; i < el.childNodes.length; i++) {
      const child = (el as Element).childNodes.item(i);
      switch (child.nodeType) {
        case 3: // Text
          text += child.nodeValue.trim();
          break;
        case 4: // CData
          text += child.nodeValue;
          break;
      }
    }
  }
  return text;
};

const num = (v: any): [number, undefined] | [number, Error] => {
  if (typeof v === 'undefined' || v === null) {
    return [0, undefined];
  }
  if (typeof v === 'number') {
    return [v, undefined];
  }
  const n = parseFloat(v);
  if (isFinite(n)) {
    return [n, undefined];
  }
  return [NaN, new Error('not number: ' + v)];
};

const bool = (v: any): [boolean, undefined] | [false, Error] => {
  if (typeof v === 'undefined' || v === null) {
    return [false, undefined];
  }
  if (typeof v === 'boolean') {
    return [v, undefined];
  }
  if (typeof v === 'string') {
    if (v === 'true') {
      return [true, undefined];
    } else if (v === 'false') {
      return [false, undefined];
    }
  }
  // XXX: should we accept 0 or 1?
  return [false, new Error('not boolean: ' + v)];
};

interface IPoint {
  x?: number;
  y?: number;
};

export interface XNode {
  // constructor(el: Element): XNode;
  FromXML(doc: XMLDocument, parent: Element): [this.constructor, undefined] | [undefined, Error];
}

class Point extends Record({x: -1, y: -1}) {
  constructor(point: IPoint) {
    super(point);
  }

  static FromXML(el: Element): [Point, undefined] | [undefined, Error] {
    const pt: IPoint = {};
    let err: Error;

    for (const attr of el.attributes) {
      switch (attr.name.toLowerCase()) {
        case 'x':
          [pt.x, err] = num(attr.value);
          if (err) {
            return [undefined, new Error(`x not num: ${err.error}`)];
          }
          break;
        case 'y':
          [pt.y, err] = num(attr.value);
          if (err) {
            return [undefined, new Error(`y not num: ${err.error}`)];
          }
          break;
      }
    }
    if (pt.x === undefined || pt.y === undefined) {
      return [undefined, new Error(`expected both x and y on a Point`)];
    }

    return [pt, undefined];
  }
}
