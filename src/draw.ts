// Copyright 2015 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

/// <reference path="../typings/tsd.d.ts" />

/// <amd-dependency path="../bower_components/hammerjs/hammer" />
/// <amd-dependency path="../bower_components/Snap.svg/dist/snap.svg" />

'use strict';

import * as type from './type';
import * as vars from './vars';
import * as runtime from './runtime';
import * as xmile from './xmile';

import {dName, isNaN} from "./util";

const PI = Math.PI;
const sin = Math.sin;
const cos = Math.cos;
const tan = Math.tan;
const atan2 = Math.atan2;
const sqrt = Math.sqrt;
const abs = Math.abs;

const AUX_RADIUS = 9;
const LABEL_PAD = 6;
const STROKE = 1;
const CLOUD_PATH = 'M 25.731189,3.8741489 C 21.525742,3.8741489 18.07553,7.4486396 17.497605,'+
	'12.06118 C 16.385384,10.910965 14.996889,10.217536 13.45908,10.217535 C 9.8781481,'+
	'10.217535 6.9473481,13.959873 6.9473482,18.560807 C 6.9473482,19.228828 7.0507906,'+
	'19.875499 7.166493,20.498196 C 3.850265,21.890233 1.5000346,25.3185 1.5000346,29.310191'+
	' C 1.5000346,34.243794 5.1009986,38.27659 9.6710049,38.715902 C 9.6186538,39.029349 '+
	'9.6083922,39.33212 9.6083922,39.653348 C 9.6083922,45.134228 17.378069,49.59028 '+
	'26.983444,49.590279 C 36.58882,49.590279 44.389805,45.134229 44.389803,39.653348 C '+
	'44.389803,39.35324 44.341646,39.071755 44.295883,38.778399 C 44.369863,38.780301 '+
	'44.440617,38.778399 44.515029,38.778399 C 49.470875,38.778399 53.499966,34.536825 '+
	'53.499965,29.310191 C 53.499965,24.377592 49.928977,20.313927 45.360301,19.873232 C '+
	'45.432415,19.39158 45.485527,18.91118 45.485527,18.404567 C 45.485527,13.821862 '+
	'42.394553,10.092543 38.598118,10.092543 C 36.825927,10.092543 35.215888,10.918252 '+
	'33.996078,12.248669 C 33.491655,7.5434856 29.994502,3.8741489 25.731189,3.8741489 z';
const CLOUD_WIDTH = 55;
const ARROWHEAD_RADIUS = 4;
const CLOUD_RADIUS = 8;
// FIXME(bp) this is a whack workaround, need to figure out a
// better way to decide when to inverse a connector curve
const INVERSE_FUZZ = 6;
const MODULE_R = 5;
const TEXT_ATTR: {[attr: string]: string|number|boolean|any} = {
	'font-size': '10px',
	'font-family': 'Roboto, "Open Sans", sans-serif',
	'font-weight': '300',
	'text-anchor': 'middle',
	'white-space': 'nowrap',
	'vertical-align': 'middle',
};
const COLOR_CONN = 'gray';
const COLOR_AUX = 'black';
const Z_ORDER: {[n: string]: number} = {
	'flow': 1,
	'module': 2,
	'stock': 3,
	'aux': 4,
	'connector': 5,
};
const MIN_SCALE = .2;
const Z_MAX = 6;
// designed, empirically, to match what Stella v10 considers 'straight'
const STRAIGHT_LINE_MAX = 12; // degrees
// FIXME: The new IE packaged with Windows 10 helpfully identifies
// itself as 'Chrome', but doesn't implement the same SVG extensions
// (getBBox on a tspan).  Instead of this hack, should do feature
// detection.
const IS_CHROME =
	typeof navigator !== 'undefined' &&
	navigator.userAgent.match(/Chrome/) &&
	!navigator.userAgent.match(/Edge/);

function addCSSClass(o: any, newClass: string): void {
	'use strict';
	let existingClass = o.getAttribute('class');
	if (existingClass) {
		o.setAttribute('class', existingClass + ' ' + newClass);
	} else {
		o.setAttribute('class', newClass);
	}
}

function isZero(n: number, tolerance = 0.0000001): boolean {
	'use strict';
	return Math.abs(n) < tolerance;
}

function isEqual(a: number, b: number, tolerance = 0.0000001): boolean {
	'use strict';
	return isZero(a - b, tolerance);
}

// FIXME: this is sort of gross, but works.  The main use is to check
// the result
function isInf(n: number): boolean {
	'use strict';
	return !isFinite(n) || n > 2e14;
}

function square(n: number): number {
	'use strict';
	return Math.pow(n, 2);
}

interface Point {
	x: number;
	y: number;
}

interface Circle extends Point {
	r: number;
}

function pt(x: number, y: number): Point {
	'use strict';
	return {'x': x, 'y': y};
}

const SIDE_MAP: {[index: number]: string} = {
	0: 'right',
	1: 'bottom',
	2: 'left',
	3: 'top',
};

function findSide(element: xmile.ViewElement, defaultSide = 'bottom'): string {
	'use strict';

	if (element.labelSide) {
		let side = element.labelSide;
		// FIXME(bp) handle center 'side' case
		if (side === 'center')
			return defaultSide;
		return side;
	}
	if (element.hasOwnProperty('labelAngle')) {
		let θ = (element.labelAngle + 45) % 360;
		let i = (θ/90)|0;
		return SIDE_MAP[i];
	}
	return defaultSide;
}

function cloudAt(paper: Snap.Paper, x: number, y: number): Snap.Element {
	'use strict';
	const scale = (AUX_RADIUS*2/CLOUD_WIDTH);
	let t = 'matrix(' + scale + ', 0, 0, ' + scale + ', ' +
		(x - AUX_RADIUS) + ', ' + (y - AUX_RADIUS) + ')';
	return paper.path(CLOUD_PATH).attr({
		'fill': '#ffffff',
		'stroke': '#6388dc',
		'stroke-width': 2,
		'stroke-linejoin': 'round',
		'stroke-miterlimit': 4,
	}).transform(t);
}

function circleFromPoints(p1: Point, p2: Point, p3: Point): Circle {
	'use strict';
	const off = square(p2.x) + square(p2.y);
	const bc = (square(p1.x) + square(p1.y) - off)/2;
	const cd = (off - square(p3.x) - square(p3.y))/2;
	const det = (p1.x - p2.x)*(p2.y - p3.y) - (p2.x - p3.x)*(p1.y - p2.y);
	if (isZero(det)) {
		console.log('blerg');
		return;
	}
	const idet = 1/det;
	const cx = (bc*(p2.y - p3.y) - cd*(p1.y - p2.y))*idet;
	const cy = (cd*(p1.x - p2.x) - bc*(p2.x - p3.x))*idet;
	return {
		'x': cx,
		'y': cy,
		'r': sqrt(square(p2.x - cx) + square(p2.y - cy)),
	};
}

function label(
	paper: Snap.Paper, cx: number, cy: number, side: string, text: string,
	rw = AUX_RADIUS, rh = AUX_RADIUS): Snap.Element {

	'use strict';
	let x: number, y: number;
	switch (side) {
	case 'top':
		x = cx;
		y = cy - rh - LABEL_PAD;
		break;
	case 'bottom':
		x = cx;
		y = cy + rh + LABEL_PAD;
		break;
	case 'left':
		x = cx - rw - LABEL_PAD;
		y = cy;
		break;
	case 'right':
		x = cx + rw + LABEL_PAD;
		y = cy;
		break;
	default:
		// FIXME
		console.log('unknown case ' + side);
	}

	let lbl = paper.text(x, y, text.split('\n')).attr(TEXT_ATTR);
	let linesAttr: any = lbl.attr('text');
	let lines: string[];
	if (typeof linesAttr === 'string') {
		lines = [linesAttr];
	} else {
		lines = <string[]>linesAttr;
	}
	let spans = lbl.node.getElementsByTagName('tspan');
	let maxH = Number.MIN_VALUE, maxW = Number.MIN_VALUE;
	if (IS_CHROME) {
		// FIXME(bp) this is way faster as it avoids forced
		// layouts & node creation + deletion, but it only works
		// on Chrome.
		for (let i = 0; i < spans.length; i++) {
			// FIXME: this cast to any is for typescript,
			// but apparently it _does_ catch the fact
			// that getBBox is not defined on
			// SVGTSpanElement (i.e. it doesn't inherit
			// from SVGLocatable in the spec, but
			// apparently does in the Chrome
			// implementation)
			let span: any = spans[i];
			let bb = span.getBBox();
			if (bb.height > maxH)
				maxH = bb.height;
			if (bb.width > maxW)
				maxW = bb.width;
		}
	} else {
		for (let i = 0; i < lines.length; i++) {
			let t = paper.text(0, 0, lines[i]).attr(TEXT_ATTR);
			let bb = t.getBBox();
			if (bb.height > maxH)
				maxH = bb.height;
			if (bb.width > maxW)
				maxW = bb.width;
			t.remove();
		}
	}
	for (let i = 0; i < spans.length; i++) {
		if (side === 'left' || side === 'right') {
			// TODO(bp) fix vertical centering
		}
		if (i > 0) {
			spans[i].setAttribute('x', String(x));
			spans[i].setAttribute('dy', String(0.9*maxH));
		}
	}
	let off: number;
	switch (side) {
	case 'bottom':
		lbl.attr({y: y + LABEL_PAD});
		break;
	case 'top':
		lbl.attr({y: y - (spans.length-1)*(maxH/2) - LABEL_PAD*+(spans.length > 1)});
		break;
	case 'left':
		// kind of gross, but I'm not sure what the correct metric
		// would be.  I think middle-align isn't working right or
		// something.
		if (spans.length > 1) {
			off = (spans.length-2)*(maxH/2);
		} else {
			off = -maxH/4;
		}

		addCSSClass(lbl.node, 'right-aligned');
		lbl.node.setAttribute('style', lbl.node.getAttribute('style').replace('middle', 'right'));
		lbl.attr({
			y: y - off,
			x: x,
		});
		break;
	case 'right':
		addCSSClass(lbl.node, 'left-aligned');
		lbl.node.setAttribute('style', lbl.node.getAttribute('style').replace('middle', 'left'));
		lbl.attr({
			y: y - (spans.length-2)*(maxH/2),
		});
		break;
	default:
		console.log('unknown case ' + side);
	}
	return lbl;
}

// converts an angle associated with a connector (in degrees) into an
// angle in the coordinate system of SVG canvases where the origin is
// in the upper-left of the screen and Y grows down, and the domain is
// -180 to 180.
export function xmileToCanvasAngle(inDeg: number): number {
	'use strict';
	let outDeg = (360 - inDeg) % 360;
	if (outDeg > 180)
		outDeg -= 360;
	return outDeg;
}

function degToRad(d: number): number {
	'use strict';
	return d/180*PI;
}

function radToDeg(r: number): number {
	'use strict';
	return r*180/PI;
}

// operates on angles in radian form.  adds 180 degrees, if we're now
// outside of our domain, clamp back into it.
function oppositeθ(θ: number): number {
	'use strict';
	θ += PI;
	if (θ > PI)
		θ -= 2*PI;
	return θ;
}

function last<T>(arr: Array<T>): T {
	'use strict';
	return arr[arr.length-1];
}

function arrowhead(paper: Snap.Paper, x: number, y: number, r: number): Snap.Element {
	'use strict';
	const head = 'M' + x + ',' + y + 'L' + (x-r) + ',' + (y + r/2) +
		'A' + r*3 + ',' + r*3 + ' 0 0,1 ' + (x-r) + ',' + (y - r/2) + 'z';
	return paper.path(head);
}

function sparkline(
	paper: Snap.Paper, cx: number, cy: number, w: number, h: number,
	time: number[], values: number[], graph?: Snap.Element): Snap.Element {

	'use strict';
	const x = cx - w/2;
	const y = cy - h/2;
	const xMin = time[0];
	const xMax = last(time);
	const xSpan = xMax - xMin;
	const yMin = Math.min(0, Math.min.apply(null, values)); // 0 or below 0
	const yMax = Math.max.apply(null, values);
	const ySpan = (yMax - yMin) || 1;
	let p = '';
	for (let i = 0; i < values.length; i++) {
		if (isNaN(values[i])) {
			console.log('NaN at ' + time[i]);
		}
		p += (i === 0 ? 'M' : 'L') + (x + w*(time[i]-xMin)/xSpan) + ',' + (y + h - h*(values[i]-yMin)/ySpan);
	}
	let pAxis = 'M' + (x) + ',' + (y + h - h*(0-yMin)/ySpan) + 'L' + (x+w) + ',' + (y + h - h*(0-yMin)/ySpan);
	if (!graph) {
		return paper.group(
			paper.path(pAxis).attr({
				'class': 'spark-axis',
				'stroke-width': 0.125,
				'stroke-linecap': 'round',
				'stroke': '#999',
				'fill': 'none',
			}),
			paper.path(p).attr({
				'class': 'spark-line',
				'stroke-width': 0.5,
				'stroke-linecap': 'round',
				'stroke': '#2299dd',
				'fill': 'none',
			})
		);
	} else {
		let line = graph.node.querySelector('.spark-line');
		line.setAttribute('d', p);
		return graph;
	}
}

export interface EntStatic {
	new (drawing: Drawing, element: xmile.ViewElement): Ent;
}

export interface Ent {
	ident: string;
	dName: string;
	cx: number;
	cy: number;
	set: Snap.Element;

	to: string;
	from: string;

	init(): void;
	draw(): void;
	drawLabel(): void;
	visualize(times: number[], values: number[]): void;
}

class DStock implements Ent {
	drawing: Drawing;
	e: xmile.ViewElement;
	ident: string;
	dName: string;

	cx: number;
	cy: number;
	w: number;
	h: number;
	color: string;
	labelSide: string;

	to: string;
	from: string;

	set: Snap.Element;
	graph: Snap.Element;

	constructor(drawing: Drawing, element: xmile.ViewElement) {
		this.drawing = drawing;
		this.e = element;
		this.ident = element.ident;
		this.dName = dName(element.name);

		this.cx = element.x;
		this.cy = element.y;
		if (element.width) {
			if (!drawing.stocksXYCenter)
				this.cx += .5*element.width;
			this.w = element.width;
		} else {
			this.w = 45;
		}
		if (element.height) {
			if (!drawing.stocksXYCenter)
				this.cy += .5*element.height;
			this.h = element.height;
		} else {
			this.h = 35;
		}
		this.color = this.drawing.colorOverride ? COLOR_AUX : element.color || COLOR_AUX;
		this.labelSide = findSide(element, 'top');
	}

	init(): void {
		// we are a stock, and need to inform all the flows into and
		// out of us that they, in fact, flow in and out of us.

		let mEnt = <vars.Stock>this.drawing.model.vars[this.ident];

		for (let i = 0; i < mEnt.inflows.length; i++) {
			let n = mEnt.inflows[i];
			let dEnt = this.drawing.namedEnts[n];
			if (!dEnt) {
				console.log('failed connecting ' + this.ident + ' .to ' + n);
				continue;
			}
			dEnt.to = this.ident;
		}
		for (let i = 0; i < mEnt.outflows.length; i++) {
			let n = mEnt.outflows[i];
			let dEnt = this.drawing.namedEnts[n];
			if (!dEnt) {
				console.log('failed connecting ' + this.ident + ' .from ' + n);
				continue;
			}
			this.drawing.namedEnts[n].from = this.ident;
		}
	}

	draw(): void {
		let paper = this.drawing.paper;
		let w = this.w;
		let h = this.h;

		// FIXME: the ceil calls are for Stella Modeler compatability.
		this.set = this.drawing.group(
			paper.rect(Math.ceil(this.cx - w/2), Math.ceil(this.cy - h/2), w, h).attr({
				'fill': 'white',
				'stroke-width': STROKE,
				'stroke': this.color,
			})
		);
	}

	drawLabel(): void {
		let paper = this.drawing.paper;
		const w = this.w;
		const h = this.h;
		this.set.add(label(paper, this.cx, this.cy, this.labelSide, this.dName, w/2, h/2));
	}

	visualize(time: number[], values: number[]): void {
		const hadGraph = !!this.graph;
		this.graph = sparkline(
			this.drawing.paper,
			this.cx, this.cy, this.w-4, this.h-4,
			time, values, this.graph);
		if (!hadGraph)
			this.set.add(this.graph);
	}
}

class DModule implements Ent {
	drawing: Drawing;
	e: xmile.ViewElement;
	ident: string;
	dName: string;

	cx: number;
	cy: number;
	w: number;
	h: number;
	color: string;
	labelSide: string;

	to: string;
	from: string;

	set: Snap.Element;
	graph: Snap.Element;

	constructor(drawing: Drawing, element: xmile.ViewElement) {
		this.drawing = drawing;
		this.e = element;
		this.ident = element.ident;
		this.dName = dName(element.name);

		this.cx = element.x;
		this.cy = element.y;
		this.w = 55;
		this.h = 45;
		this.color = this.drawing.colorOverride ? COLOR_AUX : element.color || COLOR_AUX;
		this.labelSide = findSide(element);
	}

	init(): void {}

	draw(): void {
		let paper = this.drawing.paper;
		const w = this.w;
		const h = this.h;

		// FIXME: the ceil calls are for Stella Modeler compatability.
		this.set = this.drawing.group(
			paper.rect(Math.ceil(this.cx - w/2), Math.ceil(this.cy - h/2), w, h, MODULE_R, MODULE_R).attr({
				'fill': 'white',
				'stroke-width': STROKE,
				'stroke': this.color,
			})
		);
	}

	drawLabel(): void {
		let paper = this.drawing.paper;
		const w = this.w;
		const h = this.h;
		this.set.add(label(paper, this.cx, this.cy, this.labelSide, this.dName, w/2, h/2));
	}

	visualize(time: number[], values: number[]): void {
		const hadGraph = !!this.graph;
		this.graph = sparkline(
			this.drawing.paper,
			this.cx, this.cy, this.w-6, this.h-6,
			time, values, this.graph);
		if (!hadGraph)
			this.set.add(this.graph);
	}
}

class DAux implements Ent {
	drawing: Drawing;
	e: xmile.ViewElement;
	ident: string;
	dName: string;

	cx: number;
	cy: number;
	w: number;
	h: number;
	r: number;
	color: string;
	labelSide: string;

	to: string;
	from: string;

	set: Snap.Element;
	graph: Snap.Element;

	constructor(drawing: Drawing, element: xmile.ViewElement) {
		this.drawing = drawing;
		this.e = element;
		this.ident = element.ident;
		this.dName = dName(element.name);

		this.cx = element.x;
		this.cy = element.y;
		if (element.width) {
			// this.cx += .5*element.width;
			this.r = element.width/2;
		} else {
			this.r = AUX_RADIUS;
		}
		if (element.height) {
			// this.cy += .5*element.height;
			this.r = element.height/2;
		} else {
			this.r = AUX_RADIUS;
		}
		this.color = this.drawing.colorOverride ? COLOR_AUX : element.color || COLOR_AUX;
		this.labelSide = findSide(element);
	}

	init(): void {}

	draw(): void {
		let paper = this.drawing.paper;
		this.set = this.drawing.group(
			paper.circle(this.cx, this.cy, this.r).attr({
				'fill': 'white',
				'stroke-width': STROKE,
				'stroke': this.color,
			})
		);
	}

	drawLabel(): void {
		let paper = this.drawing.paper;
		this.set.add(label(paper, this.cx, this.cy, this.labelSide, this.dName));
	}

	visualize(time: number[], values: number[]): void {
		const hadGraph = !!this.graph;
		this.graph = sparkline(
			this.drawing.paper,
			this.cx, this.cy, AUX_RADIUS, AUX_RADIUS,
			time, values, this.graph);
		if (!hadGraph)
			this.set.add(this.graph);
	}
}

class DFlow implements Ent {
	drawing: Drawing;
	e: xmile.ViewElement;
	ident: string;
	dName: string;

	cx: number;
	cy: number;
	w: number;
	h: number;
	color: string;
	labelSide: string;

	to: string;
	from: string;

	set: Snap.Element;
	graph: Snap.Element;

	constructor(drawing: Drawing, element: xmile.ViewElement) {
		this.drawing = drawing;
		this.e = element;
		this.ident = element.ident;
		this.dName = dName(element.name);
		this.cx = element.x;
		this.cy = element.y;
		this.to = null;
		this.from = null;
		this.color = this.drawing.colorOverride ? COLOR_AUX : element.color || COLOR_AUX;
		this.labelSide = findSide(element);
	}

	init(): void {}

	draw(): void {
		let paper = this.drawing.paper;
		const cx = this.cx;
		const cy = this.cy;
		let pts = this.e.pts;
		if (pts.length < 2) {
			console.log('ERROR: too few points for flow: ' + JSON.stringify(this));
			return;
		}
		let spath = '';
		for (let j = 0; j < pts.length; j++) {
			let pt = pts[j];
			spath += (j === 0 ? 'M' : 'L') + pt.x + ',' + pt.y;
		}

		let from_cloud: Snap.Element;
		let cloud: Snap.Element;
		this.set = this.drawing.group();
		if (!this.from) {
			cloud = cloudAt(paper, pts[0].x, pts[0].y);
			// when we are flowing out of a cloud, don't adjust the
			// length, just later the cloud above the pipe
			from_cloud = cloud;
		}
		if (!this.to) {
			let x: number, y: number, prevX: number, prevY: number;
			x = pts[pts.length-1].x;
			y = pts[pts.length-1].y;
			prevX = pts[pts.length-2].x;
			prevY = pts[pts.length-2].y;
			cloud = cloudAt(paper, x, y);
			this.set.add(cloud);
			if (prevX < x)
				pts[pts.length-1].x = x - CLOUD_RADIUS;
			if (prevX > x)
				pts[pts.length-1].x = x + CLOUD_RADIUS;
			if (prevY < y)
				pts[pts.length-1].y = y - CLOUD_RADIUS;
			if (prevY > y)
				pts[pts.length-1].y = y + CLOUD_RADIUS;
		}
		// recalcualte path after cloud intersection
		spath = '';
		let arrowθ: number;
		for (let j = 0; j < pts.length; j++) {
			let x = pts[j].x;
			let y = pts[j].y;
			if (j === pts.length-1) {
				let dx = x - pts[j-1].x;
				let dy = y - pts[j-1].y;
				let θ = atan2(dy, dx) * 180/PI;
				if (θ < 0)
					θ += 360;
				if (θ >= 315 || θ < 45) {
					x -= 4;
					arrowθ = 0;
				} else if (θ >= 45 &&  θ < 135) {
					y -= 4;
					arrowθ = 90;
				} else if (θ >= 135 &&  θ < 225) {
					x += 4;
					arrowθ = 180;
				} else {
					y += 4;
					arrowθ = 270;
				}
			}
			spath += (j === 0 ? 'M' : 'L') + x + ',' + y;
		}
		this.set.add(paper.path(spath).attr({
			'stroke-width': STROKE*4,
			'stroke': this.color,
			'fill': 'none',
		}));

		let lastPt: Point = last(pts);
		this.set.add(arrowhead(paper, lastPt.x, lastPt.y, ARROWHEAD_RADIUS*2).attr({
			'transform': 'rotate(' + (arrowθ) + ',' + lastPt.x + ',' + lastPt.y + ')',
			'stroke': this.color,
			'stroke-width': 1,
			'fill': 'white',
			'stroke-linejoin': 'round',
		}));

		this.set.add(paper.path(spath).attr({
			'stroke': 'white',
			'stroke-width': STROKE*2,
			'fill': 'none',
		}));
		this.set.add(paper.circle(cx, cy, AUX_RADIUS).attr({
			'fill': 'white',
			'stroke-width': STROKE,
			'stroke': this.color,
		}));
		if (from_cloud)
			this.set.append(from_cloud);
	}

	drawLabel(): void {
		let paper = this.drawing.paper;
		this.set.add(label(paper, this.cx, this.cy, this.labelSide, this.dName));
	}

	visualize(time: number[], values: number[]): void {
		let hadGraph = !!this.graph;
		this.graph = sparkline(
			this.drawing.paper,
			this.cx, this.cy, AUX_RADIUS, AUX_RADIUS,
			time, values, this.graph);
		if (!hadGraph)
			this.set.add(this.graph);
	}
}

class DConnector implements Ent {
	drawing: Drawing;
	e: xmile.ViewElement;
	ident: string;
	dName: string;

	cx: number;
	cy: number;
	w: number;
	h: number;
	color: string;
	labelSide: string;

	to: string;
	from: string;

	set: Snap.Element;

	constructor(drawing: Drawing, element: xmile.ViewElement) {
		this.drawing = drawing;
		this.e = element;
		this.color = this.drawing.colorOverride ? COLOR_CONN : element.color || COLOR_CONN;
	}

	init(): void {}

	takeoffθ(): number {
		let from = this.drawing.namedEnts[this.e.from];
		if (!from) {
			console.log('connector with unknown origin: ' + this.e.from);
			return NaN;
		}

		if (this.e.hasOwnProperty('angle')) {
			// convert from counter-clockwise (XMILE) to
			// clockwise (display, where Y grows down
			// instead of up)
			return degToRad(xmileToCanvasAngle(this.e.angle));
		} else if (this.e.hasOwnProperty('x') && this.e.hasOwnProperty('y')) {
			// compatability w/ iThink/STELLA v10 XMILE
			return atan2(this.e.y-from.cy, this.e.x-from.cx);
		}
		console.log('connector from "' + this.e.from + '" doesn\'t have x, y, or angle');
		return NaN;
	}

	isStraight(): boolean {
		const from = this.drawing.namedEnts[this.e.from];
		if (!from)
			return false;

		const to = this.drawing.namedEnts[this.e.to];
		if (!to)
			return false;

		const takeoffθ = this.takeoffθ();
		const midθ = atan2(to.cy-from.cy, to.cx-from.cx);

		return Math.abs(midθ - takeoffθ) < degToRad(STRAIGHT_LINE_MAX);
	}

	draw(): void {
		if (this.isStraight()) {
			this.drawStraight();
		} else {
			// TODO: check for polyline
			this.drawArc();
		}
	}

	drawLabel(): void {}

	visualize(): void {}

	// TODO: handle old-style connectors w/ x and y but no angle.
	private arcCircle(): Circle {
		const from = this.drawing.namedEnts[this.e.from];
		const to = this.drawing.namedEnts[this.e.to];
		if (!from || !to)
			return;

		if (!this.e.hasOwnProperty('angle')) {
			return circleFromPoints(
				{x: from.cx, y: from.cy},
				{x: to.cx, y: to.cy},
				{x: this.e.x, y: this.e.y});
		}

		// Find cx, cy from 'takeoff angle', and center of
		// 'from', and center of 'to'.  This means we have 2
		// points on the edge of a cirlce, and the tangent at
		// point 1.
		//
		//     eqn of a circle: (x - cx)^2 + (y - cy)^2 = r^2
		//     line:            y = mx + b || 0 = mx - y + b

		const slopeTakeoff = tan(this.takeoffθ());
		// we need the slope of the line _perpendicular_ to
		// the tangent in order to find out the x,y center of
		// our circle
		let slopePerpToTakeoff = -1/slopeTakeoff;
		if (isZero(slopePerpToTakeoff))
			slopePerpToTakeoff = 0;
		else if (isInf(slopePerpToTakeoff))
			slopePerpToTakeoff = Infinity;

		const takeoffPerpθ = Math.atan(slopePerpToTakeoff);

		// y = slope*x + b
		// fy = slope*fx + b
		// fy - slope*fx = b
		// b = fy - slope*fx
		const bFrom = from.cy - slopePerpToTakeoff*from.cx;

		let cx: number;
		if (from.cy === to.cy) {
			cx = (from.cx + to.cx)/2;
		} else {
			// find the slope of the line between the 2 points
			const slopeBisector = (from.cy - to.cy)/(from.cx - to.cx);
			const slopePerpToBisector = -1/slopeBisector;
			const midx = (from.cx + to.cx) / 2;
			const midy = (from.cy + to.cy) / 2;
			// b = fy - slope*fx
			const bPerp = midy - slopePerpToBisector*midx;

			// y = perpSlopeTakeoff*x + bFrom
			// y = perpSlopeBisector*x + bPerp
			// perpSlopeTakeoff*x + bFrom = perpSlopeBisector*x + bPerp
			// bFrom - bPerp = perpSlopeBisector*x - perpSlopeTakeoff*x
			// bFrom - bPerp = (perpSlopeBisector- perpSlopeTakeoff)*x
			// (bFrom - bPerp)/(perpSlopeBisector- perpSlopeTakeoff) = x
			cx = (bFrom - bPerp)/(slopePerpToBisector- slopePerpToTakeoff);
		}

		const cy = slopePerpToTakeoff*cx + bFrom;
		const cr = sqrt(square(from.cx - cx) + square(from.cy - cy));

		return {r: cr, x: cx, y: cy};
	}

	private intersectEntStraight(ent: Ent, θ: number): Point {
		let r: number = AUX_RADIUS;
		// FIXME: actually calculate intersections
		if (ent instanceof DModule)
			r = 25;
		else if (ent instanceof DStock)
			r = 20;

		// FIXME: can we do this without an inverse flag?
		return {
			x: ent.cx + r*cos(θ),
			y: ent.cy + r*sin(θ),
		};
	}

	// θ refers to the takeoff or arrival angle on the ent
	private intersectEntArc(ent: Ent, circ: Circle, inv: boolean): Point {
		let r: number = AUX_RADIUS;
		// FIXME: actually calculate intersections
		if (ent instanceof DModule)
			r = 25;
		else if (ent instanceof DStock)
			r = 20;

		// the angle that when added or subtracted from
		// entCenterθ results in the point where the arc
		// intersects with the shape
		let offθ = tan(r/circ.r);
		let entCenterθ = atan2(ent.cy - circ.y, ent.cx - circ.x);

		// FIXME: can we do this without an inverse flag?
		return {
			x: circ.x + circ.r*cos(entCenterθ + (inv ? 1 : -1)*offθ),
			y: circ.y + circ.r*sin(entCenterθ + (inv ? 1 : -1)*offθ),
		};
	}

	private drawStraight(): void {
		let paper = this.drawing.paper;

		const from = this.drawing.namedEnts[this.e.from];
		const to = this.drawing.namedEnts[this.e.to];
		if (!from || !to)
			return;

		const θ = atan2(to.cy - from.cy, to.cx - from.cx);

		const start = this.intersectEntStraight(from, θ);
		const end = this.intersectEntStraight(to, oppositeθ(θ));

		const arrowheadAngle = radToDeg(θ);
		const path = 'M' + start.x + ',' + start.y + 'L' + end.x + ',' + end.y;

		this.set = this.drawing.group(
			paper.path(path).attr({
				'stroke-width': STROKE/2,
				'stroke': this.color,
				'fill': 'none',
			}),
			//paper.circle(start.x, start.y, 2).attr({'stroke-width': 0, fill: '#c83639'}),
			arrowhead(paper, end.x, end.y, ARROWHEAD_RADIUS).attr({
				'transform': 'rotate(' + arrowheadAngle + ',' + end.x + ',' + end.y + ')',
				'stroke': this.color,
				'stroke-width': 1,
				'fill': this.color,
				'stroke-linejoin': 'round',
			})
		);
	}

	private drawArc(): void {
		let paper = this.drawing.paper;

		const from = this.drawing.namedEnts[this.e.from];
		const to = this.drawing.namedEnts[this.e.to];
		if (!from || !to)
			return;

		const takeoffθ = this.takeoffθ();
		const circ = this.arcCircle();

		let fromθ = atan2(from.cy - circ.y, from.cx - circ.x);
		let toθ = atan2(to.cy - circ.y, to.cx - circ.x);
		let spanθ = toθ - fromθ;
		if (spanθ > degToRad(180))
			spanθ -= degToRad(360);

		// if the sweep flag is set, we need to negate the
		// inverse flag
		let inv: boolean = spanθ > 0 || spanθ <= degToRad(-180);

		let start = this.intersectEntArc(from, circ, inv);
		let end = this.intersectEntArc(to, circ, !inv);

		//console.log(from.ident + ' (takeoff: ' + this.e.angle + ')');
		//console.log(
		//	'  inv: ' + inv + ' (' + radToDeg(spanθ) +
		//	' = ' + radToDeg(toθ) + ' - ' + radToDeg(fromθ) + ')');

		const startR = sqrt(square(start.x - from.cx) + square(start.y - from.cy));
		// this isn't precise - the arc moves out from the
		// center of the AUX on an angle, while this
		// calculates where the tangent line intersects with
		// the edge of the AUX.  I think it's close enough?
		let expectedStartX = from.cx + startR*cos(takeoffθ);
		let expectedStartY = from.cy + startR*sin(takeoffθ);

		// FIXME: this could be more exact?  It is especially wrong
		// inexact for stocks + modules because I don't actually
		// calculate the intersection of the arc with the shape
		let sweep: boolean = !isEqual(expectedStartX, start.x, 5) || !isEqual(expectedStartY, start.y, 5);
		//console.log('  sweep: ' + sweep);
		//console.log('    x? ' + isEqual(expectedStartX, start.x, 5) + ' = isEqual(' + expectedStartX + ', ' + start.x);
		//console.log('    y? ' + isEqual(expectedStartY, start.y, 5) + ' = isEqual(' + expectedStartY + ', ' + start.y);
		if (sweep) {
			inv = !inv;
			start = this.intersectEntArc(from, circ, inv);
			end = this.intersectEntArc(to, circ, !inv);
		}

		const spath =
			'M' + start.x + ',' + start.y +
			'A' + circ.r + ',' + circ.r +
			' 0 ' + (+sweep) + ',' + (+inv) +
			' ' + end.x + ',' + end.y;

		let arrowheadAngle = radToDeg(atan2(end.y - circ.y, end.x - circ.x)) - 90;
		if (inv)
			arrowheadAngle += 180;

		this.set = this.drawing.group(
			//paper.path(midPath).attr({'stroke-width': .5, stroke: '#CDDC39', fill: 'none'}),
			//paper.circle(midx, midy, 2).attr({'stroke-width': 0, fill: '#CDDC39'}),
			//paper.circle(circ.x, circ.y, circ.r).attr({'stroke-width': .5, stroke: '#2299dd', fill: 'none'}),
			//paper.circle(circ.x, circ.y, 2).attr({'stroke-width': 0, fill: '#2299dd'}),
			paper.path(spath).attr({
				'stroke-width': STROKE/2,
				'stroke': this.color,
				'fill': 'none',
			}),
			//paper.circle(start.x, start.y, 2).attr({'stroke-width': 0, fill: '#c83639'}),
			arrowhead(paper, end.x, end.y, ARROWHEAD_RADIUS).attr({
				'transform': 'rotate(' + arrowheadAngle + ',' + end.x + ',' + end.y + ')',
				'stroke': this.color,
				'stroke-width': 1,
				'fill': this.color,
				'stroke-linejoin': 'round',
			})
			//paper.path(rayPath).attr({'stroke-width': .5, stroke: '#009688', 'fill': 'none'}),
			//paper.path(prayPath).attr({'stroke-width': .5, stroke: '#8BC34A', 'fill': 'none'}),
			//paper.path(pbrayPath).attr({'stroke-width': .5, stroke: '#FF9800', 'fill': 'none'})
		);

	}
}

const DTypes: {[n: string]: EntStatic} = {
	'stock': DStock,
	'flow': DFlow,
	'aux': DAux,
	'connector': DConnector,
	'module': DModule,
};

export interface Transform {
	scale: number;
	dscale: number;
	x: number;
	y: number;
	dx: number;
	dy: number;
}

/**
 *  Drawing represents a stock-and-flow diagram of a SD model.
 */
export class Drawing {
	model: type.Model;
	xmile: xmile.View;
	colorOverride: boolean;
	stocksXYCenter: boolean;
	paper: Snap.Paper;
	_g: Snap.Element;
	_t: Transform;
	dEnts: Ent[];
	namedEnts: {[n: string]: Ent};
	zEnts: Ent[][];

	constructor(
		model: type.Model,
		view: xmile.View,
		svgElement: string|HTMLElement,
		overrideColors: boolean,
		enableMousewheel: boolean,
		stocksXYCenter: boolean) {

		this.model = model;
		this.xmile = view;
		let element: HTMLElement;
		let svg: SVGElement;
		if (typeof svgElement === 'string') {
			let selector = <string>svgElement;
			if (selector.length > 0 && selector[0] === '#')
				selector = selector.substr(1);
			element = document.getElementById(selector);
		} else {
			element = svgElement;
		}
		// FIXME: gross
		svg = <SVGElement><any>element;
		element.innerHTML = '';
		this.paper = Snap(svg);
		let defs = <any>svg.getElementsByTagName('defs')[0];
		if (defs) {
			defs.outerHTML = runtime.drawCSS;
		} else {
			element.innerHTML += runtime.drawCSS;
		}
		// FIXME: not needed?
		// this._selector = svgElement;
		this._g = this.paper.g();
		this._g.node.id = 'viewport';
		this.colorOverride = overrideColors;
		this.stocksXYCenter = stocksXYCenter;

		// var zoom = util.floatAttr(view, 'zoom')/100.0;
		element.setAttribute('preserveAspectRatio', 'xMinYMin');
		{
			let tz = 'translateZ(0px)';
			let style: any = element.style;
			style['-webkit-transform'] = tz;
			style['-moz-transform'] = tz;
			style['-ms-transform'] = tz;
			style['-o-transform'] = tz;
			style.transform = tz;
		}

		this.dEnts = [];
		this.zEnts = new Array(Z_MAX);
		for (let i = 0; i < Z_MAX; i++)
			this.zEnts[i] = [];
		this.namedEnts = {};

		// create a drawing entity for each known tag in the display
		for (let i = 0; i < view.elements.length; i++) {
			let e = view.elements[i];
			// TODO: handle the mess that is styles
			if (e.type === 'style')
				continue;
			if (!DTypes.hasOwnProperty(e.type)) {
				console.log('unknown draw ent type ' + e.type);
				continue;
			}
			let de = new DTypes[e.type](this, e);
			this.dEnts.push(de);
			this.zEnts[Z_ORDER[e.type]].push(de);
			if (de.ident)
				this.namedEnts[de.ident] = de;
		}

		// all draw ents need to be constructed and read in before we
		// can initialize them
		for (let i = 0; i < this.dEnts.length; i++)
			this.dEnts[i].init();

		// TODO(bp) sort by draw order
		for (let i = 0; i < Z_MAX; i++) {
			for (let j = 0; j < this.zEnts[i].length; j++)
				this.zEnts[i][j].draw();
		}
		for (let i = 0; i < Z_MAX; i++) {
			for (let j = 0; j < this.zEnts[i].length; j++)
				this.zEnts[i][j].drawLabel();
		}

		// pieces to construct a transformation matrix from
		this._t = {
			scale: 1,
			dscale: 0,
			x: 0,
			y: 0,
			dx: 0,
			dy: 0,
		};

		let _this = this;

		// Hammer.plugins.showTouches();
		// Hammer.plugins.fakeMultitouch();
		/*
		var hammer = new Hammer(element, {
			preventDefault: true,
			gesture: true,
		});
		hammer.on('dragstart', function() {
			var drawing = _this;
			drawing.normalizeTransform();
		});
		hammer.on('drag', function(e) {
			var drawing = _this;
			drawing._t.dx = e.gesture.deltaX;
			drawing._t.dy = e.gesture.deltaY;
			drawing.transform();
		});
		hammer.on('dragend', function(e) {
			var drawing = _this;
			drawing.normalizeTransform();
			drawing.transform();
		});
		hammer.on('transformstart', function(e) {
			var drawing = _this;
			drawing.normalizeTransform();
		});
		hammer.on('pinch', function(e) {
			var drawing = _this;
			drawing.applyDScaleAt(e.gesture.scale-1, e.gesture.center);
			drawing.transform();
		});
		hammer.on('transformend', function(e) {
			var drawing = _this;
			drawing.normalizeTransform();
			drawing.transform();
		});
		*/

		if (!enableMousewheel)
			return;

		svg.onwheel = function(e: any): void {
			let drawing = _this;
			let delta = -e.deltaY/20;
			drawing.applyDScaleAt(delta, e);
			drawing.normalizeTransform();
			drawing.transform();
		};
	}

	applyDScaleAt(dscale: number, e: any): void {
		this._t.dscale = dscale;
		if (this._t.scale + this._t.dscale < MIN_SCALE)
			this._t.dscale = MIN_SCALE - this._t.scale;
		this._t.dx = -(e.pageX - this._t.x)*(this._t.dscale)/this._t.scale;
		this._t.dy = -(e.pageY - this._t.y)*(this._t.dscale)/this._t.scale;
	}

	transform(scale?: number, x?: number, y?: number): void {
		if (arguments.length === 3) {
			this._t.scale = scale;
			this._t.x = x;
			this._t.y = y;
		}
		x = this._t.x + this._t.dx;
		y = this._t.y + this._t.dy;
		scale = this._t.scale + this._t.dscale;
		let matrix = 'translateZ(0px) matrix(' + scale + ',0,0,' + scale +
			',' + x + ',' + y + ')';
		(<any>this._g.node.style)['-webkit-transform'] = matrix;
		(<any>this._g.node.style)['-moz-transform'] = matrix;
		(<any>this._g.node.style)['-ms-transform'] = matrix;
		this._g.node.style.transform = matrix;
	}

	normalizeTransform(): void {
		this._t.x += this._t.dx;
		this._t.y += this._t.dy;
		this._t.scale += this._t.dscale;
		if (this._t.scale < MIN_SCALE)
			this._t.scale = MIN_SCALE;
		this._t.dx = 0;
		this._t.dy = 0;
		this._t.dscale = 0;
	}

	visualize(data: any): void {
		// FIXME(bp) hack for compat
		if (data.project) {
			let sim = data;
			let d = this;
			sim.series.apply(sim, Object.keys(this.namedEnts)).then(function(result: any): void {
				for (let n in result) {
					if (!result.hasOwnProperty(n))
						continue;
					data = result[n];
					let dEnt = d.namedEnts[n];
					if (!dEnt) {
						console.log('sim data for non-drawn ' + n);
						continue;
					}
					dEnt.visualize(data.time, data.values);
				}
			}).done();
		} else {
			let result = data;
			for (let n in result) {
				if (!result.hasOwnProperty(n))
					continue;
				data = result[n];
				let dEnt = this.namedEnts[n];
				if (!dEnt) {
					console.log('sim data for non-drawn ' + n);
					continue;
				}
				dEnt.visualize(data.time, data.values);
			}
		}
	}

	group(...args: any[]): Snap.Element {
		let g = this.paper.g.apply(this.paper, args);
		this._g.append(g);
		return g;
	}
}
