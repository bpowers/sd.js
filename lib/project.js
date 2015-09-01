// Copyright 2015 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.
'use strict';
var common = require('./common');
var jxon = require('./jxon');
var compat = require('./compat');
var util_1 = require('./util');
var model_1 = require('./model');
var vars_1 = require('./vars');
var Project = (function () {
    function Project(xmileDoc) {
        common.err = null;
        if (!xmileDoc || xmileDoc.getElementsByTagName('parsererror').length !== 0) {
            common.err = common.Errors.ERR_VERSION;
            this.valid = false;
            return;
        }
        var iNode;
        for (iNode = 0; iNode < xmileDoc.childNodes.length &&
            xmileDoc.childNodes.item(iNode).tagName !== 'xmile'; iNode++)
            ;
        var xmile = jxon.build(xmileDoc.childNodes.item(iNode));
        if (!(xmile.model instanceof Array))
            xmile.model = [xmile.model];
        for (var v in compat.vendors) {
            if (!compat.vendors.hasOwnProperty(v))
                continue;
            if (compat.vendors[v].match(xmile))
                xmile = compat.vendors[v].translate(xmile);
        }
        this.xmile = xmile;
        if (typeof xmile.header.name === 'string') {
            this.name = xmile.header.name;
        }
        else {
            this.name = 'main project';
        }
        this.timespec = xmile.sim_specs;
        if (!this.timespec) {
            this.valid = false;
            return;
        }
        util_1.normalizeTimespec(this.timespec);
        this.models = {};
        for (var i = 0; i < xmile.model.length; i++) {
            var mdl = xmile.model[i];
            if (!mdl['@name'])
                mdl['@name'] = 'main';
            this.models[mdl['@name']] = new model_1.Model(this, mdl);
        }
        this.main = new vars_1.Module(this, null, { '@name': 'main' });
        this.valid = true;
    }
    Project.prototype.model = function (name) {
        if (!name)
            name = 'main';
        return this.models[name];
    };
    return Project;
})();
exports.Project = Project;
//# sourceMappingURL=project.js.map