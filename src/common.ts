// Copyright 2015 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

// used similarly to libc's errno.  On a major error store a
// string here (one of the sd.ERR_* ones defined directly below)
export var err: string;

export class Errors {
	static ERR_VERSION: string = 'bad xml or unknown smile version';
	static ERR_BAD_TIME: string = 'bad time (control) data';
};

export interface Properties {
	usesTime?: boolean;
}

// whether identifiers are a builtin.  Implementation is in
// Builtin module in runtime_src.js
export const builtins: {[name: string]: Properties} = {
	'max': {},
	'min': {},
	'pulse': {
		usesTime: true,
	},
};

export const reserved = {
	'if': true,
	'then': true,
	'else': true,
};
