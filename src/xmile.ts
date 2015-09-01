// Copyright 2015 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

'use strict';

export class Point {
	X: number;
	Y: number;
}

export class Size {
	Width: number;
	Height: number;
}

export class Rect implements Point, Size {
	X: number;
	Y: number;
	Width: number;
	Height: number;
}

export class File {
	version:    string;
	level:      number;
	header:     Header;
	simSpec:    SimSpec;
	dimensions: Dimension[];
	units:      Unit[];
	behavior:   Behavior;
	style:      Style;
	models:     Model[];
}

export class SimSpec {
	timeUnits: string;
	start:     number;
	stop:      number;
	dt:        number;
	savestep:  number;
	method:    string;
}

export class Unit {
	name:  string;
	eqn:   string;
	alias: string;
}

export class Header {
	options: Options;
	name:    string;
	uuid:    string;
	vendor:  string;
	product: string;
}

export class Dimension {
	name: string;
	size: string;
}

export class Options {
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
}

export class Behavior {
	allNonNegative:   boolean;
	stockNonNegative: boolean;
	flowNonNegative:  boolean;
}

// TODO: kill me
export class Style {

}

// TODO: same here
export class Data {

}

export class Model {
	name:      string;
	variables: Variable[];
	views:     View[];
}

export class Variable {
	name:     string;
	doc:      string;
	eqn:      string;
	nonNeg:   boolean;
	inflows:  string[];
	outflows: string[];
	units:    string;
	gf:       GF;
	params:   Connect[];
}

export class View {

}

export class GF {
	discrete: boolean;
	xPoints:  string;
	yPoints:  string;
	xScale:   Scale;
	yScale:   Scale;
}

export class Scale {
	min: number;
	max: number;
}

export class Connect {
	to:   string;
	from: string;
}
