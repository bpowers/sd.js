// Copyright 2015 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.
'use strict';
var common = require('./common');
var xmile = require('./xmile');
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
        this.files = [];
        this.models = {};
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
        var _a = xmile.FileBuilder(xmileElement), file = _a[0], err = _a[1];
        if (err) {
            this.valid = false;
            return false;
        }
        this.files.push(file);
        if (isMain) {
            this.name = file.header.name || 'sd project';
            this.simSpec = file.simSpec;
            if (!file.simSpec) {
                this.valid = false;
                return false;
            }
        }
        for (var i in file.models) {
            if (!file.models.hasOwnProperty(i))
                continue;
            var xModel = file.models[i];
            this.models[xModel.name] = new model_1.Model(this, xModel);
        }
        this.main = new vars_1.Module(this, null, { '@name': 'main' });
        this.valid = true;
        return true;
    };
    return Project;
})();
exports.Project = Project;
