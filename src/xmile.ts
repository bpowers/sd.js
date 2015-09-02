// Copyright 2015 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

'use strict';

import {camelCase, i32} from './util';

export class Error {
	constructor(
		public error: string) {}
}

declare function isFinite(n: string|number): boolean;

// expects name to be lowercase
function attr(node: Node, name: string): string {
	'use strict';
	for (let i = 0; i < node.attributes.length; i++) {
		let attr = node.attributes.item(i);
		if (attr.name.toLowerCase() === name)
			return attr.value;
	}
	return null;
}

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

function content(node: Node): string {
	'use strict';
	let text = '';
	if (node.hasChildNodes()) {
		for (let i = 0; i < node.childNodes.length; i++) {
			let child: Node = node.childNodes.item(i);
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
	let n = parseFloat(v);
	if (isFinite(n))
		return [n, null];
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
	version:    string;
	namespace:  string      = 'https://docs.oasis-open.org/xmile/ns/XMILE/v1.0';
	header:     Header;
	simSpec:    SimSpec;
	dimensions: Dimension[] = [];
	units:      Unit[]      = [];
	behavior:   Behavior;
	style:      Style;
	models:     Model[]     = [];

	static Build(el: Node): [File, Error] {
		let file = new File();
		let err: Error = null;

		for (let i = 0; i < el.attributes.length; i++) {
			let attr = el.attributes.item(i);
			switch (attr.name.toLowerCase()) {
			case 'version':
				file.version = attr.value;
				break;
			case 'xmlns':
				file.namespace = attr.value;
				break;
			}
		}

		for (let i = 0; i < el.childNodes.length; i++) {
			let model: Model;
			let child = el.childNodes.item(i);
			if (child.nodeType !== 1) // Element
				continue;
			switch (child.nodeName.toLowerCase()) {
			case 'header':
				[file.header, err] = Header.Build(child);
				if (err)
					return [null, new Error('Header: ' + err.error)];
				break;
			case 'sim_specs':
				[file.simSpec, err] = SimSpec.Build(child);
				if (err)
					return [null, new Error('SimSpec: ' + err.error)];
				break;
			case 'model':
				[model, err] = Model.Build(child);
				if (err)
					return [null, new Error('SimSpec: ' + err.error)];
				file.models.push(model);
				break;
			}
		}

		console.log('version: ' + file.version);
		console.log('namespace: ' + file.namespace);
		console.log('header: ' + file.header);
		console.log('sim_spec: ' + file.simSpec);
		console.log('models: ' + file.models.length);

		return [file, err];
	}

	toXml(doc: XMLDocument, parent: Element): boolean {
		return true;
	}
}

export class SimSpec implements XNode {
	public start:     number = 0;
	public stop:      number = 1;
	public dt:        number = 1;
	public saveStep:  number = 0;
	public method:    string = 'euler';
	public timeUnits: string = '';

	[indexName: string]: any;

	static Build(el: Node): [SimSpec, Error] {
		let simSpec = new SimSpec();
		let err: Error;
		for (let i = 0; i < el.childNodes.length; i++) {
			let child = el.childNodes.item(i);
			if (child.nodeType !== 1) // Element
				continue;
			let name = camelCase(child.nodeName.toLowerCase());
			if (!simSpec.hasOwnProperty(name))
				continue;

			if (name === 'method' || name === 'timeUnits') {
				simSpec[name] = content(child);
			} else {
				[simSpec[name], err] = num(content(child));
				if (err)
					return [null, new Error(child.nodeName + ': ' + err.error)];
			}
		}

		if (!simSpec.saveStep)
			simSpec.saveStep = simSpec.dt;

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
				'valid but unsupported integration ' +
					'method: ' + simSpec.method +
					'. using euler');
			simSpec.method = 'euler';
			break;
		// unknown
		default:
			return [null, new Error('unknown integration method ' + simSpec.method)];
		}

		return [simSpec, null];
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

export class Product implements XNode {
	name:    string = 'unknown';
	lang:    string = 'English';
	version: string = '';

	static Build(el: Node): [Product, Error] {
		let product = new Product();
		product.name = content(el);
		for (let i = 0; i < el.attributes.length; i++) {
			let attr = el.attributes.item(i);
			switch (attr.name.toLowerCase()) {
			case 'version':
				product.version = attr.value;
				break;
			case 'lang':
				product.lang = attr.value;
				break;
			}
		}
		return [product, null];
	}

	toXml(doc: XMLDocument, parent: Element): boolean {
		return true;
	}
}

export class Header implements XNode {
	vendor:      string;
	product:     Product;
	options:     Options;
	name:        string;
	version:     string;
	caption:     string; // WTF is this
	// image:    Image;
	author:      string;
	affiliation: string;
	client:      string;
	copyright:   string;
	// contact:  Contact;
	created:     string; // ISO 8601 date format, e.g. “ 2014-08-10”
	modified:    string; // ISO 8601 date format
	uuid:        string; // IETF RFC4122 format (84-4-4-12 hex digits with the dashes)
	// includes: Include[];

	static Build(el: Node): [Header, Error] {
		let header = new Header();
		let err: Error;
		for (let i = 0; i < el.childNodes.length; i++) {
			let child = el.childNodes.item(i);
			if (child.nodeType !== 1) // Element
				continue;
			switch (child.nodeName.toLowerCase()) {
			case 'vendor':
				header.vendor = content(child);
				break;
			case 'product':
				[header.product, err] = Product.Build(child);
				if (err)
					return [null, new Error('Product: ' + err.error)];
				break;
			case 'options':
				[header.options, err] = Options.Build(child);
				if (err)
					return [null, new Error('Options: ' + err.error)];
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
		return [header, err];
	}

	toXml(doc: XMLDocument, parent: Element): boolean {
		return true;
	}
}

export class Dimension implements XNode {
	name: string = '';
	size: string = '';

	static Build(el: Node): [Dimension, Error] {
		let dim = new Dimension();
		// TODO: implement
		return [dim, null];
	}

	toXml(doc: XMLDocument, parent: Element): boolean {
		return true;
	}
}

export class Options implements XNode {
	namespaces:        string[] = [];
	usesArrays:        boolean  = false;
	usesMacros:        boolean  = false;
	usesConveyor:      boolean  = false;
	usesQueue:         boolean  = false;
	usesSubmodels:     boolean  = false;
	usesEventPosters:  boolean  = false;
	hasModelView:      boolean  = false;
	usesOutputs:       boolean  = false;
	usesInputs:        boolean  = false;
	usesAnnotation:    boolean  = false;

	// arrays
	maximumDimensions: number   = 1;
	invalidIndexValue: number   = 0; // only 0 or NaN
	// macros
	recursiveMacros:   boolean  = false;
	optionFilters:     boolean  = false;
	// conveyors
	arrest:            boolean  = false;
	leak:              boolean  = false;
	// queues
	overflow:          boolean  = false;
	// event posters
	messages:          boolean  = false;
	// outputs
	numericDisplay:    boolean  = false;
	lamp:              boolean  = false;
	gauge:             boolean  = false;
	// inputs
	numericInput:      boolean  = false;
	list:              boolean  = false;
	graphicalInput:    boolean  = false;

	// avoids an 'implicit any' error when setting options in
	// Build below 'indexName' to avoid a spurious tslint
	// 'shadowed name' error.
	[indexName: string]: any;

	static Build(el: Node): [Options, Error] {
		let options = new Options();
		let err: Error;
		for (let i = 0; i < el.attributes.length; i++) {
			let attr = el.attributes.item(i);
			switch (attr.name.toLowerCase()) {
			case 'namespace':
				let names = attr.value.split(',');
				options.namespaces = names.map((s) => s.trim());
				break;
			}
		}
		for (let i = 0; i < el.childNodes.length; i++) {
			let child = el.childNodes.item(i);
			if (child.nodeType !== 1) // Element
				continue;
			let name = child.nodeName.toLowerCase();
			let plen: number;
			if (name.slice(0, 5) === 'uses_')
				plen = 4;
			else if (name.substring(0, 4) !== 'has_')
				plen = 3;
			if (!plen)
				continue;
			// use slice here even for the single char we
			// are camel-casing to avoid having to check
			// the length of the string
			name = camelCase(name);
			if (!options.hasOwnProperty(name))
				continue;

			options[name] = true;

			if (name === 'usesArrays') {
				let val: string;
				val = attr(child, 'maximum_dimensions');
				if (val) {
					let n: number;
					[n, err] = num(val);
					if (err) {
						// FIXME: real logging
						console.log('bad max_dimensions( ' + val + '): ' + err.error);
						n = 1;
					}
					if (n !== i32(n)) {
						console.log('non-int max_dimensions: ' + val);
					}
					options.maximumDimensions = i32(n);
				}
				val = attr(child, 'invalid_index_value');
				if (val === 'NaN')
					options.invalidIndexValue = NaN;
			}
		}
		return [options, err];
	}

	toXml(doc: XMLDocument, parent: Element): boolean {
		return true;
	}
}

export class Behavior implements XNode {
	allNonNegative:   boolean = false;
	stockNonNegative: boolean = false;
	flowNonNegative:  boolean = false;

	static Build(el: Node): [Behavior, Error] {
		let behavior = new Behavior();
		// TODO
		return [behavior, null];
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
	name:        string     = '';
	run:         boolean    = false;
	namespaces:  string[];
	resource:    string; // path or URL to separate resource file
	simSpec:     SimSpec;
	// behavior: Behavior;
	variables:   Variable[] = [];
	views:       View[]     = [];

	static Build(el: Node): [Model, Error] {
		let model = new Model();
		let err: Error;
		for (let i = 0; i < el.childNodes.length; i++) {
			let child = el.childNodes.item(i);
			if (child.nodeType !== 1) // Element
				continue;
			switch (child.nodeName.toLowerCase()) {
			case 'variables':
				for (let j = 0; j < child.childNodes.length; j++) {
					let vchild = child.childNodes.item(j);
					let v: Variable;
					[v, err] = Variable.Build(vchild);
					// FIXME: real logging
					if (err)
						return [null, new Error(child.nodeName + ' var: ' + err.error)];
					model.variables.push(v);
				}
				break;
			case 'views':
				for (let j = 0; j < child.childNodes.length; j++) {
					let vchild = child.childNodes.item(j);
					let view: View;
					[view, err] = View.Build(vchild);
					// FIXME: real logging
					if (err)
						return [null, new Error('view: ' + err.error)];
					model.views.push(view);
				}
				break;
			}
		}
		return [model, null];
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

	static Build(el: Node): [Variable, Error] {
		let v = new Variable();
		let err: Error;

		return [v, err];
	}

	toXml(doc: XMLDocument, parent: Element): boolean {
		return true;
	}
}

export class View implements XNode {

	static Build(el: Node): [View, Error] {
		let view = new View();
		let err: Error;

		return [view, err];
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
