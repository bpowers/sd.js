// Copyright 2015 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.
'use strict';
var Error = (function () {
    function Error(error) {
        this.error = error;
    }
    return Error;
})();
exports.Error = Error;
function PointBuilder(el) {
    'use strict';
    return [null, null];
}
exports.PointBuilder = PointBuilder;
var b = PointBuilder;
var Point = (function () {
    function Point(el) {
    }
    Point.prototype.toXml = function (doc, parent) {
        return true;
    };
    return Point;
})();
exports.Point = Point;
var Size = (function () {
    function Size(el) {
    }
    Size.prototype.toXml = function (doc, parent) {
        return true;
    };
    return Size;
})();
exports.Size = Size;
var Rect = (function () {
    function Rect(el) {
    }
    Rect.prototype.toXml = function (doc, parent) {
        return true;
    };
    return Rect;
})();
exports.Rect = Rect;
function FileBuilder(el) {
    'use strict';
    return [null, null];
}
exports.FileBuilder = FileBuilder;
var File = (function () {
    function File(el) {
    }
    File.Build = function (el) {
        return [null, null];
    };
    File.prototype.toXml = function (doc, parent) {
        return true;
    };
    return File;
})();
exports.File = File;
var SimSpec = (function () {
    function SimSpec(start, stop, dt, saveStep, method, timeUnits) {
        if (saveStep === void 0) { saveStep = dt; }
        if (method === void 0) { method = 'euler'; }
        if (timeUnits === void 0) { timeUnits = ''; }
        this.start = start;
        this.stop = stop;
        this.dt = dt;
        this.saveStep = saveStep;
        this.method = method;
        this.timeUnits = timeUnits;
    }
    SimSpec.Build = function (el) {
        var method = '';
        switch (method) {
            case 'euler':
                break;
            case 'rk4':
            case 'rk2':
            case 'rk45':
            case 'gear':
                console.log('valid but unsupported integration ' +
                    'method: ' + method + '. using euler');
                method = 'euler';
                break;
            default:
                return [null, new Error('unknown integration method ' + method)];
        }
    };
    SimSpec.prototype.toXml = function (doc, parent) {
        return true;
    };
    return SimSpec;
})();
exports.SimSpec = SimSpec;
var Unit = (function () {
    function Unit(el) {
    }
    Unit.prototype.toXml = function (doc, parent) {
        return true;
    };
    return Unit;
})();
exports.Unit = Unit;
var Header = (function () {
    function Header(el) {
    }
    Header.prototype.toXml = function (doc, parent) {
        return true;
    };
    return Header;
})();
exports.Header = Header;
var Dimension = (function () {
    function Dimension(el) {
    }
    Dimension.prototype.toXml = function (doc, parent) {
        return true;
    };
    return Dimension;
})();
exports.Dimension = Dimension;
var Options = (function () {
    function Options(el) {
    }
    Options.prototype.toXml = function (doc, parent) {
        return true;
    };
    return Options;
})();
exports.Options = Options;
var Behavior = (function () {
    function Behavior(el) {
    }
    Behavior.prototype.toXml = function (doc, parent) {
        return true;
    };
    return Behavior;
})();
exports.Behavior = Behavior;
var Style = (function () {
    function Style(el) {
    }
    Style.prototype.toXml = function (doc, parent) {
        return true;
    };
    return Style;
})();
exports.Style = Style;
var Data = (function () {
    function Data(el) {
    }
    Data.prototype.toXml = function (doc, parent) {
        return true;
    };
    return Data;
})();
exports.Data = Data;
var Model = (function () {
    function Model(el) {
    }
    Model.prototype.toXml = function (doc, parent) {
        return true;
    };
    return Model;
})();
exports.Model = Model;
var Variable = (function () {
    function Variable(el) {
    }
    Variable.prototype.toXml = function (doc, parent) {
        return true;
    };
    return Variable;
})();
exports.Variable = Variable;
var View = (function () {
    function View(el) {
    }
    View.prototype.toXml = function (doc, parent) {
        return true;
    };
    return View;
})();
exports.View = View;
var GF = (function () {
    function GF(el) {
    }
    GF.prototype.toXml = function (doc, parent) {
        return true;
    };
    return GF;
})();
exports.GF = GF;
var Scale = (function () {
    function Scale(el) {
    }
    Scale.prototype.toXml = function (doc, parent) {
        return true;
    };
    return Scale;
})();
exports.Scale = Scale;
var Connect = (function () {
    function Connect(el) {
    }
    Connect.prototype.toXml = function (doc, parent) {
        return true;
    };
    return Connect;
})();
exports.Connect = Connect;
