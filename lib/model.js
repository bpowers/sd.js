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
    Model.prototype.sim = function(isStandalone) {
        return new sim.Sim(this, isStandalone);
    };
    Model.prototype.drawing = function(svgElementID, overrideColors) {
        return new draw.Drawing(this, svgElementID, overrideColors);
    };

    return {
        'Model': Model
    };
});
