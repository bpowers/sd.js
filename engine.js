// Copyright 2011 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.
var $ = require('jquery');

ERR_VERSION  = exports.ERR_VERSION  = "bad xml or unknown smile version";
ERR_BAD_TIME = exports.ERR_BAD_TIME = "bad time (control) data";
exports.err = null;

const requiredSpecs = ['start', 'stop', 'dt'];

/**
   Extracts the <simspecs> information into nice, usable, validated
   object. Sets exports.err on error.

   @param simspecs A JQuery object wrapped around the simspecs dom node
   @return A validated control object on success, null on failure
*/
const getControlInfo = function(simspecs) {
    var error;

    // pull the start, stop and dt (requiredSpecs) info out of the DOM
    // into the ctrl object
    var ctrl = {};
    simspecs.children().map(function() {
	var name = $(this).get(0).tagName.toLowerCase();
	var val = parseFloat($(this).text());
	ctrl[name] = val;
    });

    // now validate that all of the requiredSpecs are there & were
    // converted to numbers correctly
    err = requiredSpecs.reduce(function(acc, e) {
	if (!ctrl.hasOwnProperty(e) || isNaN(ctrl[e])) {
	    console.log('simspecs missing ' + e);
	    return true;
	}
	return acc;
    }, false);
    if (err) {
	exports.err = ERR_BAD_TIME;
	return null;
    }

    // finally pull out some of the supplimental info, like
    // integration method and time units
    ctrl.method = (simspecs.attr('method') || 'euler').toLowerCase();
    ctrl.units = (simspecs.attr('time_units') || 'unknown').toLowerCase();

    return ctrl;
}

/**
   Converts a string of xml data represnting an xmile model into a
   javascript object.  The resulting javascript object can give
   information about the model (what variables does it have, what are
   their equations, etc), and can also create simulation objects.
   Simulation objects can be parametarized and run (simulated),
   generating time-series data on all of the variables.                                         

*/
exports.modelGen = function(xmlString) {
    exports.err = null;

    const model = {};
    const xmile = $(xmlString);
    if (!xmile || xmile.find('header smile').attr('version') != "1.0") {
	exports.err = ERR_VERSION;
	return null;
    }
    model.name = xmile.find('header name').text() || 'boosd model';

    // get our time info: start-time, end-time, dt, etc.
    model.ctrl = getControlInfo(xmile.children('simspecs'));
    if (!model.ctrl)
	return null;

    console.log('vars:');
    xmile.children('macro').each(function() {
        console.log('  ' + $(this).attr('name'));
    });

    return {};
}
