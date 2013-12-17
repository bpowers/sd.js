// Copyright 2013 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

define(['./util', './vars', './common', './draw', './sim'], function(util, vars, common, draw, sim) {
    'use strict';

    var VAR_TYPES = util.set('module', 'stock', 'aux', 'flow');

    var Model = function Model(project, xmile) {
        this.project = project;
        this.xmile = xmile;
        this.name = util.eName(xmile['@name']);
        this._parseVars(xmile.variables);
        if (xmile.sim_specs)
            this._timespec = xmile.sim_specs;
        else
            this._timespec = null;
        util.normalizeTimespec(this._timespec);
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

    /**
       Validates & figures out all necessary variable information.
    */
    Model.prototype._parseVars = function(defs) {
        this.vars     = {};
        this.tables   = {};
        this.modules  = {};
        var xmile;

        // JXON doesn't have the capacity to know when we really want
        // things to be lists, this is a workaround.
        var type;
        for (type in VAR_TYPES) {
            // for every known type, make sure we have a list of
            // elements even if there is only one element (e.g. a
            // module)
            if (defs[type] && !(defs[type] instanceof Array))
                defs[type] = [defs[type]];
        }

        var module;
        var i = 0;
        if (defs.module) {
            for (i = 0; i < defs.module.length; i++) {
                xmile = defs.module[i];
                module = new vars.Module(this.project, this, xmile);
                this.modules[module.name] = module;
                this.vars[module.name] = module;
            }
        }

        var stock;
        if (defs.stock) {
            for (i = 0; i < defs.stock.length; i++) {
                xmile = defs.stock[i];
                stock = new vars.Stock(this, xmile);
                this.vars[stock.name] = stock;
            }
        }

        var aux;
        if (defs.aux) {
            for (i = 0; i < defs.aux.length; i++) {
                xmile = defs.aux[i];
                if (xmile.gf) {
                    aux = new vars.Table(this, xmile);
                    this.tables[aux.name] = aux;
                } else {
                    aux = new vars.Variable(this, xmile);
                }
                this.vars[aux.name] = aux;
            }
        }

        var flow;
        if (defs.flow) {
            for (i = 0; i < defs.flow.length; i++) {
                xmile = defs.flow[i];
                if (xmile.gf) {
                    aux = new vars.Table(this, xmile);
                    this.tables[aux.name] = aux;
                } else {
                    aux = new vars.Variable(this, xmile);
                }
                this.vars[aux.name] = aux;
            }
        }
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
        return new draw.Drawing(this, this.xmile.views.view[0], svgElementID,
                                overrideColors, enableMousewheel);
    };

    return {
        'Model': Model
    };
});
