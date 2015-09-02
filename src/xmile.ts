// Copyright 2015 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

'use strict';

export class Error {
	constructor(
		public error: string) {}
}

export interface NodeStatic {
	new (el: Element): NodeStatic;
}

export interface Node {
	// constructor(el: Element): Node;
	toXml(doc: XMLDocument, parent: Element): boolean;
}

export interface Builder<N extends Node> {
	(el: Element): [N, Error];
}

export function PointBuilder(el: Element): [Point, Error] {
	'use strict';
	return [null, null];
}

let b: Builder<Point> = PointBuilder;

export class Point implements Node {
	X: number;
	Y: number;

	constructor(el: Element) {
	}

	toXml(doc: XMLDocument, parent: Element): boolean {
		return true;
	}
}

export class Size implements Node {
	Width: number;
	Height: number;

	constructor(el: Element) {
	}

	toXml(doc: XMLDocument, parent: Element): boolean {
		return true;
	}
}

export class Rect implements Point, Size, Node {
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

export function FileBuilder(el: Element): [File, Error] {
	'use strict';
	return [null, null];
}

export class File implements Node {
	version:    string;
	level:      number;
	header:     Header;
	simSpec:    SimSpec;
	dimensions: Dimension[];
	units:      Unit[];
	behavior:   Behavior;
	style:      Style;
	models:     Model[];

	constructor(el: Element) {
	}

	static Build(el: Element): [File, Error] {
		return [null, null];
	}

	toXml(doc: XMLDocument, parent: Element): boolean {
		return true;
	}
}

export class SimSpec implements Node {
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

export class Unit implements Node {
	name:  string;
	eqn:   string;
	alias: string;

	constructor(el: Element) {
	}

	toXml(doc: XMLDocument, parent: Element): boolean {
		return true;
	}
}

export class Header implements Node {
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

export class Dimension implements Node {
	name: string;
	size: string;

	constructor(el: Element) {
	}

	toXml(doc: XMLDocument, parent: Element): boolean {
		return true;
	}
}

export class Options implements Node {
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

export class Behavior implements Node {
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
export class Style implements Node {

	constructor(el: Element) {
	}

	toXml(doc: XMLDocument, parent: Element): boolean {
		return true;
	}
}

// TODO: same here
export class Data implements Node {

	constructor(el: Element) {
	}

	toXml(doc: XMLDocument, parent: Element): boolean {
		return true;
	}
}

export class Model implements Node {
	name:      string;
	variables: Variable[];
	views:     View[];

	constructor(el: Element) {
	}

	toXml(doc: XMLDocument, parent: Element): boolean {
		return true;
	}
}

export class Variable implements Node {
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

export class View implements Node {

	constructor(el: Element) {
	}

	toXml(doc: XMLDocument, parent: Element): boolean {
		return true;
	}
}

export class GF implements Node {
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

export class Scale implements Node {
	min: number;
	max: number;

	constructor(el: Element) {
	}

	toXml(doc: XMLDocument, parent: Element): boolean {
		return true;
	}
}

export class Connect implements Node {
	to:   string;
	from: string;

	constructor(el: Element) {
	}

	toXml(doc: XMLDocument, parent: Element): boolean {
		return true;
	}
}
