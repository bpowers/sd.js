// Copyright 2015 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

'use strict';

import * as xmile from './xmile';

export interface StringSet {
	[name: string]: boolean;
}

export interface Table {
	x: number[];
	y: number[];
}

export interface TableMap {
	[name: string]: Table;
}

export interface SimSpec {
	start:     number;
	stop:      number;
	dt:        number;
	saveStep:  number;
	method:    string;
	timeUnits: string;
}

export interface Series {
	name:   string;
	time:   Float64Array;
	values: Float64Array;
}

export interface Project {
	name:    string;
	simSpec: SimSpec;
	main:    Module;

	model(name?: string): Model;
}

export interface Model {
	name:    string;
	ident:   string;
	valid:   boolean;
	modules: ModuleMap;
	tables:  TableMap;
	project: Project;
	vars:    VariableMap;
	simSpec: SimSpec;

	lookup(name: string): Variable;
}

export interface ModelMap {
	[name: string]: Model;
}

export interface Offsets {
	[name: string]: number|string;
}

export interface ModelDef {
	model: Model;
	modules: Module[];
}

export interface ModelDefSet {
	[name: string]: ModelDef;
}

export interface Variable {
	xmile: xmile.Variable;

	ident: string;
	eqn: string;

	ast: any; // FIXME: this is any to fix circular deps

	project: Project;
	parent: Model;
	model: Model;

	_deps: StringSet;
	_allDeps: StringSet;

	isConst(): boolean;
	getDeps(): StringSet;
	code(v: Offsets): string;
}

export interface VariableMap {
	[name: string]: Variable;
}

export interface Module extends Variable {
	modelName: string;
	refs: ReferenceMap;
	referencedModels(all?: ModelDefSet): ModelDefSet;
	updateRefs(model: Model): void;
}

export interface ModuleMap {
	[name: string]: Module;
}

export interface Reference extends Variable {
	ptr: string;
}

export interface ReferenceMap {
	[name: string]: Reference;
}

// FROM lex

// constants, sort of...
export const enum TokenType {
	TOKEN,
	IDENT,
	RESERVED,
	NUMBER,
}

export class SourceLoc {
	constructor(
		public line: number,
		public pos: number) {}

	off(n: number): SourceLoc {
		return new SourceLoc(this.line, this.pos+n);
	}
}

export class Token {
	constructor(
		public tok: string,
		public type: TokenType,
		public startLoc?: SourceLoc,
		public endLoc?: SourceLoc) {}

	get value(): number {
		if (this.type !== TokenType.NUMBER)
			throw 'Token.value called for non-number: ' + this.type;

		return parseFloat(this.tok);
	}
}
