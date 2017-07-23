'use strict';
var util = require('./util');
var VENDOR = 'SDLabs';
var PRODUCT = 'sd.js';
var VERSION = '0.2.6';
var VAR_TYPES = util.set('module', 'stock', 'aux', 'flow');
var Isee = (function () {
    function Isee() {
    }
    Isee.prototype.match = function (xmile) {
        'use strict';
        return (/isee/i).test(xmile.header.vendor);
    };
    Isee.prototype.translate = function (xmile) {
        'use strict';
        for (var i = 0; i < xmile.model.length; i++) {
            var mdl = xmile.model[i];
            mdl.views = {};
            mdl.views.view = [];
            if (mdl.views) {
                mdl.views.view.push(mdl.display);
                delete mdl.display;
            }
            if (mdl.interface) {
                mdl.interface['@name'] = 'interface';
                mdl.views.view.push(mdl.interface);
                delete mdl.interface;
            }
            mdl.variables = {};
            for (var type in VAR_TYPES) {
                if (!mdl[type])
                    continue;
                mdl.variables[type] = mdl[type];
                delete mdl[type];
                if (!(mdl.variables[type] instanceof Array))
                    mdl.variables[type] = [mdl.variables[type]];
                if (!mdl.views.view[0][type])
                    mdl.views.view[0][type] = [];
                for (var j = 0; j < mdl.variables[type].length; j++) {
                    var display = mdl.variables[type][j].display;
                    display['@name'] = mdl.variables[type][j]['@name'];
                    if ('label_side' in display) {
                        display['@label_side'] = display.label_side;
                        delete display.label_side;
                    }
                    mdl.views.view[0][type].push(display);
                    delete mdl.variables[type][j].display;
                }
            }
        }
        xmile.header.vendor = VENDOR;
        xmile.header.product = {
            '@version': VERSION,
            'keyValue': PRODUCT,
        };
        xmile.header.version = VERSION;
        return xmile;
    };
    return Isee;
}());
exports.vendors = {
    'isee': new Isee(),
};
