// Copyright 2013 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

define(['./util'], function(util) {

    var VAR_TYPES = util.set('module', 'stock', 'aux', 'flow');

    function iseeMatch(xmile) {
        return (/isee/i).test(xmile.header.vendor);
    }

    function iseeTranslate(xmile) {

        var i, mdl, type;
        for (i = 0; i < xmile.model.length; i++) {
            mdl = xmile.model[i];
            mdl.variables = {};
            for (type in VAR_TYPES) {
                if (mdl[type]) {
                    mdl.variables[type] = mdl[type];
                    delete mdl[type];
                }
            }
            mdl.views = [];
            mdl.views.push(mdl.display);
            mdl.interface['@name'] = 'interface';
            mdl.views.push(mdl.interface);
            delete mdl.display;
            delete mdl.interface;
        }

        return xmile;
    }

    return {
        isee: {
            match: iseeMatch,
            translate: iseeTranslate,
        },
    };
});
