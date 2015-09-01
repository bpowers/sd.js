// Copyright 2015 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.
'use strict';
var common = require('./common');
var project_1 = require('./project');
var project_2 = require('./project');
exports.Project = project_2.Project;
var model_1 = require('./model');
exports.Model = model_1.Model;
exports.Errors = common.Errors;
function newModel(xmlDoc) {
    'use strict';
    var p = new project_1.Project(xmlDoc);
    if (p.valid)
        return p.model();
    return null;
}
exports.newModel = newModel;
function load(url, cb, errCb) {
    'use strict';
    var req = new XMLHttpRequest();
    req.onreadystatechange = function () {
        if (req.readyState !== 4)
            return;
        if (req.status >= 200 && req.status < 300) {
            var xml = req.responseXML;
            if (!xml)
                xml = (new DOMParser()).parseFromString(req.responseText, 'application/xml');
            var mdl = newModel(xml);
            cb(mdl);
        }
        else if (errCb) {
            errCb(req);
        }
    };
    req.open('GET', url, true);
    req.send();
}
exports.load = load;
function error() {
    'use strict';
    return common.err;
}
exports.default = error;
//# sourceMappingURL=sd.js.map