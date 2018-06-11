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
  version?: string;
  namespace?: string;
  header?: Header;
  simSpec?: SimSpec;
  dimensions?: List<Dimension>;
  units?: List<Unit>;
  behavior?: Behavior;
  style?: Style;
  models?: List<Model>;
}

const FileDefaults = {
  version: '1.0',
  namespace: 'https://docs.oasis-open.org/xmile/ns/XMILE/v1.0',
  header: undefined as Header | undefined,
  simSpec: undefined as SimSpec | undefined,
  dimensions: List<Dimension>(),
  units: List<Unit>(),
  behavior: undefined as Behavior | undefined,
  style: undefined as Style | undefined,
  models: List<Model>(),
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
    const file: IFile = {};

    for (let i = 0; i < el.attributes.length; i++) {
      const attr = el.attributes.item(i);
      if (!attr) {
        continue;
      }
      switch (attr.name.toLowerCase()) {
        case 'version':
          file.version = exists(attr.value);
          break;
        case 'xmlns':
          file.namespace = exists(attr.value);
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
        case 'header': {
          const [header, err] = Header.FromXML(child);
          if (err || !header) {
            return [undefined, new Error('Header: ' + err)];
          }
          file.header = header;
          break;
        }
        case 'sim_specs': {
          const [simSpec, err] = SimSpec.FromXML(child);
          if (err || !simSpec) {
            return [undefined, new Error('SimSpec: ' + err)];
          }
          file.simSpec = simSpec;
          break;
        }
        case 'model': {
          const [model, err] = Model.FromXML(child);
          if (err || !model) {
            return [undefined, new Error('SimSpec: ' + err)];
          }
          if (!file.models) {
            file.models = List();
          }
          file.models = defined(file.models).push(defined(model));
          break;
        }
      }
    }

    return [new File(file), undefined];
  }

  toXml(doc: XMLDocument, parent: Element): boolean {
    return true;
  }
}

export class SimSpec implements XNode {
  start: number = 0;
  stop: number = 1;
  dt: number = 1;
  dtReciprocal: number; // the original reciprocal DT
  saveStep: number = 0;
  method: string = 'euler';
  timeUnits: string = '';

  [indexName: string]: any;

  static FromXML(el: Element): [SimSpec, undefined] | [undefined, Error] {
    const simSpec = new SimSpec();

    for (let i = 0; i < el.childNodes.length; i++) {
      const child = el.childNodes.item(i) as Element;
      if (child.nodeType !== 1) {
        // Element
        continue;
      }
      let name = camelCase(child.nodeName.toLowerCase());
      // XXX: hack for compat with some old models of mine
      if (name === 'savestep') {
        name = 'saveStep';
      }
      if (!simSpec.hasOwnProperty(name)) {
        continue;
      }

      if (name === 'method' || name === 'timeUnits') {
        simSpec[name] = content(child).toLowerCase();
      } else {
        const [val, err] = num(content(child));
        if (err || val === undefined) {
          return [undefined, new Error(child.nodeName + ': ' + err)];
        }
        simSpec[name] = val;
        if (name === 'dt') {
          if (attr(child, 'reciprocal') === 'true') {
            simSpec.dtReciprocal = simSpec.dt;
            simSpec.dt = 1 / simSpec.dt;
          }
        }
      }
    }

    if (!simSpec.saveStep) {
      simSpec.saveStep = simSpec.dt;
    }

    switch (simSpec.method) {
      // supported
      case 'euler':
        break;
      // valid, but not implemented
      case 'rk4':
      case 'rk2':
      case 'rk45':
      case 'gear':
        console.log(
          'valid but unsupported integration ' + 'method: ' + simSpec.method + '. using euler',
        );
        simSpec.method = 'euler';
        break;
      // unknown
      default:
        return [undefined, new Error(`unknown integration method ${simSpec.method}`)];
    }

    return [simSpec, undefined];
  }

  toXml(doc: XMLDocument, parent: Element): boolean {
    return true;
  }
}

export class Unit implements XNode {
  name: string;
  eqn: string;
  alias: string;

  constructor(el: Element) {}

  toXml(doc: XMLDocument, parent: Element): boolean {
    return true;
  }
}

export class Product implements XNode {
  name: string = 'unknown';
  lang: string = 'English';
  version: string = '';

  static FromXML(el: Element): [Product, undefined] | [undefined, Error] {
    const product = new Product();
    product.name = content(el);
    for (let i = 0; i < el.attributes.length; i++) {
      const attr = el.attributes.item(i);
      if (!attr) {
        continue;
      }
      switch (attr.name.toLowerCase()) {
        case 'version':
          product.version = attr.value;
          break;
        case 'lang':
          product.lang = attr.value;
          break;
      }
    }
    return [product, undefined];
  }

  toXml(doc: XMLDocument, parent: Element): boolean {
    return true;
  }
}

export class Header implements XNode {
  vendor?: string;
  product?: Product;
  options?: Options;
  name: string;
  version?: string;
  caption?: string; // WTF is this
  // image:    Image;
  author?: string;
  affiliation?: string;
  client?: string;
  copyright?: string;
  // contact:  Contact;
  created?: string; // ISO 8601 date format, e.g. “ 2014-08-10”
  modified?: string; // ISO 8601 date format
  uuid?: string; // IETF RFC4122 format (84-4-4-12 hex digits with the dashes)
  // includes: Include[];

  static FromXML(el: Element): [Header, undefined] | [undefined, Error] {
    const header = new Header();
    let err: Error | undefined;
    for (let i = 0; i < el.childNodes.length; i++) {
      const child = el.childNodes.item(i) as Element;
      if (child.nodeType !== 1) {
        // Element
        continue;
      }
      switch (child.nodeName.toLowerCase()) {
        case 'vendor':
          header.vendor = content(child);
          break;
        case 'product':
          [header.product, err] = Product.FromXML(child);
          if (err) {
            return [undefined, new Error('Product: ' + err)];
          }
          break;
        case 'options':
          [header.options, err] = Options.FromXML(child);
          if (err) {
            return [undefined, new Error('Options: ' + err)];
          }
          break;
        case 'name':
          header.name = content(child);
          break;
        case 'version':
          header.version = content(child);
          break;
        case 'caption':
          header.caption = content(child);
          break;
        case 'author':
          header.author = content(child);
          break;
        case 'affiliation':
          header.affiliation = content(child);
          break;
        case 'client':
          header.client = content(child);
          break;
        case 'copyright':
          header.copyright = content(child);
          break;
        case 'created':
          header.created = content(child);
          break;
        case 'modified':
          header.modified = content(child);
          break;
        case 'uuid':
          header.uuid = content(child);
          break;
      }
    }
    return [header, undefined];
  }

  toXml(doc: XMLDocument, parent: Element): boolean {
    return true;
  }
}

export class Dimension implements XNode {
  name: string = '';
  size: string = '';

  static FromXML(el: Element): [Dimension, undefined] | [undefined, Error] {
    const dim = new Dimension();
    // TODO: implement
    return [dim, undefined];
  }

  toXml(doc: XMLDocument, parent: Element): boolean {
    return true;
  }
}

export class Options implements XNode {
  namespaces: List<string> = List();
  usesArrays: boolean = false;
  usesMacros: boolean = false;
  usesConveyor: boolean = false;
  usesQueue: boolean = false;
  usesSubmodels: boolean = false;
  usesEventPosters: boolean = false;
  hasModelView: boolean = false;
  usesOutputs: boolean = false;
  usesInputs: boolean = false;
  usesAnnotation: boolean = false;

  // arrays
  maximumDimensions: number = 1;
  invalidIndexValue: number = 0; // only 0 or NaN
  // macros
  recursiveMacros: boolean = false;
  optionFilters: boolean = false;
  // conveyors
  arrest: boolean = false;
  leak: boolean = false;
  // queues
  overflow: boolean = false;
  // event posters
  messages: boolean = false;
  // outputs
  numericDisplay: boolean = false;
  lamp: boolean = false;
  gauge: boolean = false;
  // inputs
  numericInput: boolean = false;
  list: boolean = false;
  graphicalInput: boolean = false;

  // avoids an 'implicit any' error when setting options in
  // FromXML below 'indexName' to avoid a spurious tslint
  // 'shadowed name' error.
  [indexName: string]: any;

  static FromXML(el: Element): [Options, undefined] | [undefined, Error] {
    const options = new Options();

    for (let i = 0; i < el.attributes.length; i++) {
      const attr = el.attributes.item(i);
      if (!attr) {
        continue;
      }
      switch (attr.name.toLowerCase()) {
        case 'namespace':
          options.namespaces = splitOnComma(attr.value);
          break;
      }
    }

    for (let i = 0; i < el.childNodes.length; i++) {
      const child = el.childNodes.item(i) as Element;
      if (child.nodeType !== 1) {
        // Element
        continue;
      }
      let name = child.nodeName.toLowerCase();
      let plen: number | undefined;
      if (name.slice(0, 5) === 'uses_') {
        plen = 4;
      } else if (name.substring(0, 4) !== 'has_') {
        plen = 3;
      }
      if (!plen) {
        continue;
      }
      // use slice here even for the single char we
      // are camel-casing to avoid having to check
      // the length of the string
      name = camelCase(name);
      if (!options.hasOwnProperty(name)) {
        continue;
      }

      options[name] = true;

      if (name === 'usesArrays') {
        let val: string | undefined;
        val = attr(child, 'maximum_dimensions');
        if (val) {
          const [n, err] = num(val);
          if (err || !n) {
            // FIXME: real logging
            console.log('bad max_dimensions( ' + val + '): ' + err);
            options.maximumDimensions = 1;
          } else {
            if (n !== i32(n)) {
              console.log('non-int max_dimensions: ' + val);
            }
            options.maximumDimensions = i32(n);
          }
        }
        val = attr(child, 'invalid_index_value');
        if (val === 'NaN') {
          options.invalidIndexValue = NaN;
        }
      }
    }
    return [options, undefined];
  }

  toXml(doc: XMLDocument, parent: Element): boolean {
    return true;
  }
}

export class Behavior implements XNode {
  allNonNegative: boolean = false;
  stockNonNegative: boolean = false;
  flowNonNegative: boolean = false;

  static FromXML(el: Element): [Behavior, undefined] | [undefined, Error] {
    const behavior = new Behavior();
    // TODO
    return [behavior, undefined];
  }

  toXml(doc: XMLDocument, parent: Element): boolean {
    return true;
  }
}

// TODO: kill me
export class Style implements XNode {
  constructor(el: Element) {}

  toXml(doc: XMLDocument, parent: Element): boolean {
    return true;
  }
}

// TODO: same here
export class Data implements XNode {
  constructor(el: Element) {}

  toXml(doc: XMLDocument, parent: Element): boolean {
    return true;
  }
}

export class Model implements XNode {
  name: string = '';
  run: boolean = false;
  namespaces?: List<string>;
  resource: string; // path or URL to separate resource file
  simSpec: SimSpec;
  // behavior: Behavior;
  variables: List<Variable> = List();
  views: List<View> = List();

  static FromXML(el: Element): [Model, undefined] | [undefined, Error] {
    const model = new Model();

    for (let i = 0; i < el.attributes.length; i++) {
      const attr = el.attributes.item(i);
      if (!attr) {
        continue;
      }
      switch (attr.name.toLowerCase()) {
        case 'name':
          model.name = attr.value;
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
        case 'variables':
          for (let j = 0; j < child.childNodes.length; j++) {
            const vchild = child.childNodes.item(j) as Element;
            if (vchild.nodeType !== 1) {
              // Element
              continue;
            }
            if (typeof vchild.prefix !== 'undefined' && vchild.prefix === 'isee') {
              // isee specific info
              continue;
            }
            const [v, err] = Variable.FromXML(vchild);
            // FIXME: real logging
            if (err || !v) {
              return [undefined, new Error(child.nodeName + ' var: ' + err)];
            }
            model.variables = model.variables.push(v);
          }
          break;
        case 'views':
          for (let j = 0; j < child.childNodes.length; j++) {
            const vchild = child.childNodes.item(j) as Element;
            if (vchild.nodeType !== 1) {
              // Element
              continue;
            }
            // TODO: style parsing
            if (vchild.nodeName.toLowerCase() !== 'view') {
              continue;
            }
            const [view, err] = View.FromXML(vchild);
            // FIXME: real logging
            if (err || !view) {
              return [undefined, new Error('view: ' + err)];
            }
            model.views = model.views.push(view);
          }
          break;
      }
    }
    return [model, undefined];
  }

  get ident(): string {
    return canonicalize(this.name);
  }

  toXml(doc: XMLDocument, parent: Element): boolean {
    return true;
  }
}

// the 'Element' name is defined by the TypeScript lib.d.ts, so we're
// forced to be more verbose.
export class ArrayElement implements XNode {
  subscript: string[] = [];
  eqn: string;
  gf: GF;

  static FromXML(el: Element): [ArrayElement, undefined] | [undefined, Error] {
    const arrayEl = new ArrayElement();
    console.log('TODO: array element');
    return [arrayEl, undefined];
  }
  toXml(doc: XMLDocument, parent: Element): boolean {
    return true;
  }
}

// Section 4.1.1 - Ranges, Scales, Number Formats
export class Range implements XNode {
  min?: number;
  max?: number;
  // auto + group only valid on 'scale' tags
  auto?: boolean;
  group?: number; // 'unique number identifier'

  static FromXML(el: Element): [Range, undefined] | [undefined, Error] {
    const range = new Range();
    console.log('TODO: range element');
    return [range, undefined];
  }
  toXml(doc: XMLDocument, parent: Element): boolean {
    return true;
  }
}

// Section 4.1.1 - Ranges, Scales, Number Formats
export class Format implements XNode {
  precision: string = ''; // "default: best guess based on the scale of the variable"
  scaleBy: string = '1';
  displayAs: string = 'number'; // "number"|"currency"|"percent"
  delimit000s: boolean = false; // include thousands separator

  static FromXML(el: Element): [Format, undefined] | [undefined, Error] {
    const fmt = new Format();
    console.log('TODO: format element');
    return [fmt, undefined];
  }
  toXml(doc: XMLDocument, parent: Element): boolean {
    return true;
  }
}

// TODO: split into multiple subclasses?
export class Variable implements XNode {
  type: string;
  name?: string;
  model?: string;
  eqn?: string = '';
  gf?: GF;
  // mathml        Node;
  // arrayed-vars
  dimensions?: List<Dimension>; // REQUIRED for arrayed vars
  elements?: List<ArrayElement>; // non-A2A
  // modules
  connections?: List<Connection>;
  resource?: string; // path or URL to model XMILE file
  // access:       string;         // TODO: not sure if should implement
  // autoExport:   boolean;        // TODO: not sure if should implement
  units?: Unit;
  doc?: string; // 'or HTML', but HTML is not valid XML.  string-only.
  // eventPoster   EventPoster;
  range?: Range;
  scale?: Range;
  format?: Format;
  // stocks
  nonNegative?: boolean;
  inflows?: List<string>;
  outflows?: List<string>;
  // flows
  // multiplier:   string; // expression used on downstream side of stock to convert units
  // queues
  // overflow:     boolean;
  // leak:         string;
  // leakIntegers: boolean;
  // leakStart:    number;
  // leakEnd:      number;
  // auxiliaries
  flowConcept: boolean; // :(

  static FromXML(el: Element): [Variable, undefined] | [undefined, Error] {
    const v = new Variable();

    v.type = el.nodeName.toLowerCase();

    for (let i = 0; i < el.attributes.length; i++) {
      const attr = el.attributes.item(i);
      if (!attr) {
        continue;
      }
      switch (attr.name.toLowerCase()) {
        case 'name':
          v.name = attr.value;
          break;
        case 'resource':
          v.resource = attr.value;
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
        case 'eqn':
          v.eqn = content(child);
          break;
        case 'inflow':
          if (!v.inflows) {
            v.inflows = List();
          }
          v.inflows = v.inflows.push(canonicalize(content(child)));
          break;
        case 'outflow':
          if (!v.outflows) {
            v.outflows = List();
          }
          v.outflows = v.outflows.push(canonicalize(content(child)));
          break;
        case 'gf': {
          const [gf, err] = GF.FromXML(child);
          if (err || !gf) {
            return [undefined, new Error(v.name + ' GF: ' + err)];
          }
          v.gf = gf;
          break;
        }
        case 'connect': {
          const [conn, err] = Connection.FromXML(child);
          if (err || !conn) {
            return [undefined, new Error(v.name + ' conn: ' + err)];
          }
          if (!v.connections) {
            v.connections = List<Connection>();
          }
          v.connections = v.connections.push(conn);
          break;
        }
      }
    }

    return [v, undefined];
  }

  get ident(): string {
    if (!this.name) {
      console.log('FIXME');
      return '';
    }
    return canonicalize(this.name);
  }

  toXml(doc: XMLDocument, parent: Element): boolean {
    return true;
  }
}

export class Shape implements XNode {
  static Types: string[] = ['rectangle', 'circle', 'name_only'];

  type: string; // 'rectangle'|'circle'|'name_only'
  width?: number;
  height?: number;
  radius?: number;

  static FromXML(el: Element): [Shape, undefined] | [undefined, Error] {
    const shape = new Shape();
    let err: Error | undefined;

    for (let i = 0; i < el.attributes.length; i++) {
      const attr = el.attributes.item(i);
      if (!attr) {
        continue;
      }
      switch (attr.name.toLowerCase()) {
        case 'type':
          shape.type = attr.value.toLowerCase();
          if (!(shape.type in Shape.Types)) {
            return [undefined, new Error('bad type: ' + shape.type)];
          }
          break;
        case 'width':
          [shape.width, err] = num(attr.value);
          if (err) {
            return [undefined, new Error('bad width: ' + err)];
          }
          break;
        case 'height':
          [shape.height, err] = num(attr.value);
          if (err) {
            return [undefined, new Error('bad height: ' + err)];
          }
          break;
        case 'radius':
          [shape.radius, err] = num(attr.value);
          if (err) {
            return [undefined, new Error('bad radius: ' + err)];
          }
          break;
      }
    }
    return [shape, undefined];
  }

  toXml(doc: XMLDocument, parent: Element): boolean {
    return true;
  }
}

export class ViewElement implements XNode {
  type: string;
  name: string;
  uid: number; // int
  x: number;
  y: number;
  width: number;
  height: number;
  shape: Shape;
  borderWidth: string; // 'thick'|'thin'|double, thick = 3, thin = 1
  borderColor: string; // hex|predefined-color
  borderStyle: string; // 'none'|'solid'
  fontFamily: string;
  fontWeight: string; // 'normal'|'bold'
  textDecoration: string; // 'normal'|'underline'
  textAlign: string; // 'left'|'right'|'center'
  verticalTextAlign: string; // 'top'|'center'|'bottom'
  fontColor: string; // hex|predefined-color
  textBackground: string; // hex|predefined-color
  fontSize: number; // "<double>pt"
  padding: number[];
  // "any attributes of a Border object"
  color: string;
  background: string; // hex|predefined-color
  zIndex: number; // default of -1, range of -1 to INT_MAX
  // "any attributes of a Text Style object"
  labelSide: string; // 'top'|'left'|'center'|'bottom'|'right'
  labelAngle: number; // degrees where 0 is 3 o'clock, counter-clockwise.
  // connectors
  from: string; // ident
  to: string; // ident
  angle: number; // degrees
  // flows + multi-point connectors
  pts?: List<Point>;
  // alias
  of: string;

  static FromXML(el: Element): [ViewElement, undefined] | [undefined, Error] {
    const viewEl = new ViewElement();
    let err: Error | undefined;

    viewEl.type = el.nodeName.toLowerCase();

    for (let i = 0; i < el.attributes.length; i++) {
      const attr = el.attributes.item(i);
      if (!attr) {
        continue;
      }
      switch (attr.name.toLowerCase()) {
        case 'name':
          // display-name, not canonicalized
          viewEl.name = attr.value;
          break;
        case 'uid':
          [viewEl.uid, err] = num(attr.value);
          if (err) {
            return [undefined, new Error('uid: ' + err)];
          }
          break;
        case 'x':
          [viewEl.x, err] = num(attr.value);
          if (err) {
            return [undefined, new Error('x: ' + err)];
          }
          break;
        case 'y':
          [viewEl.y, err] = num(attr.value);
          if (err) {
            return [undefined, new Error('y: ' + err)];
          }
          break;
        case 'width':
          [viewEl.width, err] = num(attr.value);
          if (err) {
            return [undefined, new Error('width: ' + err)];
          }
          break;
        case 'height':
          [viewEl.height, err] = num(attr.value);
          if (err) {
            return [undefined, new Error('height: ' + err)];
          }
          break;
        case 'label_side':
          viewEl.labelSide = attr.value.toLowerCase();
          break;
        case 'label_angle':
          [viewEl.labelAngle, err] = num(attr.value);
          if (err) {
            return [undefined, new Error('label_angle: ' + err)];
          }
          break;
        case 'color':
          viewEl.color = attr.value.toLowerCase();
          break;
        case 'angle':
          [viewEl.angle, err] = num(attr.value);
          if (err) {
            return [undefined, new Error('angle: ' + err)];
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
        case 'to':
          viewEl.to = canonicalize(content(child));
          break;
        case 'from':
          viewEl.from = canonicalize(content(child));
          break;
        case 'of':
          viewEl.of = canonicalize(content(child));
          break;
        case 'pts':
          for (let j = 0; j < child.childNodes.length; j++) {
            const vchild = child.childNodes.item(j) as Element;
            if (vchild.nodeType !== 1) {
              // Element
              continue;
            }
            if (vchild.nodeName.toLowerCase() !== 'pt') {
              continue;
            }
            const [pt, err] = Point.FromXML(vchild);
            // FIXME: real logging
            if (err || !pt) {
              return [undefined, new Error('pt: ' + err)];
            }
            if (!viewEl.pts) {
              viewEl.pts = List<Point>();
            }
            viewEl.pts = viewEl.pts.push(defined(pt));
          }
          break;
        case 'shape':
          const [shape, err] = Shape.FromXML(child);
          if (err || !shape) {
            return [undefined, new Error('shape: ' + err)];
          }
          viewEl.shape = shape;
          break;
      }
    }

    return [viewEl, undefined];
  }

  get hasName(): boolean {
    return this.name !== undefined;
  }

  get ident(): string {
    return canonicalize(this.name);
  }

  get cx(): number {
    switch (this.type) {
      case 'aux':
        return this.x;
      case 'flow':
        return this.x;
      case 'module':
        return this.x;
      case 'stock':
        if (this.width) {
          return this.x + 0.5 * this.width;
        } else {
          return this.x;
        }
    }
    return NaN;
  }

  get cy(): number {
    switch (this.type) {
      case 'aux':
        return this.y;
      case 'flow':
        return this.y;
      case 'module':
        return this.y;
      case 'stock':
        if (this.width) {
          return this.y + 0.5 * this.height;
        } else {
          return this.y;
        }
    }
    return NaN;
  }

  toXml(doc: XMLDocument, parent: Element): boolean {
    return true;
  }
}

const ViewDefaults = {
  type: 'stock_flow',
  order: undefined as number | undefined,
  width: undefined as number | undefined,
  height: undefined as number | undefined,
  zoom: 100,
  scrollX: 0,
  scrollY: 0,
  background: undefined as string | undefined,
  pageWidth: undefined as number | undefined,
  pageHeight: undefined as number | undefined,
  pageSequence: undefined as 'row' | 'column' | undefined,
  pageOrientation: undefined as 'landscape' | 'portrait' | undefined,
  showPages: undefined as boolean | undefined,
  homePage: undefined as number | undefined,
  homeView: undefined as boolean | undefined,
  elements: List<ViewElement>(),
};

export class View extends Record(ViewDefaults) implements XNode {
  constructor(view: typeof ViewDefaults) {
    super(view);
  }

  toJSON(): any {
    return {
      '@class': 'View',
      data: this.toJS(),
    };
  }

  static FromXML(el: Element): [View, undefined] | [undefined, Error] {
    const view: typeof ViewDefaults = Object.assign({}, ViewDefaults);
    let err: Error | undefined;

    for (let i = 0; i < el.attributes.length; i++) {
      const attr = el.attributes.item(i);
      if (!attr) {
        continue;
      }
      switch (attr.name.toLowerCase()) {
        case 'type':
          view.type = attr.value.toLowerCase();
          break;
        case 'order':
          [view.order, err] = num(attr.value);
          if (err) {
            return [undefined, new Error('order: ' + err)];
          }
          break;
        case 'width':
          [view.width, err] = num(attr.value);
          if (err) {
            return [undefined, new Error('width: ' + err)];
          }
          break;
        case 'height':
          [view.height, err] = num(attr.value);
          if (err) {
            return [undefined, new Error('height: ' + err)];
          }
          break;
        case 'zoom':
          [view.zoom, err] = num(attr.value);
          if (err) {
            return [undefined, new Error('zoom: ' + err)];
          }
          break;
        case 'scroll_x':
          [view.scrollX, err] = num(attr.value);
          if (err) {
            return [undefined, new Error('scroll_x: ' + err)];
          }
          break;
        case 'scroll_y':
          [view.scrollY, err] = num(attr.value);
          if (err) {
            return [undefined, new Error('scroll_y: ' + err)];
          }
          break;
        case 'background':
          view.background = attr.value.toLowerCase();
          break;
        case 'page_width':
          [view.pageWidth, err] = num(attr.value);
          if (err) {
            return [undefined, new Error('page_width: ' + err)];
          }
          break;
        case 'page_height':
          [view.pageHeight, err] = num(attr.value);
          if (err) {
            return [undefined, new Error('page_height: ' + err)];
          }
          break;
        case 'page_sequence': {
          const val = attr.value.toLowerCase();
          if (val !== 'row' && val !== 'column') {
            return [undefined, new Error(`unknown page_sequence type: ${val}`)];
          }
          view.pageSequence = val;
          break;
        }
        case 'page_orientation': {
          const val = attr.value.toLowerCase();
          if (val !== 'landscape' && val !== 'portrait') {
            return [undefined, new Error(`unknown page_sequence type: ${val}`)];
          }
          view.pageOrientation = val;
          break;
        }
        case 'show_pages':
          [view.showPages, err] = bool(attr.value);
          if (err) {
            return [undefined, new Error('show_pages: ' + err)];
          }
          break;
        case 'home_page':
          [view.homePage, err] = num(attr.value);
          if (err) {
            return [undefined, new Error('home_page: ' + err)];
          }
          break;
        case 'home_view':
          [view.homeView, err] = bool(attr.value);
          if (err) {
            return [undefined, new Error('home_view: ' + err)];
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

      let viewEl: ViewElement | undefined;
      [viewEl, err] = ViewElement.FromXML(child);
      if (err) {
        return [undefined, new Error('viewEl: ' + err)];
      }
      if (!view.elements) {
        view.elements = List<ViewElement>();
      }
      view.elements = view.elements.push(defined(viewEl));
    }

    return [new View(view), undefined];
  }

  toXml(doc: XMLDocument, parent: Element): boolean {
    return true;
  }
}

type GFType = 'continuous' | 'extrapolate' | 'discrete';

const GFDefaults = {
  name: '' as string | undefined,
  type: 'continuous' as GFType,
  xPoints: undefined as List<number> | undefined,
  yPoints: undefined as List<number> | undefined,
  xScale: undefined as Scale | undefined,
  yScale: undefined as Scale | undefined, // only affects the scale of the graph in the UI
};

export class GF extends Record(GFDefaults) implements XNode {
  constructor(gf: typeof GFDefaults) {
    super(gf);
  }

  toJSON(): any {
    return {
      '@class': 'GF',
      data: this.toJS(),
    };
  }

  static FromXML(el: Element): [GF, undefined] | [undefined, Error] {
    const table: typeof GFDefaults = Object.assign({}, GFDefaults);
    let err: Error | undefined;

    for (let i = 0; i < el.attributes.length; i++) {
      const attr = el.attributes.item(i);
      if (!attr) {
        continue;
      }
      switch (attr.name.toLowerCase()) {
        case 'type':
          const kind = attr.value.toLowerCase();
          if (kind === 'discrete' || kind === 'continuous' || kind === 'extrapolate') {
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
    if (table.type && table.type !== 'continuous') {
      console.log('WARN: unimplemented table type: ' + table.type);
    }

    return [new GF(table), undefined];
  }
}

const ScaleDefaults = {
  min: -1,
  max: -1,
};

export class Scale extends Record(ScaleDefaults) implements XNode {
  constructor(scale: typeof ScaleDefaults) {
    super(scale);
  }

  toJSON(): any {
    return {
      '@class': 'Scale',
      data: this.toJS(),
    };
  }

  static FromXML(el: Element): [Scale, undefined] | [undefined, Error] {
    let min: number | undefined;
    let max: number | undefined;
    let err: Error | undefined;

    for (let i = 0; i < el.attributes.length; i++) {
      const attr = el.attributes.item(i);
      if (!attr) {
        continue;
      }
      switch (attr.name.toLowerCase()) {
        case 'min':
          [min, err] = num(attr.value);
          if (err) {
            return [undefined, new Error(`bad min: ${attr.value}`)];
          }
          break;
        case 'max':
          [max, err] = num(attr.value);
          if (err) {
            return [undefined, new Error(`bad max: ${attr.value}`)];
          }
          break;
      }
    }

    if (min === undefined || max === undefined) {
      return [undefined, new Error('scale requires both min and max')];
    }

    return [new Scale({ min, max }), undefined];
  }
}

const ConnectionDefaults = {
  from: '',
  to: '',
};

export class Connection extends Record(ConnectionDefaults) implements XNode {
  constructor(conn: typeof ConnectionDefaults) {
    super(conn);
  }

  toJSON(): any {
    return {
      '@class': 'Connection',
      data: this.toJS(),
    };
  }

  static FromXML(el: Element): [Connection, undefined] | [undefined, Error] {
    let from: string | undefined;
    let to: string | undefined;

    for (let i = 0; i < el.attributes.length; i++) {
      const attr = el.attributes.item(i);
      if (!attr) {
        continue;
      }
      switch (attr.name.toLowerCase()) {
        case 'to':
          to = canonicalize(attr.value);
          break;
        case 'from':
          from = canonicalize(attr.value);
          break;
      }
    }

    if (to === undefined || from === undefined) {
      return [undefined, new Error('connect requires both to and from')];
    }

    return [new Connection({ from, to }), undefined];
  }

  toXml(doc: XMLDocument, parent: Element): boolean {
    return true;
  }
}
