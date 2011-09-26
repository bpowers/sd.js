// Copyright 2011 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

define(['./util', './variable'], function(util, variable) {
    var engine = {};
    // used similarly to libc's errno.  On a major error store a
    // string here (one of the engine.ERR_* ones defined directly below)
    engine.err = null;

    var ERR_VERSION  = engine.ERR_VERSION  = "bad xml or unknown smile version";
    var ERR_BAD_TIME = engine.ERR_BAD_TIME = "bad time (control) data";

    const requiredSpecs = ['start', 'stop', 'dt'];

    engine.builtins = {
        'max': function(a, b) {
            return a > b ? a : b;
        }
    };

    /**
       Converts a string of xml data represnting an xmile model into a
       javascript object.  The resulting javascript object can give
       information about the model (what variables does it have, what are
       their equations, etc), and can also create simulation objects.
       Simulation objects can be parametarized and run (simulated),
       generating time-series data on all of the variables.
    */
    const Model = function Model(xmlString) {
        engine.err = null;

        const model = {};
        const xmile = $(xmlString);
        if (!xmile || xmile.find('header smile').attr('version') != "1.0") {
            engine.err = ERR_VERSION;
            this.valid = false;
            return;
        }
        model.name = xmile.find('header name').text() || 'engine model';

        // get our time info: start-time, end-time, dt, etc.
        model.ctrl = parseControlInfo(xmile.children('simspecs'));
        if (!model.ctrl) {
            this.valid = false;
            return;
        }

        model.macros = parseMacros(xmile.children('macro'));
        if (!model.macros) {
            this.valid = false;
            return null;
        }

        model.vars = this._parseVars(xmile.children('model').children('stock,flow,aux'));

        this.valid = true
        return;
    }
    engine.Model = Model;
    engine.newModel = function(xmlString) {
        const model = new Model(xmlString);

        return model.valid ? model : null;
    }

    /**
       Extracts the <simspecs> information into nice, usable, validated
       object. Sets engine.err on error.

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
            engine.err = ERR_BAD_TIME;
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
            return {}

        // FIXME: is it parm or param?
        paramSet = {}
        params = macros.children('parm').map(function() {
            const name = $(this).text();
            paramSet[name] = true;
            return name;
        });

        return {};
    }

    const mapText = function(jQueryObj) {
        var list = []
        jQueryObj.map(function() {
            list.push($(this).text().trim().toLowerCase());
        });
        return list;
    }

    /**
       Validates & figures out all necessary variable information.
    */
    Model.prototype._parseVars = function(varList) {
        const that = this;

        this.initials = []
        this.stocks   = []
        this.flows    = []
        this.vars     = {}

        varList.map(function() {
            const name     = $(this).attr('name').trim().toLowerCase();
            const type     = $(this).get(0).tagName;
            const eqn      = $(this).children('eqn').text().trim();
            var v;

            // add the variable to the map of all vars, and also to the
            // particular lists it needs to be in for calculations.
            // Stocks go into both intials and stocks, because they both
            // have initial values & update their values after we
            // calculate all the flows and auxes.
            that.vars[name] = v;
            if (type === 'STOCK') {
                const inflows  = mapText($(this).children('inflow'));
                const outflows = mapText($(this).children('outflow'));

                v = new variable.Variable(name, type, eqn, inflows, outflows);
                that.initials.push(v);
                that.stocks.push(v);
            } else {
                v = new variable.Variable(name, type, eqn);
                that.flows.push(v);
            }
        });

        // now we promote constants from being calculated every time step
        // (with the flows) to being calculated once, with the other
        // initial values.

        // now we need to sort all of the 3 lists, to make sure all our
        // computations happen in the right order.
    }

    return engine;
});
