// Copyright 2013 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

import common = require('./common');
import util = require('./util');
import model = require('./model');
import vars = require('./vars');
import jxon = require('./jxon');
import compat = require('./compat');

'use strict';

let errors = common.errors;

// TODO(bp) macro support/warnings

export class Project {
	valid: boolean;
	xmile: any;
	timespec: any;

	constructor(xmileDoc: any) {
		common.err = null;

		if (!xmileDoc || xmileDoc.getElementsByTagName('parsererror').length !== 0) {
			common.err = errors.ERR_VERSION;
			this.valid = false;
			return;
		}

		// in Chrome/Firefox, item 0 is xmile.  Under node's XML DOM
		// item 0 is the <xml> prefix.  And I guess there could be
		// text nodes in there, so just explictly look for xmile
		let i: number;
		for (i = 0; i < xmileDoc.childNodes.length &&
			xmileDoc.childNodes.item(i).tagName !== 'xmile'; i++);

		let xmile = jxon.build(xmileDoc.childNodes.item(i));

		if (!(xmile.model instanceof Array))
			xmile.model = [xmile.model];

		for (let n in compat) {
			if (compat[n].match(xmile))
				xmile = compat[n].translate(xmile);
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
			return;
		}
		util.normalizeTimespec(this.timespec);

		this.models = {};

		for (let i = 0; i < xmile.model.length; i++) {
			let mdl = xmile.model[i];
			if (!mdl['@name'])
				mdl['@name'] = 'main';
			this.models[mdl['@name']] = new model.Model(this, mdl);
		}
		this.main = new vars.Module(this, null, {'@name': 'main'});
		this.valid = true;
	}

	model(name: string): any {
		if (!name)
			name = 'main';
		return this.models[name];
	}
}
