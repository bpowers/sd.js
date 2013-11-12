// Copyright 2011 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

define(['./util', './vars', './common', './draw', './sim'], function(util, vars, common, draw, sim) {
    var model = {};

    const errors = common.errors;
    const requiredSpecs = ['start', 'stop', 'dt'];

    /**
       Converts a string of xml data represnting an xmile model into a
       javascript object.  The resulting javascript object can give
       information about the model (what variables does it have, what are
       their equations, etc), and can also create simulation objects.
       Simulation objects can be parametarized and run (simulated),
       generating time-series data on all of the variables.
    */
    const Model = function Model(xmlString) {
        common.err = null;

        const xmile = $(xmlString);
        if (!xmile || xmile.find('header smile').attr('version') != "1.0") {
            common.err = errors.ERR_VERSION;
            this.valid = false;
            return;
        }
        this.xmile = xmile;
        this.name = xmile.find('header name').text() || 'engine model';

        // get our time info: start-time, end-time, dt, etc.
        this.timespec = parseControlInfo(xmile.children('sim_specs'));
        if (!this.timespec) {
            this.valid = false;
            return;
        }

        this.macros = parseMacros(xmile.children('macro'));
        if (!this.macros) {
            this.valid = false;
            return null;
        }

        // ensure all models have a name attribute
        var mdls = xmile.find('model');
        var i, mdl;
        for (i=0; i < mdls.length; i++) {
            mdl = mdls[i];
            if (!mdl.hasOwnProperty('name'))
                $(mdl).attr('name', '');
        }

        this._parseVars(xmile.find('model[name=""] variables').children());
        this.valid = true
        return;
    }

    /**
       Extracts the <simspecs> information into nice, usable, validated
       object. Sets common.err on error.

       @param simspecs A JQuery object wrapped around the simspecs dom node
       @return A validated control object on success, null on failure
    */
    const parseControlInfo = function(simspecs) {
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
            common.err = errors.ERR_BAD_TIME;
            return null;
        }

        // finally pull out some of the supplimental info, like
        // integration method and time units
        ctrl.method = (simspecs.attr('method') || 'euler').toLowerCase();
        ctrl.units = (simspecs.attr('time_units') || 'unknown').toLowerCase();

        return ctrl;
    }

    /**
       Extracts all <macro>'s into a usable format.

       FIXME: I'm skipping macros for now, will come back to them after
       the rest of this stuff works.

       @param macros JQuery list of all the DOM's macros.
       @return A validated map of all the defined macros.
    */
    const parseMacros = function(macros) {
        if (macros.length === 0)
            return {};

        // FIXME: is it parm or param?
        paramSet = {}
        params = macros.children('parm').map(function() {
            const name = $(this).text();
            paramSet[name] = true;
            return name;
        });

        return {};
    }

    const textList = function(jo) {
        var list = []
        jo.map(function() {
            list.push($(this).text().trim().toLowerCase());
        });
        return list;
    }

    /**
       Validates & figures out all necessary variable information.
    */
    Model.prototype._parseVars = function(xvars) {

        this.initials = []
        this.stocks   = []
        this.flows    = []
        this.vars     = {}
        this.tables   = {}

        var i, jvar, name, type, eqn, gf, v, inflows, outflows;
        for (i=0; i < xvars.length; i++) {
            jvar = $(xvars[i]);
            name = jvar.attr('name').trim().toLowerCase();
            type = jvar.get(0).tagName;
            eqn = jvar.children('eqn').text().trim();
            gf = jvar.children('gf');
            v = null;

            if (type === 'STOCK') {
                inflows = textList(jvar.children('inflow'));
                outflows = textList(jvar.children('outflow'));
                v = new vars.Stock(name, type, eqn, inflows, outflows);
                this.initials.push(v);
                this.stocks.push(v);
            } else if (gf.length !== 0) {
                v = new vars.Table(name, eqn, gf);
                this.flows.push(v);
                this.tables[name] = v;
            } else {
                v = new vars.Variable(name, type, eqn);
                this.flows.push(v);
            }
            this.vars[name] = v;
        }

        // TODO: promote constants from being calculated every time
        // step (with the flows) to being calculated once, with the
        // other initial values.

        // We don't need to sort the stocks, because they only depend
        // on flows, which have all been calculated by the time we try
        // updating stocks.
        //
        // Also, this isn't necessarily a stable sort.
        util.sort(this.initials);
        util.sort(this.flows);
    }
    Model.prototype.sim = function() {
        return new sim.Sim(this);
    }

    model.Model = Model;

    return model;
});
