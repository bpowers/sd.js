// Copyright 2018 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

import { List, Record, Set } from 'immutable';

import { canonicalize, defined, exists } from './common';

export const camelCase = (s: string): string => {
  let i = 0;
  while ((i = s.indexOf('_')) >= 0 && i < s.length - 1) {
    s = s.slice(0, i) + s.slice(i + 1, i + 2).toUpperCase() + s.slice(i + 2);
  }
  return s;
};

export const splitOnComma = (str: string): List<string> => {
  return List(str.split(',').map(el => el.trim()));
};

export const numberize = (arr: List<string>): List<number> => {
  return List(arr.map(el => parseFloat(el)));
};

export const i32 = (n: number): number => {
  return n | 0;
};

declare function isFinite(n: string | number): boolean;

// expects name to be lowercase
const attr = (el: Element, name: string): string | undefined => {
  for (let i = 0; i < el.attributes.length; i++) {
    const attr = el.attributes.item(i);
    if (!attr) {
      continue;
    }
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
      const child = el.childNodes.item(i);
      if (!child) {
        continue;
      }
      switch (child.nodeType) {
        case 3: // Text
          text += exists(child.nodeValue).trim();
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

export interface XNode {
  // constructor(el: Element): XNode;
}

interface IPoint {
  x?: number;
  y?: number;
}

const PointDefaults = {
  x: -1,
  y: -1,
};

export class Point extends Record(PointDefaults) implements XNode {
  constructor(point: IPoint) {
    super(point);
  }

  toJSON(): any {
    return {
      '@class': 'Point',
      data: this.toJS(),
    };
  }

  static FromJSON(obj: any): Point {
    if (obj['@class'] !== 'Point' || !obj.data) {
      throw new Error('bad object');
    }
    return new Point(obj.data);
  }

  static FromXML(el: Element): [Point, undefined] | [undefined, Error] {
    const pt: IPoint = {};
    let err: Error | undefined;

    for (let i = 0; i < el.attributes.length; i++) {
      const attr = el.attributes.item(i);
      if (!attr) {
        continue;
      }
      switch (attr.name.toLowerCase()) {
        case 'x':
          [pt.x, err] = num(attr.value);
          if (err) {
            return [undefined, new Error(`x not num: ${err}`)];
          }
          break;
        case 'y':
          [pt.y, err] = num(attr.value);
          if (err) {
            return [undefined, new Error(`y not num: ${err}`)];
          }
          break;
      }
    }
    if (pt.x === undefined || pt.y === undefined) {
      return [undefined, new Error(`expected both x and y on a Point`)];
    }

    return [new Point(pt), undefined];
  }
}

interface IFile {
  version: string;
  namespace: string;
  //header: Header;
  //simSpec: SimSpec;
  //dimensions: Dimension[] = [];
  //units: Unit[] = [];
  //behavior: Behavior;
  //style: Style;
  models: List<Model>;
}

const FileDefaults = {
  version: '1.0',
  namespace: 'https://docs.oasis-open.org/xmile/ns/XMILE/v1.0',
  models: List(),
};

export class File extends Record(FileDefaults) implements XNode {
  constructor(file: IFile) {
    super(file);
  }

  toJSON(): any {
    return {
      '@class': 'File',
      data: this.toJS(),
    };
  }

  static FromJSON(obj: any): File {
    if (obj['@class'] !== 'File' || !obj.data) {
      throw new Error('bad object');
    }
    return new File(obj.data);
  }

  static FromXML(el: Element): [File, undefined] | [undefined, Error] {
    return [undefined, new Error('TODO')];
  }
}

interface IModel {}

const ModelDefaults = {};

class Model extends Record(ModelDefaults) implements XNode {
  constructor(file: IModel) {
    super(file);
  }

  toJSON(): any {
    return {
      '@class': 'Model',
      data: this.toJS(),
    };
  }

  static FromJSON(obj: any): Model {
    if (obj['@class'] !== 'Model' || !obj.data) {
      throw new Error('bad object');
    }
    return new Model(obj.data);
  }

  static FromXML(el: Element): [Model, undefined] | [undefined, Error] {
    return [undefined, new Error('TODO')];
  }
}

type GFType = 'continuous' | 'extrapolate' | 'discrete';

interface IGF {
  name?: string;
  type?: GFType;
  xPoints?: List<number>;
  yPoints?: List<number>;
  xScale?: Scale;
  yScale?: Scale; // only affects the scale of the graph in the UI
}

const GFDefaults = {
  name: '',
  type: 'continuous',
  xPoints: List<number>(),
  yPoints: List<number>(),
  xScale: undefined as Scale | undefined,
  yScale: undefined as Scale | undefined,
};

export class GF extends Record(GFDefaults) implements XNode {
  constructor(gf: IGF) {
    super(gf);
  }

  toJSON(): any {
    return {
      '@class': 'GF',
      data: this.toJS(),
    };
  }

  static FromJSON(obj: any): GF {
    if (obj['@class'] !== 'GF' || !obj.data) {
      throw new Error('bad object');
    }
    const data = obj.data;
    if (data.xPoints) {
      data.xPoints = List(data.xPoints);
    }
    if (data.yPoints) {
      data.yPoints = List(data.yPoints);
    }
    if (data.xScale) {
      data.xScale = new Scale(data.xScale);
    }
    if (data.yScale) {
      data.yScale = new Scale(data.yScale);
    }
    return new GF(data);
  }

  static FromXML(el: Element): [GF, undefined] | [undefined, Error] {
    const table: IGF = {};
    let err: Error | undefined;

    for (let i = 0; i < el.attributes.length; i++) {
      const attr = el.attributes.item(i);
      if (!attr) {
        continue;
      }
      switch (attr.name.toLowerCase()) {
        case 'type':
          const kind = attr.value.toLowerCase();
          if (
            kind === 'discrete' ||
            kind === 'continuous' ||
            kind === 'extrapolate'
          ) {
            table.type = kind;
          } else {
            return [undefined, new Error(`bad GF type: ${kind}`)];
          }
          break;
      }
    }

    for (let i = 0; i < el.childNodes.length; i++) {
      const child = el.childNodes.item(i) as Element;
      if (child.nodeType !== 1) {
        // Element
        continue;
      }
      switch (child.nodeName.toLowerCase()) {
        case 'xscale':
          [table.xScale, err] = Scale.FromXML(child);
          if (err) {
            return [undefined, new Error(`xscale: ${err}`)];
          }
          break;
        case 'yscale':
          [table.yScale, err] = Scale.FromXML(child);
          if (err) {
            return [undefined, new Error(`yscale: ${err}`)];
          }
          break;
        case 'xpts':
          table.xPoints = numberize(splitOnComma(content(child)));
          break;
        case 'ypts':
          table.yPoints = numberize(splitOnComma(content(child)));
          break;
      }
    }

    if (table.yPoints === undefined) {
      return [undefined, new Error('table missing ypts')];
    }

    // FIXME: handle
    if (table.type !== 'continuous') {
      console.log('WARN: unimplemented table type: ' + table.type);
    }

    return [new GF(table), undefined];
  }
}

interface IScale {
  min?: number;
  max?: number;
}

const ScaleDefaults = {
  min: -1,
  max: -1,
};

export class Scale extends Record(ScaleDefaults) implements XNode {
  constructor(scale: IScale) {
    super(scale);
  }

  toJSON(): any {
    return {
      '@class': 'Scale',
      data: this.toJS(),
    };
  }

  static FromJSON(obj: any): Scale {
    if (obj['@class'] !== 'Scale' || !obj.data) {
      throw new Error('bad object');
    }
    return new Scale(obj.data);
  }

  static FromXML(el: Element): [Scale, undefined] | [undefined, Error] {
    const scale: IScale = {};
    let err: Error | undefined;

    for (let i = 0; i < el.attributes.length; i++) {
      const attr = el.attributes.item(i);
      if (!attr) {
        continue;
      }
      switch (attr.name.toLowerCase()) {
        case 'min':
          [scale.min, err] = num(attr.value);
          if (err) {
            return [undefined, new Error(`bad min: ${attr.value}`)];
          }
          break;
        case 'max':
          [scale.max, err] = num(attr.value);
          if (err) {
            return [undefined, new Error(`bad max: ${attr.value}`)];
          }
          break;
      }
    }

    if (scale.min === undefined || scale.max === undefined) {
      return [undefined, new Error('scale requires both min and max')];
    }

    return [new Scale(scale), undefined];
  }
}

interface IConnection {
  from?: string;
  to?: string;
}

const ConnectionDefaults = {
  from: '',
  to: '',
};

class Connection extends Record(ConnectionDefaults) implements XNode {
  constructor(conn: IConnection) {
    super(conn);
  }

  toJSON(): any {
    return {
      '@class': 'Connection',
      data: this.toJS(),
    };
  }

  static FromJSON(obj: any): Connection {
    if (obj['@class'] !== 'Connection' || !obj.data) {
      throw new Error('bad object');
    }
    return new Connection(obj.data);
  }

  static FromXML(el: Element): [Connection, undefined] | [undefined, Error] {
    const conn: IConnection = {};

    for (let i = 0; i < el.attributes.length; i++) {
      const attr = el.attributes.item(i);
      if (!attr) {
        continue;
      }
      switch (attr.name.toLowerCase()) {
        case 'to':
          conn.to = canonicalize(attr.value);
          break;
        case 'from':
          conn.from = canonicalize(attr.value);
          break;
      }
    }

    if (conn.to === undefined || conn.from === undefined) {
      return [undefined, new Error('connect requires both to and from')];
    }

    return [new Connection(conn), undefined];
  }

  toXml(doc: XMLDocument, parent: Element): boolean {
    return true;
  }
}
