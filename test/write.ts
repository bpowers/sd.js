// Copyright 2015 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

/// <reference path="../typings/tsd.d.ts" />

'use strict';

import * as chai from 'chai';
import * as parse from '../lib/parse';
import * as xmile from '../lib/xmile';

import {DOMParser, XMLSerializer} from 'xmldom';

describe('write-xmile', function(): void {
	it('should create', function(): void {
		let doc = new DOMParser().parseFromString(xmile.XML_ROOT, 'text/xml');
		let s = new XMLSerializer();
		console.log(s.serializeToString(doc));
	});
});
