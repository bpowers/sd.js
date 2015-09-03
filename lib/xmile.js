// Copyright 2015 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.
'use strict';
function camelCase(s) {
    'use strict';
    var i = 0;
    while ((i = s.indexOf('_')) >= 0 && i < s.length - 1) {
        s = s.slice(0, i) + s.slice(i + 1, i + 2).toUpperCase() + s.slice(i + 2);
    }
    return s;
}
exports.camelCase = camelCase;
function splitOnComma(str) {
    'use strict';
    return str.split(',').map(function (el) { return el.trim(); });
}
exports.splitOnComma = splitOnComma;
function numberize(arr) {
    'use strict';
    return arr.map(function (el) { return parseFloat(el); });
}
exports.numberize = numberize;
function i32(n) {
    'use strict';
    return n | 0;
}
exports.i32 = i32;
var Error = (function () {
    function Error(error) {
        this.error = error;
    }
    return Error;
})();
exports.Error = Error;
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
function num(v) {
    'use strict';
    if (typeof v === 'undefined' || v === null)
        return [0, null];
    if (typeof v === 'number')
        return [v, null];
    var n = parseFloat(v);
    if (isFinite(n))
        return [n, null];
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
    function Point() {
    }
    Point.Build = function (el) {
        var pt = new Point();
        var err;
        for (var i = 0; i < el.attributes.length; i++) {
            var attr_2 = el.attributes.item(i);
            switch (attr_2.name.toLowerCase()) {
                case 'x':
                    _a = num(attr_2.value), pt.x = _a[0], err = _a[1];
                    if (err)
                        return [null, new Error('x not num: ' + err.error)];
                    break;
                case 'y':
                    _b = num(attr_2.value), pt.y = _b[0], err = _b[1];
                    if (err)
                        return [null, new Error('y not num: ' + err.error)];
                    break;
            }
        }
        return [pt, err];
        var _a, _b;
    };
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
        this.namespace = 'https://docs.oasis-open.org/xmile/ns/XMILE/v1.0';
        this.dimensions = [];
        this.units = [];
        this.models = [];
    }
    File.Build = function (el) {
        var file = new File();
        var err = null;
        for (var i = 0; i < el.attributes.length; i++) {
            var attr_3 = el.attributes.item(i);
            switch (attr_3.name.toLowerCase()) {
                case 'version':
                    file.version = attr_3.value;
                    break;
                case 'xmlns':
                    file.namespace = attr_3.value;
                    break;
            }
        }
        for (var i = 0; i < el.childNodes.length; i++) {
            var model = void 0;
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
                case 'model':
                    _c = Model.Build(child), model = _c[0], err = _c[1];
                    if (err)
                        return [null, new Error('SimSpec: ' + err.error)];
                    file.models.push(model);
                    break;
            }
        }
        return [file, err];
        var _a, _b, _c;
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
        this.saveStep = 0;
        this.method = 'euler';
        this.timeUnits = '';
    }
    SimSpec.Build = function (el) {
        var simSpec = new SimSpec();
        var err;
        for (var i = 0; i < el.childNodes.length; i++) {
            var child = el.childNodes.item(i);
            if (child.nodeType !== 1)
                continue;
            var name_1 = camelCase(child.nodeName.toLowerCase());
            if (name_1 === 'savestep')
                name_1 = 'saveStep';
            if (!simSpec.hasOwnProperty(name_1))
                continue;
            if (name_1 === 'method' || name_1 === 'timeUnits') {
                simSpec[name_1] = content(child).toLowerCase();
            }
            else {
                _a = num(content(child)), simSpec[name_1] = _a[0], err = _a[1];
                if (err)
                    return [null, new Error(child.nodeName + ': ' + err.error)];
                if (name_1 === 'dt') {
                    if (attr(child, 'reciprocal') === 'true') {
                        simSpec.dtReciprocal = simSpec.dt;
                        simSpec.dt = 1 / simSpec.dt;
                    }
                }
            }
        }
        if (!simSpec.saveStep)
            simSpec.saveStep = simSpec.dt;
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
        var _a;
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
            var attr_4 = el.attributes.item(i);
            switch (attr_4.name.toLowerCase()) {
                case 'version':
                    product.version = attr_4.value;
                    break;
                case 'lang':
                    product.lang = attr_4.value;
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
    function Dimension() {
        this.name = '';
        this.size = '';
    }
    Dimension.Build = function (el) {
        var dim = new Dimension();
        return [dim, null];
    };
    Dimension.prototype.toXml = function (doc, parent) {
        return true;
    };
    return Dimension;
})();
exports.Dimension = Dimension;
var Options = (function () {
    function Options() {
        this.namespaces = [];
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
            var attr_5 = el.attributes.item(i);
            switch (attr_5.name.toLowerCase()) {
                case 'namespace':
                    options.namespaces = splitOnComma(attr_5.value);
                    break;
            }
        }
        for (var i = 0; i < el.childNodes.length; i++) {
            var child = el.childNodes.item(i);
            if (child.nodeType !== 1)
                continue;
            var name_2 = child.nodeName.toLowerCase();
            var plen = void 0;
            if (name_2.slice(0, 5) === 'uses_')
                plen = 4;
            else if (name_2.substring(0, 4) !== 'has_')
                plen = 3;
            if (!plen)
                continue;
            name_2 = camelCase(name_2);
            if (!options.hasOwnProperty(name_2))
                continue;
            options[name_2] = true;
            if (name_2 === 'usesArrays') {
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
    function Behavior() {
        this.allNonNegative = false;
        this.stockNonNegative = false;
        this.flowNonNegative = false;
    }
    Behavior.Build = function (el) {
        var behavior = new Behavior();
        return [behavior, null];
    };
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
    function Model() {
        this.name = '';
        this.run = false;
        this.variables = [];
        this.views = [];
    }
    Model.Build = function (el) {
        var model = new Model();
        var err;
        for (var i = 0; i < el.attributes.length; i++) {
            var attr_6 = el.attributes.item(i);
            switch (attr_6.name.toLowerCase()) {
                case 'name':
                    model.name = attr_6.value;
                    break;
            }
        }
        for (var i = 0; i < el.childNodes.length; i++) {
            var child = el.childNodes.item(i);
            if (child.nodeType !== 1)
                continue;
            switch (child.nodeName.toLowerCase()) {
                case 'variables':
                    for (var j = 0; j < child.childNodes.length; j++) {
                        var vchild = child.childNodes.item(j);
                        if (vchild.nodeType !== 1)
                            continue;
                        var v = void 0;
                        _a = Variable.Build(vchild), v = _a[0], err = _a[1];
                        if (err)
                            return [null, new Error(child.nodeName + ' var: ' + err.error)];
                        model.variables.push(v);
                    }
                    break;
                case 'views':
                    for (var j = 0; j < child.childNodes.length; j++) {
                        var vchild = child.childNodes.item(j);
                        if (vchild.nodeType !== 1)
                            continue;
                        var view = void 0;
                        _b = View.Build(vchild), view = _b[0], err = _b[1];
                        if (err)
                            return [null, new Error('view: ' + err.error)];
                        model.views.push(view);
                    }
                    break;
            }
        }
        return [model, null];
        var _a, _b;
    };
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
var ArrayElement = (function () {
    function ArrayElement() {
        this.subscript = [];
    }
    ArrayElement.Build = function (el) {
        var arrayEl = new ArrayElement();
        console.log('TODO: array element');
        return [arrayEl, null];
    };
    ArrayElement.prototype.toXml = function (doc, parent) {
        return true;
    };
    return ArrayElement;
})();
exports.ArrayElement = ArrayElement;
var Range = (function () {
    function Range() {
    }
    Range.Build = function (el) {
        var range = new Range();
        console.log('TODO: range element');
        return [range, null];
    };
    Range.prototype.toXml = function (doc, parent) {
        return true;
    };
    return Range;
})();
exports.Range = Range;
var Format = (function () {
    function Format() {
        this.precision = '';
        this.scaleBy = '1';
        this.displayAs = 'number';
        this.delimit000s = false;
    }
    Format.Build = function (el) {
        var fmt = new Format();
        console.log('TODO: format element');
        return [fmt, null];
    };
    Format.prototype.toXml = function (doc, parent) {
        return true;
    };
    return Format;
})();
exports.Format = Format;
var Variable = (function () {
    function Variable() {
        this.type = '';
        this.name = '';
        this.eqn = '';
        this.connections = [];
        this.inflows = [];
        this.outflows = [];
    }
    Variable.Build = function (el) {
        var v = new Variable();
        var err;
        v.type = el.nodeName.toLowerCase();
        for (var i = 0; i < el.attributes.length; i++) {
            var attr_7 = el.attributes.item(i);
            switch (attr_7.name.toLowerCase()) {
                case 'name':
                    v.name = attr_7.value;
                    break;
                case 'resource':
                    v.resource = attr_7.value;
                    break;
            }
        }
        for (var i = 0; i < el.childNodes.length; i++) {
            var child = el.childNodes.item(i);
            if (child.nodeType !== 1)
                continue;
            switch (child.nodeName.toLowerCase()) {
                case 'eqn':
                    v.eqn = content(child);
                    break;
                case 'inflow':
                    v.inflows.push(canonicalize(content(child)));
                    break;
                case 'outflow':
                    v.outflows.push(canonicalize(content(child)));
                    break;
                case 'gf':
                    _a = GF.Build(child), v.gf = _a[0], err = _a[1];
                    if (err)
                        return [null, new Error(v.name + ' GF: ' + err.error)];
                    break;
                case 'connect':
                    var conn = void 0;
                    _b = Connection.Build(child), conn = _b[0], err = _b[1];
                    if (err)
                        return [null, new Error(v.name + ' conn: ' + err.error)];
                    v.connections.push(conn);
                    break;
            }
        }
        return [v, err];
        var _a, _b;
    };
    Object.defineProperty(Variable.prototype, "ident", {
        get: function () {
            return canonicalize(this.name);
        },
        enumerable: true,
        configurable: true
    });
    Variable.prototype.toXml = function (doc, parent) {
        return true;
    };
    return Variable;
})();
exports.Variable = Variable;
var Shape = (function () {
    function Shape() {
    }
    Shape.Build = function (el) {
        var shape = new Shape();
        var err;
        for (var i = 0; i < el.attributes.length; i++) {
            var attr_8 = el.attributes.item(i);
            switch (attr_8.name.toLowerCase()) {
                case 'type':
                    shape.type = attr_8.value.toLowerCase();
                    if (!(shape.type in Shape.Types))
                        return [null, new Error('bad type: ' + shape.type)];
                    break;
            }
        }
        return [shape, err];
    };
    Shape.prototype.toXml = function (doc, parent) {
        return true;
    };
    Shape.Types = ['continuous', 'extrapolate', 'discrete'];
    return Shape;
})();
exports.Shape = Shape;
var ViewElement = (function () {
    function ViewElement() {
    }
    ViewElement.Build = function (el) {
        var viewEl = new ViewElement();
        var err;
        viewEl.type = el.nodeName.toLowerCase();
        for (var i = 0; i < el.attributes.length; i++) {
            var attr_9 = el.attributes.item(i);
            switch (attr_9.name.toLowerCase()) {
                case 'name':
                    viewEl.name = attr_9.value;
                    break;
                case 'x':
                    _a = num(attr_9.value), viewEl.x = _a[0], err = _a[1];
                    if (err)
                        return [null, new Error('x: ' + err.error)];
                    break;
                case 'y':
                    _b = num(attr_9.value), viewEl.y = _b[0], err = _b[1];
                    if (err)
                        return [null, new Error('y: ' + err.error)];
                    break;
                case 'width':
                    _c = num(attr_9.value), viewEl.width = _c[0], err = _c[1];
                    if (err)
                        return [null, new Error('width: ' + err.error)];
                    break;
                case 'height':
                    _d = num(attr_9.value), viewEl.height = _d[0], err = _d[1];
                    if (err)
                        return [null, new Error('height: ' + err.error)];
                    break;
                case 'label_side':
                    viewEl.labelSide = attr_9.value.toLowerCase();
                    break;
                case 'label_angle':
                    _e = num(attr_9.value), viewEl.labelAngle = _e[0], err = _e[1];
                    if (err)
                        return [null, new Error('label_angle: ' + err.error)];
                    break;
                case 'color':
                    viewEl.color = attr_9.value.toLowerCase();
                    break;
                case 'angle':
                    _f = num(attr_9.value), viewEl.angle = _f[0], err = _f[1];
                    if (err)
                        return [null, new Error('angle: ' + err.error)];
                    break;
            }
        }
        for (var i = 0; i < el.childNodes.length; i++) {
            var child = el.childNodes.item(i);
            if (child.nodeType !== 1)
                continue;
            switch (child.nodeName.toLowerCase()) {
                case 'to':
                    viewEl.to = canonicalize(content(child));
                    break;
                case 'from':
                    viewEl.from = canonicalize(content(child));
                    break;
                case 'of':
                    viewEl.of = canonicalize(content(child));
                    break;
                case 'pts':
                    for (var j = 0; j < child.childNodes.length; j++) {
                        var vchild = child.childNodes.item(j);
                        if (vchild.nodeType !== 1)
                            continue;
                        if (vchild.nodeName.toLowerCase() !== 'pt')
                            continue;
                        var pt = void 0;
                        _g = Point.Build(vchild), pt = _g[0], err = _g[1];
                        if (err)
                            return [null, new Error('pt: ' + err.error)];
                        if (typeof viewEl.pts === 'undefined')
                            viewEl.pts = [];
                        viewEl.pts.push(pt);
                    }
                    break;
            }
        }
        return [viewEl, err];
        var _a, _b, _c, _d, _e, _f, _g;
    };
    Object.defineProperty(ViewElement.prototype, "ident", {
        get: function () {
            return canonicalize(this.name);
        },
        enumerable: true,
        configurable: true
    });
    ViewElement.prototype.toXml = function (doc, parent) {
        return true;
    };
    return ViewElement;
})();
exports.ViewElement = ViewElement;
var View = (function () {
    function View() {
        this.type = 'stock_flow';
        this.zoom = 100;
        this.scrollX = 0;
        this.scrollY = 0;
        this.homePage = 0;
        this.homeView = false;
        this.elements = [];
    }
    View.Build = function (el) {
        var view = new View();
        var err;
        for (var i = 0; i < el.attributes.length; i++) {
            var attr_10 = el.attributes.item(i);
            switch (attr_10.name.toLowerCase()) {
                case 'type':
                    view.type = attr_10.value.toLowerCase();
                    break;
                case 'order':
                    _a = num(attr_10.value), view.order = _a[0], err = _a[1];
                    if (err)
                        return [null, new Error('order: ' + err.error)];
                    break;
                case 'width':
                    _b = num(attr_10.value), view.width = _b[0], err = _b[1];
                    if (err)
                        return [null, new Error('width: ' + err.error)];
                    break;
                case 'height':
                    _c = num(attr_10.value), view.height = _c[0], err = _c[1];
                    if (err)
                        return [null, new Error('height: ' + err.error)];
                    break;
                case 'zoom':
                    _d = num(attr_10.value), view.zoom = _d[0], err = _d[1];
                    if (err)
                        return [null, new Error('zoom: ' + err.error)];
                    break;
                case 'scroll_x':
                    _e = num(attr_10.value), view.scrollX = _e[0], err = _e[1];
                    if (err)
                        return [null, new Error('scroll_x: ' + err.error)];
                    break;
                case 'scroll_y':
                    _f = num(attr_10.value), view.scrollY = _f[0], err = _f[1];
                    if (err)
                        return [null, new Error('scroll_y: ' + err.error)];
                    break;
                case 'background':
                    view.background = attr_10.value.toLowerCase();
                    break;
                case 'page_width':
                    _g = num(attr_10.value), view.pageWidth = _g[0], err = _g[1];
                    if (err)
                        return [null, new Error('page_width: ' + err.error)];
                    break;
                case 'page_height':
                    _h = num(attr_10.value), view.pageHeight = _h[0], err = _h[1];
                    if (err)
                        return [null, new Error('page_height: ' + err.error)];
                    break;
                case 'page_sequence':
                    view.pageSequence = attr_10.value.toLowerCase();
                    break;
                case 'page_orientation':
                    view.pageOrientation = attr_10.value.toLowerCase();
                    break;
                case 'show_pages':
                    _j = bool(attr_10.value), view.showPages = _j[0], err = _j[1];
                    if (err)
                        return [null, new Error('show_pages: ' + err.error)];
                    break;
                case 'home_page':
                    _k = num(attr_10.value), view.homePage = _k[0], err = _k[1];
                    if (err)
                        return [null, new Error('home_page: ' + err.error)];
                    break;
                case 'home_view':
                    _l = bool(attr_10.value), view.homeView = _l[0], err = _l[1];
                    if (err)
                        return [null, new Error('home_view: ' + err.error)];
                    break;
            }
        }
        for (var i = 0; i < el.childNodes.length; i++) {
            var child = el.childNodes.item(i);
            if (child.nodeType !== 1)
                continue;
            var viewEl = void 0;
            _m = ViewElement.Build(child), viewEl = _m[0], err = _m[1];
            if (err)
                return [null, new Error('viewEl: ' + err.error)];
            view.elements.push(viewEl);
        }
        return [view, err];
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
    };
    View.prototype.toXml = function (doc, parent) {
        return true;
    };
    return View;
})();
exports.View = View;
var GF = (function () {
    function GF() {
        this.type = 'continuous';
    }
    GF.Build = function (el) {
        var table = new GF();
        var err;
        for (var i = 0; i < el.attributes.length; i++) {
            var attr_11 = el.attributes.item(i);
            switch (attr_11.name.toLowerCase()) {
                case 'type':
                    table.type = attr_11.value.toLowerCase();
                    if (!(table.type in GF.Types))
                        return [null, new Error('bad type: ' + table.type)];
                    break;
            }
        }
        for (var i = 0; i < el.childNodes.length; i++) {
            var child = el.childNodes.item(i);
            if (child.nodeType !== 1)
                continue;
            switch (child.nodeName.toLowerCase()) {
                case 'xscale':
                    _a = Scale.Build(child), table.xScale = _a[0], err = _a[1];
                    if (err)
                        return [null, new Error('xscale: ' + err.error)];
                    break;
                case 'yscale':
                    _b = Scale.Build(child), table.yScale = _b[0], err = _b[1];
                    if (err)
                        return [null, new Error('yscale: ' + err.error)];
                    break;
                case 'xpts':
                    table.xPoints = numberize(splitOnComma(content(child)));
                    break;
                case 'ypts':
                    table.yPoints = numberize(splitOnComma(content(child)));
                    break;
            }
        }
        if (!table.yPoints)
            return [null, new Error('table missing ypts')];
        if (table.type !== 'continuous')
            console.log('WARN: unimplemented table type: ' + table.type);
        return [table, err];
        var _a, _b;
    };
    GF.prototype.toXml = function (doc, parent) {
        return true;
    };
    GF.Types = ['continuous', 'extrapolate', 'discrete'];
    return GF;
})();
exports.GF = GF;
var Scale = (function () {
    function Scale() {
    }
    Scale.Build = function (el) {
        var scale = new Scale();
        var err;
        for (var i = 0; i < el.attributes.length; i++) {
            var attr_12 = el.attributes.item(i);
            switch (attr_12.name.toLowerCase()) {
                case 'min':
                    _a = num(attr_12.value), scale.min = _a[0], err = _a[1];
                    if (err)
                        return [null, new Error('bad min: ' + attr_12.value)];
                    break;
                case 'max':
                    _b = num(attr_12.value), scale.max = _b[0], err = _b[1];
                    if (err)
                        return [null, new Error('bad max: ' + attr_12.value)];
                    break;
            }
        }
        if (!scale.hasOwnProperty('min') || !scale.hasOwnProperty('max')) {
            return [null, new Error('scale requires both min and max')];
        }
        return [scale, null];
        var _a, _b;
    };
    Scale.prototype.toXml = function (doc, parent) {
        return true;
    };
    return Scale;
})();
exports.Scale = Scale;
var Connection = (function () {
    function Connection() {
    }
    Connection.Build = function (el) {
        var conn = new Connection();
        var err;
        for (var i = 0; i < el.attributes.length; i++) {
            var attr_13 = el.attributes.item(i);
            switch (attr_13.name.toLowerCase()) {
                case 'to':
                    conn.to = canonicalize(attr_13.value);
                    break;
                case 'from':
                    conn.from = canonicalize(attr_13.value);
                    break;
            }
        }
        if (!conn.hasOwnProperty('to') || !conn.hasOwnProperty('from')) {
            return [null, new Error('connect requires both to and from')];
        }
        return [conn, null];
    };
    Connection.prototype.toXml = function (doc, parent) {
        return true;
    };
    return Connection;
})();
exports.Connection = Connection;
function canonicalize(id) {
    'use strict';
    var quoted = false;
    if (id.length > 1) {
        var f = id.slice(0, 1);
        var l = id.slice(id.length - 1);
        quoted = f === '"' && l === '"';
    }
    id = id.toLowerCase();
    id = id.replace(/\\n/g, '_');
    id = id.replace(/\\\\/g, '\\');
    id = id.replace(/\\"/g, '\\');
    id = id.replace(/[_\r\n\t \xa0]+/g, '_');
    if (quoted)
        return id.slice(1, -1);
    return id;
}
exports.canonicalize = canonicalize;
