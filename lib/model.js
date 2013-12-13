// Copyright 2011 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

define(['./util', './vars', './common', './draw', './sim'], function(util, vars, common, draw, sim) {
    'use strict';

    var qs = util.qs;

    var Model = function Model(project, modelNode) {
        this.project = project;
        this.xmile = modelNode;
        this.name = modelNode.getAttribute('name') || 'main';
        this._parseVars(qs(modelNode, 'variables').childNodes);
        var specNode = qs(modelNode, 'sim_specs');
        if (specNode)
            this._timespec = util.parseSpecs(specNode);
        else
            this._timespec = null;
        this.valid = true;
        return;
    };
    Model.prototype = {
        get timespec() {
            if (this._timespec)
                return this._timespec;
            else
                return this.project.timespec;
        }
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

        var i, j, xv, name, type, eqn, eqnTag, gf, v, inflows, outflows, params;
        for (i = 0; i < xvars.length; i++) {
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
                params = util.qsa(xv, 'connect');
                params = Array.prototype.map.apply(params, [function(c) {
                    return new vars.Reference(c.getAttribute('to'), c.getAttribute('from'));
                }]);
                v = new vars.Module(this.project, this, name, name, params);
                this.modules[name] = v;
                this.initials.push(v);
                this.flows.push(v);
                this.stocks.push(v);
            } else if (type === 'stock') {
                inflows = textList(xv.getElementsByTagName('inflow'));
                outflows = textList(xv.getElementsByTagName('outflow'));
                v = new vars.Stock(this, name, eqn, inflows, outflows);
                this.initials.push(v);
                this.stocks.push(v);
            } else if (gf.length !== 0) {
                v = new vars.Table(this, name, eqn, gf[0]);
                this.flows.push(v);
                this.tables[v.name] = v;
            } else {
                v = new vars.Variable(this, name, eqn);
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
    };
    Model.prototype.orderEquations = function() {
        // We don't need to sort the stocks, because they only depend
        // on flows, which have all been calculated by the time we try
        // updating stocks.
        //
        // Also, this isn't necessarily a stable sort.
        util.sort(this.initials);
        util.sort(this.flows);
    };
    Model.prototype.lookup = function(id) {
        if (id[0] === '.')
            id = id.substr(1);
        if (id in this.vars)
            return this.vars[id];
        var parts = id.split('.');
        var nextModel = this.project.models[this.modules[parts[0]].modelName];
        return nextModel.lookup(parts.slice(1).join('.'));
    }
    Model.prototype.sim = function(isStandalone) {
        if (this.name === 'main')
            return new sim.Sim(this.project.main, isStandalone);
        else
            return new sim.Sim(new vars.Module(this.project, null, 'main', this.name), isStandalone);
    };
    Model.prototype.drawing = function(svgElementID, overrideColors, enableMousewheel) {
        return new draw.Drawing(this, svgElementID, overrideColors, enableMousewheel);
    };

    return {
        'Model': Model
    };
});
