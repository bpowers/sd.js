// Copyright 2015 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.
'use strict';
var util = require('./util');
var vars = require('./vars');
var draw = require('./draw');
var sim = require('./sim');
var VAR_TYPES = util.set('module', 'stock', 'aux', 'flow');
var Model = (function () {
    function Model(project, xmile) {
        this.project = project;
        this.xmile = xmile;
        this.name = util.eName(xmile['@name']);
        this.vars = {};
        this.tables = {};
        this.modules = {};
        this._parseVars(xmile.variables);
        if (xmile.sim_specs) {
            this._timespec = xmile.sim_specs;
        }
        else {
            this._timespec = null;
        }
        util.normalizeTimespec(this._timespec);
        this.valid = true;
        return;
    }
    Object.defineProperty(Model.prototype, "timespec", {
        get: function () {
            if (this._timespec) {
                return this._timespec;
            }
            else {
                return this.project.timespec;
            }
        },
        enumerable: true,
        configurable: true
    });
    Model.prototype._parseVars = function (defs) {
        for (var type_1 in VAR_TYPES) {
            if (defs[type_1] && !(defs[type_1] instanceof Array))
                defs[type_1] = [defs[type_1]];
        }
        if (defs.module) {
            for (var i = 0; i < defs.module.length; i++) {
                var xmile = defs.module[i];
                var module = new vars.Module(this.project, this, xmile);
                this.modules[module.name] = module;
                this.vars[module.name] = module;
            }
        }
        if (defs.stock) {
            for (var i = 0; i < defs.stock.length; i++) {
                var xmile = defs.stock[i];
                var stock = new vars.Stock(this, xmile);
                this.vars[stock.name] = stock;
            }
        }
        if (defs.aux) {
            for (var i = 0; i < defs.aux.length; i++) {
                var xmile = defs.aux[i];
                var aux = null;
                if (xmile.gf) {
                    var table = new vars.Table(this, xmile);
                    if (table.ok) {
                        this.tables[aux.name] = table;
                        aux = table;
                    }
                }
                if (!aux)
                    aux = new vars.Variable(this, xmile);
                this.vars[aux.name] = aux;
            }
        }
        if (defs.flow) {
            for (var i = 0; i < defs.flow.length; i++) {
                var xmile = defs.flow[i];
                var flow = null;
                if (xmile.gf) {
                    var table = new vars.Table(this, xmile);
                    if (table.ok) {
                        this.tables[flow.name] = table;
                        flow = table;
                    }
                }
                if (!flow)
                    flow = new vars.Variable(this, xmile);
                this.vars[flow.name] = flow;
            }
        }
    };
    Model.prototype.lookup = function (id) {
        if (id[0] === '.')
            id = id.substr(1);
        if (id in this.vars)
            return this.vars[id];
        var parts = id.split('.');
        var nextModel = this.project.models[this.modules[parts[0]].modelName];
        return nextModel.lookup(parts.slice(1).join('.'));
    };
    Model.prototype.sim = function (isStandalone) {
        var mod;
        if (this.name === 'main') {
            mod = this.project.main;
        }
        else {
            mod = null;
            console.log('FIXME: sim of non-main model');
        }
        return new sim.Sim(mod, isStandalone);
    };
    Model.prototype.drawing = function (svgElementID, overrideColors, enableMousewheel) {
        return new draw.Drawing(this, this.xmile.views.view[0], svgElementID, overrideColors, enableMousewheel);
    };
    return Model;
})();
exports.Model = Model;
