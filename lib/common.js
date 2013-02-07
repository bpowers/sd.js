// Copyright 2011 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

define([], function(util) {
    var common = {};

    // used similarly to libc's errno.  On a major error store a
    // string here (one of the sd.ERR_* ones defined directly below)
    common.err = null;

    common.errors = {
        ERR_VERSION: "bad xml or unknown smile version",
        ERR_BAD_TIME: "bad time (control) data",
    };

    common.builtins = {
        'max': function(a, b) {
            return a > b ? a : b;
        },
        'pulse': function() {}
    };

    return common;
});
