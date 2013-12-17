// Copyright 2013 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

define(['./util'], function(util) {
    'use strict';

    var VENDOR = 'SDLabs';
    var PRODUCT = 'sd.js';
    var VERSION = '0.1';

    var VAR_TYPES = util.set('module', 'stock', 'aux', 'flow');

    function iseeMatch(xmile) {
        return (/isee/i).test(xmile.header.vendor);
    }

    function iseeTranslate(xmile) {
        var i, j, mdl, type, display;
        for (i = 0; i < xmile.model.length; i++) {
            mdl = xmile.model[i];

            mdl.views = {};
            mdl.views.view = [];
            mdl.views.view.push(mdl.display);
            mdl.interface['@name'] = 'interface';
            mdl.views.view.push(mdl.interface);
            delete mdl.display;
            delete mdl.interface;

            mdl.variables = {};
            for (type in VAR_TYPES) {
                if (!mdl[type])
                    continue;
                mdl.variables[type] = mdl[type];
                delete mdl[type];
                if (!(mdl.variables[type] instanceof Array))
                    mdl.variables[type] = [mdl.variables[type]];
                if (!mdl.views.view[0][type])
                    mdl.views.view[0][type] = [];
                for (j = 0; j < mdl.variables[type].length; j++) {
                    display = mdl.variables[type][j].display;
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
    }

    return {
        isee: {
            match: iseeMatch,
            translate: iseeTranslate,
        },
    };
});
