// Copyright 2011 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

define([], function(util) {
    var common = {};
    common.builtins = {
        'max': function(a, b) {
            return a > b ? a : b;
        },
        'pulse': function() {}
    };

    return common;
});
