// Copyright 2013 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

define(['./common', './util', './model', './vars', './jxon'],
       function(common, util, model, vars, jxon) {
    'use strict';

    var JXON = jxon.JXON;
    var errors = common.errors;
    var qs = util.qs;
    var qsa = util.qsa;

    // TODO(bp) macro support/warnings

    var Project = function(xmileDoc) {
        common.err = null;

        if (!xmileDoc || xmileDoc.getElementsByTagName('parsererror').length !== 0) {
            common.err = errors.ERR_VERSION;
            this.valid = false;
            return;
        }

        // in Chrome/Firefox, item 0 is xmile.  Under node's XML DOM
        // item 0 is the <xml> prefix.  And I guess there could be
        // text nodes in there, so just explictly look for xmile
        var i = 0;
        while (i < xmileDoc.childNodes.length &&
               xmileDoc.childNodes.item(i).tagName !== 'xmile')
            i++;

        var xmile = JXON.build(xmileDoc.childNodes.item(i));

        if (xmile.header.smile['@version'] !== 1) {
            common.err = errors.ERR_VERSION;
            this.valid = false;
            return;
        }
        this.xmile = xmile;
        if (typeof xmile.header.name === 'string')
            this.name = xmile.header.name;
        else
            this.name = 'main project';

        // get our time info: start-time, end-time, dt, etc.
        this.timespec = xmile.sim_specs;
        if (!this.timespec) {
            this.valid = false;
            return;
        }
        util.normalizeTimespec(this.timespec);

        this.models = {};

        if (!(xmile.model instanceof Array))
            xmile.model = [xmile.model];

        var i, mdl;
        for (i=0; i < xmile.model.length; i++) {
            mdl = xmile.model[i];
            if (!mdl['@name'])
                mdl['@name'] = 'main';
            this.models[mdl['@name']] = new model.Model(this, mdl);
        }
        this.main = new vars.Module(this, null, {'@name': 'main'});
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
