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
    function Model(project, xModel) {
        this.project = project;
        this.xModel = xModel;
        this.name = xModel.ident;
        this.vars = {};
        this.tables = {};
        this.modules = {};
        this.parseVars(xModel.variables);
        this.spec = xModel.simSpec || null;
        this.valid = true;
        return;
    }
    Object.defineProperty(Model.prototype, "simSpec", {
        get: function () {
            return this.spec || this.project.simSpec;
        },
        enumerable: true,
        configurable: true
    });
    Model.prototype.lookup = function (id) {
        if (id[0] === '.')
            id = id.substr(1);
        if (id in this.vars)
            return this.vars[id];
        var parts = id.split('.');
        var module = this.modules[parts[0]];
        var nextModel = this.project.model(module.modelName);
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
        return new draw.Drawing(this, this.xModel.views[0], svgElementID, overrideColors, enableMousewheel);
    };
    Model.prototype.parseVars = function (defs) {
        for (var type_1 in VAR_TYPES) {
            if (defs[type_1] && !(defs[type_1] instanceof Array))
                defs[type_1] = [defs[type_1]];
        }
        if (defs.module) {
            for (var i = 0; i < defs.module.length; i++) {
                var xmile_1 = defs.module[i];
                var module = new vars.Module(this.project, this, xmile_1);
                this.modules[module.name] = module;
                this.vars[module.name] = module;
            }
        }
        if (defs.stock) {
            for (var i = 0; i < defs.stock.length; i++) {
                var xmile_2 = defs.stock[i];
                var stock = new vars.Stock(this, xmile_2);
                this.vars[stock.name] = stock;
            }
        }
        if (defs.aux) {
            for (var i = 0; i < defs.aux.length; i++) {
                var xmile_3 = defs.aux[i];
                var aux = null;
                if (xmile_3.gf) {
                    var table = new vars.Table(this, xmile_3);
                    if (table.ok) {
                        this.tables[aux.name] = table;
                        aux = table;
                    }
                }
                if (!aux)
                    aux = new vars.Variable(this, xmile_3);
                this.vars[aux.name] = aux;
            }
        }
        if (defs.flow) {
            for (var i = 0; i < defs.flow.length; i++) {
                var xmile_4 = defs.flow[i];
                var flow = null;
                if (xmile_4.gf) {
                    var table = new vars.Table(this, xmile_4);
                    if (table.ok) {
                        this.tables[flow.name] = table;
                        flow = table;
                    }
                }
                if (!flow)
                    flow = new vars.Variable(this, xmile_4);
                this.vars[flow.name] = flow;
            }
        }
    };
    return Model;
})();
exports.Model = Model;
