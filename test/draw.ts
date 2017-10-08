// Copyright 2015 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

'use strict';

import * as chai from 'chai';

declare var global: any;
if (typeof window === 'undefined')
	(<any>global).window = {window: {document: {}}};

import * as draw from '../lib/draw';

const expect = chai.expect;

interface XmileToCanvasAngleTestData {
	in: number; // degrees
	out: number; // degrees
}

const ANGLE_CONVERT_TESTS: XmileToCanvasAngleTestData[] = [
	{in:    0, out:    0},
	{in:   45, out:  -45},
	{in:  315, out:   45},
	{in:   90, out:  -90},
	{in:  180, out:  180},
	{in: -180, out:  180},
	{in:  181, out:  179},
	{in:  179, out: -179},
];

describe('convert from XMILE angle', function(): void {
	ANGLE_CONVERT_TESTS.forEach(function(t: XmileToCanvasAngleTestData): void {
		it('should convert ' + t.in + ' to ' + t.out, function(done): void {
			let converted = draw.xmileToCanvasAngle(t.in);
			expect(converted).to.equal(t.out);
			done();
		});
	});
});
