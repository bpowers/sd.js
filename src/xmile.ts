// Copyright 2015 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

'use strict';

export function camelCase(s: string): string {
	'use strict';
	let i = 0;
	while ((i = s.indexOf('_')) >= 0 && i < s.length - 1) {
		s = s.slice(0, i) + s.slice(i+1, i+2).toUpperCase() + s.slice(i+2);
	}
	return s;
}

export function splitOnComma(str: string): string[] {
	'use strict';
	return str.split(',').map((el) => el.trim());
}

export function numberize(arr: string[]): number[] {
	'use strict';
	return arr.map((el) => parseFloat(el));
}

export function i32(n: number): number {
	'use strict';
	return n|0;
}

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

export interface XNode {
	// constructor(el: Element): XNode;
	toXml(doc: XMLDocument, parent: Element): boolean;
}

export class Point implements XNode {
	x: number;
	y: number;

	static Build(el: Node): [Point, Error] {
		let pt = new Point();
		let err: Error;

		for (let i = 0; i < el.attributes.length; i++) {
			let attr = el.attributes.item(i);
			switch (attr.name.toLowerCase()) {
			case 'x':
				[pt.x, err] = num(attr.value);
				if (err)
					return [null, new Error('x not num: ' + err.error)];
				break;
			case 'y':
				[pt.y, err] = num(attr.value);
				if (err)
					return [null, new Error('y not num: ' + err.error)];
				break;
			}
		}

		return [pt, err];
	}

	toXml(doc: XMLDocument, parent: Element): boolean {
		return true;
	}
}

export class Size implements XNode {
	width: number;
	height: number;

	constructor(el: Element) {
	}

	toXml(doc: XMLDocument, parent: Element): boolean {
		return true;
	}
}

export class Rect implements Point, Size, XNode {
	x: number;
	y: number;
	width: number;
	height: number;

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
			// XXX: hack for compat with some old models of mine
			if (name === 'savestep')
				name = 'saveStep';
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
				options.namespaces = splitOnComma(attr.value);
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

		for (let i = 0; i < el.attributes.length; i++) {
			let attr = el.attributes.item(i);
			switch (attr.name.toLowerCase()) {
			case 'name':
				model.name = attr.value;
				break;
			}
		}

		for (let i = 0; i < el.childNodes.length; i++) {
			let child = el.childNodes.item(i);
			if (child.nodeType !== 1) // Element
				continue;
			switch (child.nodeName.toLowerCase()) {
			case 'variables':
				for (let j = 0; j < child.childNodes.length; j++) {
					let vchild = child.childNodes.item(j);
					if (vchild.nodeType !== 1) // Element
						continue;
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
					if (vchild.nodeType !== 1) // Element
						continue;
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

// the 'Element' name is defined by the TypeScript lib.d.ts, so we're
// forced to be more verbose.
export class ArrayElement implements XNode {
	subscript: string[] = [];
	eqn:       string;
	gf:        GF;

	static Build(el: Node): [ArrayElement, Error] {
		let arrayEl = new ArrayElement();
		console.log('TODO: array element');
		return [arrayEl, null];
	}
	toXml(doc: XMLDocument, parent: Element): boolean {
		return true;
	}
}

// Section 4.1.1 - Ranges, Scales, Number Formats
export class Range implements XNode {
	min:   number;
	max:   number;
	// auto + group only valid on 'scale' tags
	auto:  boolean;
	group: number; // 'unique number identifier'

	static Build(el: Node): [Range, Error] {
		let range = new Range();
		console.log('TODO: range element');
		return [range, null];
	}
	toXml(doc: XMLDocument, parent: Element): boolean {
		return true;
	}
}

// Section 4.1.1 - Ranges, Scales, Number Formats
export class Format implements XNode {
	precision:   string  = ''; // "default: best guess based on the scale of the variable"
	scaleBy:     string  = '1';
	displayAs:   string  = 'number'; // "number"|"currency"|"percent"
	delimit000s: boolean = false; // include thousands separator

	static Build(el: Node): [Format, Error] {
		let fmt = new Format();
		console.log('TODO: format element');
		return [fmt, null];
	}
	toXml(doc: XMLDocument, parent: Element): boolean {
		return true;
	}
}

// TODO: split into multiple subclasses?
export class Variable implements XNode {
	type:            string = '';
	name:            string = '';
	eqn:             string = '';
	gf:              GF;
	// mathml        Node;
	// arrayed-vars
	dimensions:      Dimension[];    // REQUIRED for arrayed vars
	elements:        ArrayElement[]; // non-A2A
	// modules
	connections:     Connection[] = [];
	resource:        string;         // path or URL to model XMILE file
	// access:       string;         // TODO: not sure if should implement
	// autoExport:   boolean;        // TODO: not sure if should implement
	units:           Unit;
	doc:             string; // 'or HTML', but HTML is not valid XML.  string-only.
	// eventPoster   EventPoster;
	range:           Range;
	scale:           Range;
	format:          Format;
	// stocks
	nonNegative:     boolean;
	inflows:         string[] = [];
	outflows:        string[] = [];
	// flows
	// multiplier:   string; // expression used on downstream side of stock to convert units
	// queues
	// overflow:     boolean;
	// leak:         string;
	// leakIntegers: boolean;
	// leakStart:    number;
	// leakEnd:      number;
	// auxiliaries
	flowConcept:     boolean; // :(

	static Build(el: Node): [Variable, Error] {
		let v = new Variable();
		let err: Error;

		v.type = el.nodeName.toLowerCase();

		for (let i = 0; i < el.attributes.length; i++) {
			let attr = el.attributes.item(i);
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
			let child = el.childNodes.item(i);
			if (child.nodeType !== 1) // Element
				continue;
			switch (child.nodeName.toLowerCase()) {
			case 'eqn':
				v.eqn = content(child);
				break;
			case 'inflow':
				v.inflows.push(canonicalize(content(child)));
				break;
			case 'outflow':
				v.outflows.push(canonicalize(content(child)));
				break;
			case 'gf':
				[v.gf, err] = GF.Build(child);
				if (err)
					return [null, new Error(v.name + ' GF: ' + err.error)];
				break;
			case 'connect':
				let conn: Connection;
				[conn, err] = Connection.Build(child);
				if (err)
					return [null, new Error(v.name + ' conn: ' + err.error)];
				v.connections.push(conn);
				break;
			}
		}

		return [v, err];
	}

	get ident(): string {
		return canonicalize(this.name);
	}

	toXml(doc: XMLDocument, parent: Element): boolean {
		return true;
	}
}

export class Shape implements XNode {
	static Types: string[] = ['continuous', 'extrapolate', 'discrete'];
	type: string; // 'rectangle', 'circle', 'name_only'

	static Build(el: Node): [Shape, Error] {
		let shape = new Shape();
		let err: Error;

		for (let i = 0; i < el.attributes.length; i++) {
			let attr = el.attributes.item(i);
			switch (attr.name.toLowerCase()) {
			case 'type':
				shape.type = attr.value.toLowerCase();
				if (!(shape.type in Shape.Types))
					return [null, new Error('bad type: ' + shape.type)];
				break;
			}
		}
		return [shape, err];
	}

	toXml(doc: XMLDocument, parent: Element): boolean {
		return true;
	}
}

export class ViewElement implements XNode {
	type:              string;
	name:              string;
	uid:               number; // int
	x:                 number;
	y:                 number;
	width:             number;
	height:            number;
	shape:             Shape;
	borderWidth:       string; // 'thick'|'thin'|double, thick = 3, thin = 1
	borderColor:       string; // hex|predefined-color
	borderStyle:       string; // 'none'|'solid'
	fontFamily:        string;
	fontWeight:        string; // 'normal'|'bold'
	textDecoration:    string; // 'normal'|'underline'
	textAlign:         string; // 'left'|'right'|'center'
	verticalTextAlign: string; // 'top'|'center'|'bottom'
	fontColor:         string; // hex|predefined-color
	textBackground:    string; // hex|predefined-color
	fontSize:          number; // "<double>pt"
	padding:           number[];
	// "any attributes of a Border object"
	color:             string;
	background:        string;      // hex|predefined-color
	zIndex:            number; // default of -1, range of -1 to INT_MAX
	// "any attributes of a Text Style object"
	labelSide:         string; // 'top'|'left'|'center'|'bottom'|'right'
	labelAngle:        number; // degrees where 0 is 3 o'clock, counter-clockwise.
	// connectors
	from:              string; // ident
	to:                string; // ident
	angle:             number; // degrees
	// flows + multi-point connectors
	pts:               Point[];
	// alias
	of:                string;

	static Build(el: Node): [ViewElement, Error] {
		let viewEl = new ViewElement();
		let err: Error;

		viewEl.type = el.nodeName.toLowerCase();

		for (let i = 0; i < el.attributes.length; i++) {
			let attr = el.attributes.item(i);
			switch (attr.name.toLowerCase()) {
			case 'name':
				viewEl.name = canonicalize(attr.value);
				break;
			case 'x':
				[viewEl.x, err] = num(attr.value);
				if (err)
					return [null, new Error('x: ' + err.error)];
				break;
			case 'y':
				[viewEl.y, err] = num(attr.value);
				if (err)
					return [null, new Error('y: ' + err.error)];
				break;
			case 'width':
				[viewEl.width, err] = num(attr.value);
				if (err)
					return [null, new Error('width: ' + err.error)];
				break;
			case 'height':
				[viewEl.height, err] = num(attr.value);
				if (err)
					return [null, new Error('height: ' + err.error)];
				break;
			case 'label_side':
				viewEl.labelSide = attr.value.toLowerCase();
				break;
			case 'label_angle':
				[viewEl.labelAngle, err] = num(attr.value);
				if (err)
					return [null, new Error('label_angle: ' + err.error)];
				break;
			case 'color':
				viewEl.color = attr.value.toLowerCase();
				break;
			case 'angle':
				[viewEl.angle, err] = num(attr.value);
				if (err)
					return [null, new Error('angle: ' + err.error)];
				break;
			}
		}

		for (let i = 0; i < el.childNodes.length; i++) {
			let child = el.childNodes.item(i);
			if (child.nodeType !== 1) // Element
				continue;

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
					let vchild = child.childNodes.item(j);
					if (vchild.nodeType !== 1) // Element
						continue;
					if (vchild.nodeName.toLowerCase() !== 'pt')
						continue;
					let pt: Point;
					[pt, err] = Point.Build(vchild);
					// FIXME: real logging
					if (err)
						return [null, new Error('pt: ' + err.error)];
					if (typeof viewEl.pts === 'undefined')
						viewEl.pts = [];
					viewEl.pts.push(pt);
				}

				break;
			}
		}

		return [viewEl, err];
	}

	toXml(doc: XMLDocument, parent: Element): boolean {
		return true;
	}
}


export class View implements XNode {
	type:            string        = 'stock_flow'; // 'stock_flow'|'interface'|'popup'|vendor-specific
	order:           number;
	width:           number;
	height:          number;
	zoom:            number        = 100; // '100' means 1x zoom
	scrollX:         number        = 0;   // before zoom is applied
	scrollY:         number        = 0;   // before zoom is applied
	background:      string;              // 'color' or file: URL
	pageWidth:       number;
	pageHeight:      number;
	pageSequence:    string; // 'row'|'column'
	pageOrientation: string; // 'landscape|portrait'
	showPages:       boolean;
	homePage:        number        = 0;
	homeView:        boolean       = false;

	elements:        ViewElement[] = [];

	static Build(el: Node): [View, Error] {
		let view = new View();
		let err: Error;

		for (let i = 0; i < el.attributes.length; i++) {
			let attr = el.attributes.item(i);
			switch (attr.name.toLowerCase()) {
			case 'type':
				view.type = attr.value.toLowerCase();
				break;
			case 'order':
				[view.order, err] = num(attr.value);
				if (err)
					return [null, new Error('order: ' + err.error)];
				break;
			case 'width':
				[view.width, err] = num(attr.value);
				if (err)
					return [null, new Error('width: ' + err.error)];
				break;
			case 'height':
				[view.height, err] = num(attr.value);
				if (err)
					return [null, new Error('height: ' + err.error)];
				break;
			case 'zoom':
				[view.zoom, err] = num(attr.value);
				if (err)
					return [null, new Error('zoom: ' + err.error)];
				break;
			case 'scroll_x':
				[view.scrollX, err] = num(attr.value);
				if (err)
					return [null, new Error('scroll_x: ' + err.error)];
				break;
			case 'scroll_y':
				[view.scrollY, err] = num(attr.value);
				if (err)
					return [null, new Error('scroll_y: ' + err.error)];
				break;
			case 'background':
				view.background = attr.value.toLowerCase();
				break;
			case 'page_width':
				[view.pageWidth, err] = num(attr.value);
				if (err)
					return [null, new Error('page_width: ' + err.error)];
				break;
			case 'page_height':
				[view.pageHeight, err] = num(attr.value);
				if (err)
					return [null, new Error('page_height: ' + err.error)];
				break;
			case 'page_sequence':
				view.pageSequence = attr.value.toLowerCase();
				break;
			case 'page_orientation':
				view.pageOrientation = attr.value.toLowerCase();
				break;
			case 'show_pages':
				[view.showPages, err] = bool(attr.value);
				if (err)
					return [null, new Error('show_pages: ' + err.error)];
				break;
			case 'home_page':
				[view.homePage, err] = num(attr.value);
				if (err)
					return [null, new Error('home_page: ' + err.error)];
				break;
			case 'home_view':
				[view.homeView, err] = bool(attr.value);
				if (err)
					return [null, new Error('home_view: ' + err.error)];
				break;
			}
		}

		for (let i = 0; i < el.childNodes.length; i++) {
			let child = el.childNodes.item(i);
			if (child.nodeType !== 1) // Element
				continue;

			let viewEl: ViewElement;
			[viewEl, err] = ViewElement.Build(child);
			if (err)
				return [null, new Error('viewEl: ' + err.error)];
			view.elements.push(viewEl);
		}

		return [view, err];
	}

	toXml(doc: XMLDocument, parent: Element): boolean {
		return true;
	}
}

export class GF implements XNode {
	static Types: string[] = ['continuous', 'extrapolate', 'discrete'];

	name:     string; // for when the
	type:     string = 'continuous';
	xPoints:  number[];
	yPoints:  number[];
	xScale:   Scale;
	yScale:   Scale; // only affects the scale of the graph in the UI


	static Build(el: Node): [GF, Error] {
		let table = new GF();
		let err: Error;

		for (let i = 0; i < el.attributes.length; i++) {
			let attr = el.attributes.item(i);
			switch (attr.name.toLowerCase()) {
			case 'type':
				table.type = attr.value.toLowerCase();
				if (!(table.type in GF.Types))
					return [null, new Error('bad type: ' + table.type)];
				break;
			}
		}

		for (let i = 0; i < el.childNodes.length; i++) {
			let child = el.childNodes.item(i);
			if (child.nodeType !== 1) // Element
				continue;
			switch (child.nodeName.toLowerCase()) {
			case 'xscale':
				[table.xScale, err] = Scale.Build(child);
				if (err)
					return [null, new Error('xscale: ' + err.error)];
				break;
			case 'yscale':
				[table.yScale, err] = Scale.Build(child);
				if (err)
					return [null, new Error('yscale: ' + err.error)];
				break;
			case 'xpts':
				table.xPoints = numberize(splitOnComma(content(child)));
				break;
			case 'ypts':
				table.yPoints = numberize(splitOnComma(content(child)));
				break;
			}
		}

		if (!table.yPoints)
			return [null, new Error('table missing ypts')];

		// FIXME: handle
		if (table.type !== 'continuous')
			console.log('WARN: unimplemented table type: ' + table.type);

		return [table, err];
	}

	toXml(doc: XMLDocument, parent: Element): boolean {
		return true;
	}
}

export class Scale implements XNode {
	min: number;
	max: number;

	static Build(el: Node): [Scale, Error] {
		let scale = new Scale();
		let err: Error;

		for (let i = 0; i < el.attributes.length; i++) {
			let attr = el.attributes.item(i);
			switch (attr.name.toLowerCase()) {
			case 'min':
				[scale.min, err] = num(attr.value);
				if (err)
					return [null, new Error('bad min: ' + attr.value)];
				break;
			case 'max':
				[scale.max, err] = num(attr.value);
				if (err)
					return [null, new Error('bad max: ' + attr.value)];
				break;
			}
		}

		if (!scale.hasOwnProperty('min') || !scale.hasOwnProperty('max')) {
			return [null, new Error('scale requires both min and max')];
		}

		return [scale, null];
	}

	toXml(doc: XMLDocument, parent: Element): boolean {
		return true;
	}
}

export class Connection implements XNode {
	to:   string;
	from: string;

	static Build(el: Node): [Connection, Error] {
		let conn = new Connection();
		let err: Error;

		for (let i = 0; i < el.attributes.length; i++) {
			let attr = el.attributes.item(i);
			switch (attr.name.toLowerCase()) {
			case 'to':
				conn.to = canonicalize(attr.value);
				break;
			case 'from':
				conn.from = canonicalize(attr.value);
				break;
			}
		}

		if (!conn.hasOwnProperty('to') || !conn.hasOwnProperty('from')) {
			return [null, new Error('connect requires both to and from')];
		}

		return [conn, null];
	}

	toXml(doc: XMLDocument, parent: Element): boolean {
		return true;
	}
}

export function canonicalize(id: string): string {
	'use strict';
	let quoted = false;
	if (id.length > 1) {
		let f = id.slice(0, 1);
		let l = id.slice(id.length-1);
		quoted = f === '"' && l === '"';
	}
	id = id.toLowerCase();
	id = id.replace(/\\n/g, '_');
	id = id.replace(/\\\\/g, '\\');
	id = id.replace(/\\"/g, '\\');
	id = id.replace(/[_\r\n\t \xa0]+/g, '_');
	if (quoted)
		return id.slice(1, -1);
	return id;
}
