// Copyright 2015 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.
var Errors = (function () {
    function Errors() {
    }
    Errors.ERR_VERSION = 'bad xml or unknown smile version';
    Errors.ERR_BAD_TIME = 'bad time (control) data';
    return Errors;
})();
exports.Errors = Errors;
;
exports.builtins = {
    'max': {},
    'min': {},
    'pulse': {
        usesTime: true,
    },
};
exports.reserved = {
    'if': true,
    'then': true,
    'else': true,
};
