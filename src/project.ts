// Copyright 2015 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

'use strict';

import common = require('./common');
import type = require('./type');
import jxon = require('./jxon');
import compat = require('./compat');

import {normalizeTimespec} from './util';
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
	name: string;
	main: type.Module;
	valid: boolean;
	xmile: XMLDocument;
	timespec: type.TimeSpec;
	models: type.ModelSet;

	constructor(xmileDoc: XMLDocument) {
		common.err = null;

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

		// finished with XMLDocument at this point, we now
		// have a tree of native JS objects with a 1:1
		// correspondence to the XMILE doc
		let xmile = jxon.build(xmileElement);
		if (!(xmile.model instanceof Array))
			xmile.model = [xmile.model];

		for (let v in compat.vendors) {
			if (!compat.vendors.hasOwnProperty(v))
				continue;

			if (compat.vendors[v].match(xmile))
				xmile = compat.vendors[v].translate(xmile);
		}

		this.xmile = xmile;
		if (typeof xmile.header.name === 'string') {
			this.name = xmile.header.name;
		} else {
			this.name = 'main project';
		}

		// get our time info: start-time, end-time, dt, etc.
		this.timespec = xmile.sim_specs;
		if (!this.timespec) {
			this.valid = false;
			return false;
		}
		normalizeTimespec(this.timespec);

		this.models = {};

		for (let i = 0; i < xmile.model.length; i++) {
			let mdl = xmile.model[i];
			if (!mdl['@name'])
				mdl['@name'] = 'main';
			this.models[mdl['@name']] = new Model(this, mdl);
		}
		this.main = new Module(this, null, {'@name': 'main'});
		this.valid = true;
		return true;
	}
}
