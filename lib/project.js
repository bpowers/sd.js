// Copyright 2013 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

define(['./common', './util', './model', './vars'], function(common, util, model, vars) {
    'use strict';

    var errors = common.errors;
    var qs = util.qs;
    var qsa = util.qsa;

    function parseMacros(macros) {
        if (macros.length === 0)
            return;
        // TODO(bp) enable warnings for unsupported features
        //console.log('COMPAT: model contains macros');
    }

    var Project = function(xmlString) {
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
        this.timespec = util.parseSpecs(qs(xmile, 'xmile>sim_specs'));
        if (!this.timespec) {
            this.valid = false;
            return;
        }

        parseMacros(xmile.getElementsByTagName('macro'));

        this.models = {};

        // ensure all models have a name attribute
        var mdls = qsa(xmile, 'xmile>model');
        var i, mdl;
        for (i=0; i < mdls.length; i++) {
            mdl = mdls[i];
            if (!mdl.getAttribute('name'))
                mdl.setAttribute('name', 'main');
            this.models[mdl.getAttribute('name')] = new model.Model(this, mdl);
        }
        this.main = new vars.Module(this, null, 'main', 'main');
        this.valid = true;
    };
    Project.prototype.model = function(name) {
        if (!name)
            name = 'main';
        return this.models[name];
    };

    return {
        'Project': Project,
    };
});
