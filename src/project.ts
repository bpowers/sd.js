// Copyright 2015 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

'use strict';

import * as common from './common';
import * as type from './type';
import * as xmile from './xmile';
import * as compat from './compat';

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

	constructor(xmileDoc: XMLDocument) {
		common.err = null;

		this.files = [];
		this.models = {};
		this.valid = false;
		this.addDocument(xmileDoc, true);
	}

	model(name?: string): any {
		if (!name)
			name = 'main';
		return this.models[name];
	}

	// isMain should only be true when called from the constructor.
	addDocument(xmileDoc: XMLDocument, isMain = false): boolean {
		if (!xmileDoc || xmileDoc.getElementsByTagName('parsererror').length !== 0) {
			common.err = common.Errors.ERR_VERSION;
			this.valid = false;
			return false;
		}
		let xmileElement = getXmileElement(xmileDoc);
		if (!xmileElement) {
			this.valid = false;
			return false;
		}

		// FIXME: compat translation of XML

		// finished with XMLDocument at this point, we now
		// have a tree of native JS objects with a 1:1
		// correspondence to the XMILE doc
		let [file, err] = xmile.File.Build(xmileElement);
		if (err) {
			console.log('File.Build: ' + err.error);
			this.valid = false;
			return false;
		}

		// FIXME: compat translation of equations

		this.files.push(file);

		if (isMain) {
			this.name = file.header.name || 'sd project';
			this.simSpec = file.simSpec;
			if (!file.simSpec) {
				this.valid = false;
				return false;
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

		let modVar = new xmile.Variable();
		modVar.name = 'main';
		this.main = new Module(this, null, modVar);
		this.valid = true;
		return true;
	}
}
