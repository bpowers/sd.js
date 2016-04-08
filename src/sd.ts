// Copyright 2015 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

'use strict';

import * as common from './common';

import {Project} from './project';
import {Model} from './model';

export {Project} from './project';
export {Model} from './model';

export const Errors = common.Errors;

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

/**
 * If newModel or a major operation (like creating a new sim from
 * a model) fails, call sd.error() to get a string describing the
 * error.  You can compare this to specific errors in sd.errors,
 * or simply pass the error string to the user.  If an error
 * hasn't occured, or if no information is available, error() will
 * return null.
 *
 * @return A string error message, or null if one isn't available.
 */
export function error(): string {
	return common.err;
}
