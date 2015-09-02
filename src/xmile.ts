// Copyright 2015 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

'use strict';

export class Error {
	constructor(
		public error: string) {}
}

declare function isFinite(n: string|number): boolean;

function parseText(val: string): string|boolean|number {
	'use strict';
	val = val.trim();
	if (/^\s*$/.test(val))
		return null;
	if (/^(?:true|false)$/i.test(val))
		return val.toLowerCase() === 'true';
	if (isFinite(val))
		return parseFloat(val);
	return val;
}

function content(node: Node): string|boolean|number {
	'use strict';
	let text = '';
	if (node.hasChildNodes()) {
		for (let i = 0; i < node.childNodes.length; i++) {
			let child: Node = node.childNodes.item(i);
			switch (child.nodeType) {
			case 4: // CData
				text += child.nodeValue;
				break;
			case 3: // Text
				text += child.nodeValue.trim();
				break;
			default: // don't care about any other types
				break;
			}
		}
	}
	return parseText(text);
}

function str(v: any): [string, Error] {
	'use strict';
	if (typeof v === 'undefined' || v === null)
		return ['', null];
	if (typeof v === 'string')
		return [v, null];
	return ['', new Error('not string: ' + v)];
}

function num(v: any): [number, Error] {
	'use strict';
	if (typeof v === 'undefined' || v === null)
		return [0, null];
	if (typeof v === 'number')
		return [v, null];
	return [NaN, new Error('not number: ' + v)];
}

function bool(v: any): [boolean, Error] {
	'use strict';
	if (typeof v === 'undefined' || v === null)
		return [false, null];
	if (typeof v === 'boolean')
		return [v, null];
	// XXX: should we accept 0 or 1?
	return [false, new Error('not boolean: ' + v)];
}

export interface XNodeStatic {
	new (el: Element): XNodeStatic;
}

export interface XNode {
	// constructor(el: Element): XNode;
	toXml(doc: XMLDocument, parent: Element): boolean;
}

export class Point implements XNode {
	X: number;
	Y: number;

	constructor(el: Element) {
	}

	toXml(doc: XMLDocument, parent: Element): boolean {
		return true;
	}
}

export class Size implements XNode {
	Width: number;
	Height: number;

	constructor(el: Element) {
	}

	toXml(doc: XMLDocument, parent: Element): boolean {
		return true;
	}
}

export class Rect implements Point, Size, XNode {
	X: number;
	Y: number;
	Width: number;
	Height: number;

	constructor(el: Element) {
	}

	toXml(doc: XMLDocument, parent: Element): boolean {
		return true;
	}
}

export class File implements XNode {
	constructor(
		public version:    string,
		public namespace:  string,
		public header:     Header,
		public simSpec:    SimSpec,
		public dimensions: Dimension[],
		public units:      Unit[],
		public behavior:   Behavior,
		public style:      Style,
		public models:     Model[]) {
	}

	static Build(el: Element): [File, Error] {
		let err: Error;
		let sval: string;
		let version: string;
		let namespace: string;
		for (let i = 0; i < el.attributes.length; i++) {
			let attrib = el.attributes.item(i);
			let name = attrib.name.toLowerCase();
			let val = parseText(attrib.value);
			switch (name) {
			case 'version':
				[sval, err] = str(val);
				if (err)
					return [null, err];
				version = sval;
				break;
			case 'xmlns':
				[sval, err] = str(val);
				if (err)
					return [null, err];
				version = sval;
				break;
			default:
				break;
			}
		}
		console.log('version: ' + version);
		console.log('namespace: ' + namespace);

		return [null, null];
	}

	toXml(doc: XMLDocument, parent: Element): boolean {
		return true;
	}
}

export class SimSpec implements XNode {
	constructor(
		public start:     number,
		public stop:      number,
		public dt:        number,
		public saveStep:  number = dt,
		public method:    string = 'euler',
		public timeUnits: string = '') {}

	static Build(el: Element): [SimSpec, Error] {
		let method = '';
		switch (method) {
		// supported
		case 'euler':
			break;
		// valid, but not implemented
		case 'rk4':
		case 'rk2':
		case 'rk45':
		case 'gear':
			console.log(
				'valid but unsupported integration ' +
					'method: ' + method + '. using euler');
			method = 'euler';
			break;
		// unknown
		default:
			return [null, new Error('unknown integration method ' + method)];
		}
	}

	toXml(doc: XMLDocument, parent: Element): boolean {
		return true;
	}
}

export class Unit implements XNode {
	name:  string;
	eqn:   string;
	alias: string;

	constructor(el: Element) {
	}

	toXml(doc: XMLDocument, parent: Element): boolean {
		return true;
	}
}

export class Header implements XNode {
	options: Options;
	name:    string;
	uuid:    string;
	vendor:  string;
	product: string;

	constructor(el: Element) {
	}

	toXml(doc: XMLDocument, parent: Element): boolean {
		return true;
	}
}

export class Dimension implements XNode {
	name: string;
	size: string;

	constructor(el: Element) {
	}

	toXml(doc: XMLDocument, parent: Element): boolean {
		return true;
	}
}

export class Options implements XNode {
	namespaces:       string[];
	usesConveyor:     boolean;
	usesQueue:        boolean;
	usesArrays:       boolean;
	usesSubmodels:    boolean;
	usesMacros:       boolean;
	usesEventPosters: boolean;
	hasModelView:     boolean;
	usesOutputs:      boolean;
	usesInputs:       boolean;
	usesAnnotations:  boolean;

	constructor(el: Element) {
	}

	toXml(doc: XMLDocument, parent: Element): boolean {
		return true;
	}
}

export class Behavior implements XNode {
	allNonNegative:   boolean;
	stockNonNegative: boolean;
	flowNonNegative:  boolean;

	constructor(el: Element) {
	}

	toXml(doc: XMLDocument, parent: Element): boolean {
		return true;
	}
}

// TODO: kill me
export class Style implements XNode {

	constructor(el: Element) {
	}

	toXml(doc: XMLDocument, parent: Element): boolean {
		return true;
	}
}

// TODO: same here
export class Data implements XNode {

	constructor(el: Element) {
	}

	toXml(doc: XMLDocument, parent: Element): boolean {
		return true;
	}
}

export class Model implements XNode {
	name:      string;
	simSpec:   SimSpec;
	variables: Variable[];
	views:     View[];

	constructor(el: Element) {
	}

	get ident(): string {
		return canonicalize(this.name);
	}

	toXml(doc: XMLDocument, parent: Element): boolean {
		return true;
	}
}

export class Variable implements XNode {
	name:     string;
	doc:      string;
	eqn:      string;
	nonNeg:   boolean;
	inflows:  string[];
	outflows: string[];
	units:    string;
	gf:       GF;
	params:   Connect[];

	constructor(el: Element) {
	}

	toXml(doc: XMLDocument, parent: Element): boolean {
		return true;
	}
}

export class View implements XNode {

	constructor(el: Element) {
	}

	toXml(doc: XMLDocument, parent: Element): boolean {
		return true;
	}
}

export class GF implements XNode {
	discrete: boolean;
	xPoints:  string;
	yPoints:  string;
	xScale:   Scale;
	yScale:   Scale;

	constructor(el: Element) {
	}

	toXml(doc: XMLDocument, parent: Element): boolean {
		return true;
	}
}

export class Scale implements XNode {
	min: number;
	max: number;

	constructor(el: Element) {
	}

	toXml(doc: XMLDocument, parent: Element): boolean {
		return true;
	}
}

export class Connect implements XNode {
	to:   string;
	from: string;

	constructor(el: Element) {
	}

	toXml(doc: XMLDocument, parent: Element): boolean {
		return true;
	}
}

export function canonicalize(id: string): string {
	'use strict';
	id = id.toLowerCase();
	id = id.replace(/\\n/g, '_');
	id = id.replace(/\\\\/g, '\\');
	id = id.replace(/\\"/g, '\\');
	return id.replace(/[_\r\n\t \xa0]+/g, '_');
}
