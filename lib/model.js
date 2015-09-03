// Copyright 2015 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.
'use strict';
var util = require('./util');
var vars = require('./vars');
var draw = require('./draw');
var sim = require('./sim');
var xmile = require('./xmile');
var VAR_TYPES = util.set('module', 'stock', 'aux', 'flow');
var Model = (function () {
    function Model(project, ident, xModel) {
        this.modules = {};
        this.tables = {};
        this.vars = {};
        this.project = project;
        this.xModel = xModel;
        this.name = ident;
        this.vars = {};
        this.tables = {};
        this.modules = {};
        this.parseVars(xModel.variables);
        this.spec = xModel.simSpec || null;
        this.valid = true;
        return;
    }
    Object.defineProperty(Model.prototype, "ident", {
        get: function () {
            return xmile.canonicalize(this.name);
        },
        enumerable: true,
        configurable: true
    });
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
    Model.prototype.parseVars = function (variables) {
        for (var i in variables) {
            if (!variables.hasOwnProperty(i))
                continue;
            var v = variables[i];
            var ident = v.ident;
            if (ident in this.vars)
                return new xmile.Error('duplicate var ' + ident);
            switch (v.type) {
                case 'module':
                    var module = new vars.Module(this.project, this, v);
                    this.modules[ident] = module;
                    this.vars[ident] = module;
                    break;
                case 'stock':
                    var stock = new vars.Stock(this, v);
                    this.vars[ident] = stock;
                    break;
                case 'aux':
                    var aux = null;
                    if (v.gf) {
                        var table = new vars.Table(this, v);
                        if (table.ok) {
                            this.tables[ident] = table;
                            aux = table;
                        }
                    }
                    if (!aux)
                        aux = new vars.Variable(this, v);
                    this.vars[ident] = aux;
                    break;
                case 'flow':
                    var flow = null;
                    if (v.gf) {
                        var table = new vars.Table(this, v);
                        if (table.ok) {
                            this.tables[ident] = table;
                            flow = table;
                        }
                    }
                    if (!flow)
                        flow = new vars.Variable(this, v);
                    this.vars[ident] = flow;
            }
        }
        return null;
    };
    return Model;
})();
exports.Model = Model;
