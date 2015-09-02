// Copyright 2015 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.
'use strict';
var common = require('./common');
var jxon = require('./jxon');
var util_1 = require('./util');
var model_1 = require('./model');
var vars_1 = require('./vars');
function getXmileElement(xmileDoc) {
    'use strict';
    var i;
    for (i = 0; i < xmileDoc.childNodes.length; i++) {
        var node = xmileDoc.childNodes.item(i);
        if (node.tagName === 'xmile')
            return node;
    }
    return null;
}
var Project = (function () {
    function Project(xmileDoc) {
        common.err = null;
        this.valid = false;
        this.addDocument(xmileDoc, true);
    }
    Project.prototype.model = function (name) {
        if (!name)
            name = 'main';
        return this.models[name];
    };
    Project.prototype.addDocument = function (xmileDoc, isMain) {
        if (isMain === void 0) { isMain = false; }
        if (!xmileDoc || xmileDoc.getElementsByTagName('parsererror').length !== 0) {
            common.err = common.Errors.ERR_VERSION;
            this.valid = false;
            return false;
        }
        var xmileElement = getXmileElement(xmileDoc);
        var xmile = jxon.build(xmileElement);
        if (!(xmile.model instanceof Array))
            xmile.model = [xmile.model];
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
            return false;
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
        return true;
    };
    return Project;
})();
exports.Project = Project;
