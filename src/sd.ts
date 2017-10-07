// Copyright 2015 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

'use strict';

import * as common from './common';

import {Project} from './project';
import {Model} from './model';

export {Project} from './project';
export {Model} from './model';

export const Error = common.Error;

/**
 * Attempts to parse the given xml string describing an xmile
 * model into a Model object, returning the Model on success, or
 * null on error.  On error, a string describing what went wrong
 * can be obtained by calling sd.error().
 *
 * @param xmlString A string containing a xmile model.
 * @return A valid Model object on success, or null on error.
 */
export function newModel(xmlDoc: any): Model {
	let p = new Project(xmlDoc);
	if (p.valid)
		return p.model();
	return null;
}

export function load(url: string, cb: (m: Model)=>void, errCb: (r: XMLHttpRequest)=>void): void {
	let req = new XMLHttpRequest();
	req.onreadystatechange = function(): void {
		if (req.readyState !== 4)
			return;
		if (req.status >= 200 && req.status < 300) {
			let xml = req.responseXML;
			if (!xml)
				xml = (new DOMParser()).parseFromString(req.responseText, 'application/xml');
			let mdl = newModel(xml);
			cb(mdl);
		} else if (errCb) {
			errCb(req);
		}
	};
	req.open('GET', url, true);
	req.send();
}
