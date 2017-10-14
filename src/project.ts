// Copyright 2015 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

'use strict';

import * as xmldom from 'xmldom';

import * as common from './common';
import * as type from './type';
import * as xmile from './xmile';
import * as compat from './compat';
import * as stdlib from './stdlib';

import {Error} from './common';
import {Model} from './model';
import {Module} from './vars';

function getXmileElement(xmileDoc: XMLDocument): Element {
	'use strict';
	// in Chrome/Firefox, item 0 is xmile.  Under node's XML DOM
	// item 0 is the <xml> prefix.  And I guess there could be
	// text nodes in there, so just explictly look for xmile
	let i: number;
	for (i = 0; i < xmileDoc.childNodes.length; i++) {
		let node = <Element>xmileDoc.childNodes.item(i);
		if (node.tagName === 'xmile')
			return node;
	}
	return null;
}

let stdModels: {[n: string]: Model} | null = null;

function parseStdModels() {
	stdModels = {};
	for (let name in stdlib.xmileModels) {
		if (!stdlib.xmileModels.hasOwnProperty(name))
			continue;

		let modelStr = stdlib.xmileModels[name];
		let xml = (new xmldom.DOMParser()).parseFromString(modelStr, 'application/xml');
		let ctx = new Project(xml, true);
		let mdl = ctx.model(name);
		mdl.name = 'stdlib·' + mdl.name;
		let ident = mdl.ident;
		stdModels['stdlib·' + ident] = mdl;
	}
}

/**
 * Project is the container for a set of SD models.
 *
 * A single project may include models + non-model elements
 */
export class Project implements type.Project {
	name:    string;
	valid:   boolean;
	simSpec: type.SimSpec;
	main:    type.Module;

	private files: xmile.File[];
	private xmile: XMLDocument;
	private models: type.ModelMap;

	constructor(xmileDoc: XMLDocument, skipStdlib = false) {
		this.files = [];
		this.models = {};
		this.valid = false;
		this.addDocument(xmileDoc, true, skipStdlib);
	}

	model(name?: string): any {
		if (!name)
			name = 'main';
		if (!(name in this.models))
			return this.models['stdlib·' + name];
		return this.models[name];
	}

	// isMain should only be true when called from the constructor.
	addDocument(xmileDoc: XMLDocument, isMain = false, skipStdlib = false): Error {
		if (!xmileDoc || xmileDoc.getElementsByTagName('parsererror').length !== 0) {
			this.valid = false;
			return Error.Version;
		}
		let xmileElement = getXmileElement(xmileDoc);
		if (!xmileElement) {
			this.valid = false;
			return new Error('no XMILE root element');
		}

		// FIXME: compat translation of XML

		// finished with XMLDocument at this point, we now
		// have a tree of native JS objects with a 1:1
		// correspondence to the XMILE doc
		let [file, err] = xmile.File.Build(xmileElement);
		if (err) {
			console.log('File.Build: ' + err.error);
			this.valid = false;
			return new Error('File.Build: ' + err.error);
		}

		// FIXME: compat translation of equations

		this.files.push(file);

		if (isMain) {
			this.name = file.header.name || 'sd project';
			this.simSpec = file.simSpec;
			if (!file.simSpec) {
				this.valid = false;
				return new Error('isMain, but no sim spec');
			}
		}

		if (!skipStdlib) {
			if (stdModels === null)
				parseStdModels();

			// add standard models, like 'delay1' and 'smth3'.
			for (let name in stdModels) {
				if (!stdModels.hasOwnProperty(name))
					continue;

				let stdModel = stdModels[name];
				this.models[name] = stdModel;
			}
		}

		// FIXME: merge the other parts of the model into the
		// project
		for (let i in file.models) {
			if (!file.models.hasOwnProperty(i))
				continue;
			let xModel = file.models[i];
			let ident = xModel.ident;
			if (ident === '' && !('main' in this.models))
				ident = 'main';
			this.models[ident] = new Model(this, ident, xModel);
		}
		this.valid = true;

		if (!('main' in this.models))
			return null;

		let modVar = new xmile.Variable();
		modVar.name = 'main';
		this.main = new Module(this, null, modVar);
		this.main.updateRefs(this.models['main']);

		return null;
	}
}
