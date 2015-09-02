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
function i32(n) {
    'use strict';
    return n | 0;
}
function attr(node, name) {
    'use strict';
    for (var i = 0; i < node.attributes.length; i++) {
        var attr_1 = node.attributes.item(i);
        if (attr_1.name.toLowerCase() === name)
            return attr_1.value;
    }
    return null;
}
function parseText(val) {
    'use strict';
    val = val.trim();
    if (/^\s*$/.test(val))
        return null;
    if (/^(?:true|false)$/i.test(val))
        return val.toLowerCase() === 'true';
    if (isFinite(val))
        return parseFloat(val);
    return val;
}
function content(node) {
    'use strict';
    var text = '';
    if (node.hasChildNodes()) {
        for (var i = 0; i < node.childNodes.length; i++) {
            var child = node.childNodes.item(i);
            switch (child.nodeType) {
                case 3:
                    text += child.nodeValue.trim();
                    break;
                case 4:
                    text += child.nodeValue;
                    break;
            }
        }
    }
    return text;
}
function str(v) {
    'use strict';
    if (typeof v === 'undefined' || v === null)
        return ['', null];
    if (typeof v === 'string')
        return [v, null];
    return ['', new Error('not string: ' + v)];
}
function num(v) {
    'use strict';
    if (typeof v === 'undefined' || v === null)
        return [0, null];
    if (typeof v === 'number')
        return [v, null];
    return [NaN, new Error('not number: ' + v)];
}
function bool(v) {
    'use strict';
    if (typeof v === 'undefined' || v === null)
        return [false, null];
    if (typeof v === 'boolean')
        return [v, null];
    return [false, new Error('not boolean: ' + v)];
}
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
var File = (function () {
    function File() {
    }
    File.Build = function (el) {
        var file = new File();
        var err = null;
        for (var i = 0; i < el.attributes.length; i++) {
            var attr_2 = el.attributes.item(i);
            switch (attr_2.name.toLowerCase()) {
                case 'version':
                    file.version = attr_2.value;
                    break;
                case 'xmlns':
                    file.namespace = attr_2.value;
                    break;
            }
        }
        for (var i = 0; i < el.childNodes.length; i++) {
            var child = el.childNodes.item(i);
            if (child.nodeType !== 1)
                continue;
            switch (child.nodeName.toLowerCase()) {
                case 'header':
                    _a = Header.Build(child), file.header = _a[0], err = _a[1];
                    if (err)
                        return [null, new Error('Header: ' + err.error)];
                    break;
                case 'sim_specs':
                    _b = SimSpec.Build(child), file.simSpec = _b[0], err = _b[1];
                    if (err)
                        return [null, new Error('SimSpec: ' + err.error)];
                    break;
            }
        }
        console.log('version: ' + file.version);
        console.log('namespace: ' + file.namespace);
        console.log('header: ' + file.header);
        console.log('sim_spec: ' + file.simSpec);
        return [file, err];
        var _a, _b;
    };
    File.prototype.toXml = function (doc, parent) {
        return true;
    };
    return File;
})();
exports.File = File;
var SimSpec = (function () {
    function SimSpec() {
        this.start = 0;
        this.stop = 1;
        this.dt = 1;
        this.saveStep = 1;
        this.method = 'euler';
        this.timeUnits = '';
    }
    SimSpec.Build = function (el) {
        var simSpec = new SimSpec();
        switch (simSpec.method) {
            case 'euler':
                break;
            case 'rk4':
            case 'rk2':
            case 'rk45':
            case 'gear':
                console.log('valid but unsupported integration ' +
                    'method: ' + simSpec.method +
                    '. using euler');
                simSpec.method = 'euler';
                break;
            default:
                return [null, new Error('unknown integration method ' + simSpec.method)];
        }
        return [simSpec, null];
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
var Product = (function () {
    function Product() {
        this.name = 'unknown';
        this.lang = 'English';
        this.version = '';
    }
    Product.Build = function (el) {
        var product = new Product();
        product.name = content(el);
        for (var i = 0; i < el.attributes.length; i++) {
            var attr_3 = el.attributes.item(i);
            switch (attr_3.name.toLowerCase()) {
                case 'version':
                    product.version = attr_3.value;
                    break;
                case 'lang':
                    product.lang = attr_3.value;
                    break;
            }
        }
        return [product, null];
    };
    Product.prototype.toXml = function (doc, parent) {
        return true;
    };
    return Product;
})();
exports.Product = Product;
var Header = (function () {
    function Header() {
    }
    Header.Build = function (el) {
        var header = new Header();
        var err;
        for (var i = 0; i < el.childNodes.length; i++) {
            var child = el.childNodes.item(i);
            if (child.nodeType !== 1)
                continue;
            switch (child.nodeName.toLowerCase()) {
                case 'vendor':
                    header.vendor = content(child);
                    break;
                case 'product':
                    _a = Product.Build(child), header.product = _a[0], err = _a[1];
                    if (err)
                        return [null, new Error('Product: ' + err.error)];
                    break;
                case 'options':
                    _b = Options.Build(child), header.options = _b[0], err = _b[1];
                    if (err)
                        return [null, new Error('Options: ' + err.error)];
                    break;
                case 'name':
                    header.name = content(child);
                    break;
                case 'version':
                    header.version = content(child);
                    break;
                case 'caption':
                    header.caption = content(child);
                    break;
                case 'author':
                    header.author = content(child);
                    break;
                case 'affiliation':
                    header.affiliation = content(child);
                    break;
                case 'client':
                    header.client = content(child);
                    break;
                case 'copyright':
                    header.copyright = content(child);
                    break;
                case 'created':
                    header.created = content(child);
                    break;
                case 'modified':
                    header.modified = content(child);
                    break;
                case 'uuid':
                    header.uuid = content(child);
                    break;
            }
        }
        return [header, err];
        var _a, _b;
    };
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
    function Options() {
        this.usesArrays = false;
        this.usesMacros = false;
        this.usesConveyor = false;
        this.usesQueue = false;
        this.usesSubmodels = false;
        this.usesEventPosters = false;
        this.hasModelView = false;
        this.usesOutputs = false;
        this.usesInputs = false;
        this.usesAnnotation = false;
        this.maximumDimensions = 1;
        this.invalidIndexValue = 0;
        this.recursiveMacros = false;
        this.optionFilters = false;
        this.arrest = false;
        this.leak = false;
        this.overflow = false;
        this.messages = false;
        this.numericDisplay = false;
        this.lamp = false;
        this.gauge = false;
        this.numericInput = false;
        this.list = false;
        this.graphicalInput = false;
    }
    Options.Build = function (el) {
        var options = new Options();
        var err;
        for (var i = 0; i < el.attributes.length; i++) {
            var attr_4 = el.attributes.item(i);
            switch (attr_4.name.toLowerCase()) {
                case 'namespace':
                    var names = attr_4.value.split(',');
                    options.namespaces = names.map(function (s) { return s.trim(); });
                    break;
            }
        }
        for (var i = 0; i < el.childNodes.length; i++) {
            var child = el.childNodes.item(i);
            if (child.nodeType !== 1)
                continue;
            var name_1 = child.nodeName.toLowerCase();
            var plen = void 0;
            if (name_1.slice(0, 5) === 'uses_')
                plen = 4;
            else if (name_1.substring(0, 4) !== 'has_')
                plen = 3;
            if (!plen)
                continue;
            name_1 = name_1.slice(0, plen) + name_1.slice(plen + 1, plen + 2).toUpperCase() + name_1.slice(plen + 2);
            if (!options.hasOwnProperty(name_1))
                continue;
            options[name_1] = true;
            if (name_1 === 'usesArrays') {
                var val = void 0;
                val = attr(child, 'maximum_dimensions');
                if (val) {
                    var n = void 0;
                    _a = num(val), n = _a[0], err = _a[1];
                    if (err) {
                        console.log('bad max_dimensions( ' + val + '): ' + err.error);
                        n = 1;
                    }
                    if (n !== i32(n)) {
                        console.log('non-int max_dimensions: ' + val);
                    }
                    options.maximumDimensions = i32(n);
                }
                val = attr(child, 'invalid_index_value');
                if (val === 'NaN')
                    options.invalidIndexValue = NaN;
            }
        }
        return [options, err];
        var _a;
    };
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
    Object.defineProperty(Model.prototype, "ident", {
        get: function () {
            return canonicalize(this.name);
        },
        enumerable: true,
        configurable: true
    });
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
function canonicalize(id) {
    'use strict';
    id = id.toLowerCase();
    id = id.replace(/\\n/g, '_');
    id = id.replace(/\\\\/g, '\\');
    id = id.replace(/\\"/g, '\\');
    return id.replace(/[_\r\n\t \xa0]+/g, '_');
}
exports.canonicalize = canonicalize;
