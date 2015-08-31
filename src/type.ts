// Copyright 2015 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

'use strict';

export interface Table {
	x: number[];
	y: number[];
}

export interface TimeSpec {
	start: number;
	stop: number;
	dt: number;
	savestep: number;
}

export interface Series {
	name: string;
	time: Float64Array;
	values: Float64Array;
}

export interface StringSet {
	[name: string]: boolean;
}

export interface VariableSet {
	[name: string]: Variable;
}

export interface RefSet {
	[name: string]: Reference;
}

export interface Model {
	name: string;
	timespec: TimeSpec;
	modules: Module[];
	tables: Table[];
	project: Project;
	referencedModels: Model[];
	vars: VariableSet;
	lookup(name: string): Variable;
}

export interface Project {
	main: Module;
	timespec: TimeSpec;
	model(name?: string): Model;
}

export interface Offsets {
	[name: string]: number|string;
}

export interface ModelDef {
	model: Model;
	modules: Module[];
}

export interface ModelSet {
	[name: string]: ModelDef;
}

export interface Variable {
	xmile: any;

	name: string;
	eqn: string;

	model: Model;
	parent: Model;
	project: Project;

	_deps: StringSet;
	_allDeps: StringSet;

	isConst(): boolean;
	getDeps(): StringSet;
	code(v: Offsets): string;
}

export interface Module extends Variable {
	modelName: string;
	refs: RefSet;
	referencedModels(all?: ModelSet): ModelSet;
}

export interface Reference extends Variable {
	ptr: string;
}
