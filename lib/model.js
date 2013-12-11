// Copyright 2011 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

define(['./util', './vars', './common', './draw', './sim'], function(util, vars, common, draw, sim) {
    'use strict';

    var errors = common.errors;
    var requiredSpecs = ['start', 'stop', 'dt', 'savestep'];
    var qs = util.qs;

    /**
       Converts a string of xml data represnting an xmile model into a
       javascript object.  The resulting javascript object can give
       information about the model (what variables does it have, what are
       their equations, etc), and can also create simulation objects.
       Simulation objects can be parametarized and run (simulated),
       generating time-series data on all of the variables.
    */
    var Model = function Model(xmlString) {
        common.err = null;

        var xmile = (new DOMParser()).parseFromString(xmlString, 'application/xml');
        if (!xmile || xmile.getElementsByTagName('parsererror').length !== 0) {
            common.err = errors.ERR_VERSION;
            this.valid = false;
            return;
        }
        var smile = qs(xmile, 'xmile>header>smile');
        if (!smile || smile.getAttribute('version') !== "1.0") {
            common.err = errors.ERR_VERSION;
            this.valid = false;
            return;
        }
        this.xmile = xmile;
        this.name = qs(xmile, 'xmile>header>name').textContent.trim() || 'main';

        // get our time info: start-time, end-time, dt, etc.
        this.timespec = parseSpecs(qs(xmile, 'xmile>sim_specs'));
        if (!this.timespec) {
            this.valid = false;
            return;
        }

        this.macros = parseMacros(xmile.getElementsByTagName('macro'));
        if (!this.macros) {
            this.valid = false;
            return null;
        }

        // ensure all models have a name attribute
        var mdls = xmile.getElementsByTagName('model');
        var i, mdl;
        for (i=0; i < mdls.length; i++) {
            mdl = mdls[i];
            if (!mdl.hasOwnProperty('name'))
                mdl.setAttribute('name', '');
        }

        this._parseVars(qs(xmile, 'xmile>model>variables').childNodes);
        this.valid = true;
        return;
    };

    /**
       Extracts the <simspecs> information into nice, usable, validated
       object. Sets common.err on error.

       @param simspecs A JQuery object wrapped around the simspecs dom node
       @return A validated control object on success, null on failure
    */
    var parseSpecs = function parseSpecs(specs) {
        var err;

        // pull the start, stop and dt (requiredSpecs) info out of the DOM
        // into the ctrl object
        var ctrl = {};
        var i, name, val;
        for (i = 0; i < specs.childNodes.length; i++) {
            // skip text nodes
            if (!specs.childNodes[i].tagName)
                continue;
            name = specs.childNodes[i].tagName.toLowerCase();
            val = parseFloat(specs.childNodes[i].textContent.trim());
            ctrl[name] = val;
        }
        // an excluded savestep means we should save every DT
        if (!ctrl.hasOwnProperty('savestep'))
            ctrl.savestep = ctrl.dt;

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
            common.err = errors.ERR_BAD_TIME;
            return null;
        }

        // finally pull out some of the supplimental info, like
        // integration method and time units
        ctrl.method = (specs.getAttribute('method') || 'euler').trim().toLowerCase();
        ctrl.units = (specs.getAttribute('time_units') || 'unknown').trim().toLowerCase();

        return ctrl;
    };

    /**
       Extracts all <macro>'s into a usable format.

       FIXME: I'm skipping macros for now, will come back to them after
       the rest of this stuff works.

       @param macros JQuery list of all the DOM's macros.
       @return A validated map of all the defined macros.
    */
    var parseMacros = function parseMacros(macros) {
        if (macros.length === 0)
            return {};

        // FIXME: is it parm or param?
        var paramSet = {};
        var i, name;
        for (i = 0; i < macros.length; i++) {
            name = macros[i].textContent.trim();
            paramSet[name] = true;
        }
        return {};
    };

    var textList = function textList(nodeList) {
        var result = [];
        var i;
        for (i=0; i<nodeList.length; i++)
            result.push(nodeList[i].textContent.trim().toLowerCase());
        return result;
    };

    /**
       Validates & figures out all necessary variable information.
    */
    Model.prototype._parseVars = function(xvars) {

        this.initials = [];
        this.stocks   = [];
        this.flows    = [];
        this.vars     = {};
        this.tables   = {};
        this.modules  = {};

        var i, xv, name, type, eqn, eqnTag, gf, v, inflows, outflows;
        for (i=0; i < xvars.length; i++) {
            xv = xvars[i];
            // skip text nodes
            if (!xv.tagName)
                continue;
            name = xv.getAttribute('name').trim().toLowerCase();
            type = xv.tagName.toLowerCase();
            eqn = null;
            eqnTag = xv.getElementsByTagName('eqn')[0];
            if (eqnTag)
                eqn = eqnTag.textContent.trim();
            else if (type !== 'module')
                console.log('no equation for ' + name);
            gf = xv.getElementsByTagName('gf');
            v = null;

            if (type === 'module') {
                this.modules[name] = name;
            } else if (type === 'stock') {
                inflows = textList(xv.getElementsByTagName('inflow'));
                outflows = textList(xv.getElementsByTagName('outflow'));
                v = new vars.Stock(this, name, type, eqn, inflows, outflows);
                this.initials.push(v);
                this.stocks.push(v);
            } else if (gf.length !== 0) {
                v = new vars.Table(this, name, eqn, gf[0]);
                this.flows.push(v);
                this.tables[v.name] = v;
            } else {
                v = new vars.Variable(this, name, type, eqn);
                if (v.isConst()) {
                    this.initials.push(v);
                    this.stocks.push(v);
                } else {
                    this.flows.push(v);
                }
            }
            if (v)
                this.vars[v.name] = v;
        }

        // We don't need to sort the stocks, because they only depend
        // on flows, which have all been calculated by the time we try
        // updating stocks.
        //
        // Also, this isn't necessarily a stable sort.
        util.sort(this.initials);
        util.sort(this.flows);
    };
    Model.prototype.sim = function() {
        return new sim.Sim(this);
    };
    Model.prototype.drawing = function(svgElementID, overrideColors) {
        return new draw.Drawing(this, svgElementID, overrideColors);
    };

    return {
        'Model': Model
    };
});
