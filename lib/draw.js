// Copyright 2015 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.
/// <reference path="../typings/tsd.d.ts" />
'use strict';
var runtime = require('./runtime');
var util_1 = require("./util");
var AUX_RADIUS = 9;
var LABEL_PAD = 6;
var STROKE = 1;
var CLOUD_PATH = 'M 25.731189,3.8741489 C 21.525742,3.8741489 18.07553,7.4486396 17.497605,' +
    '12.06118 C 16.385384,10.910965 14.996889,10.217536 13.45908,10.217535 C 9.8781481,' +
    '10.217535 6.9473481,13.959873 6.9473482,18.560807 C 6.9473482,19.228828 7.0507906,' +
    '19.875499 7.166493,20.498196 C 3.850265,21.890233 1.5000346,25.3185 1.5000346,29.310191' +
    ' C 1.5000346,34.243794 5.1009986,38.27659 9.6710049,38.715902 C 9.6186538,39.029349 ' +
    '9.6083922,39.33212 9.6083922,39.653348 C 9.6083922,45.134228 17.378069,49.59028 ' +
    '26.983444,49.590279 C 36.58882,49.590279 44.389805,45.134229 44.389803,39.653348 C ' +
    '44.389803,39.35324 44.341646,39.071755 44.295883,38.778399 C 44.369863,38.780301 ' +
    '44.440617,38.778399 44.515029,38.778399 C 49.470875,38.778399 53.499966,34.536825 ' +
    '53.499965,29.310191 C 53.499965,24.377592 49.928977,20.313927 45.360301,19.873232 C ' +
    '45.432415,19.39158 45.485527,18.91118 45.485527,18.404567 C 45.485527,13.821862 ' +
    '42.394553,10.092543 38.598118,10.092543 C 36.825927,10.092543 35.215888,10.918252 ' +
    '33.996078,12.248669 C 33.491655,7.5434856 29.994502,3.8741489 25.731189,3.8741489 z';
var CLOUD_WIDTH = 55;
var ARROWHEAD_RADIUS = 4;
var CLOUD_RADIUS = 8;
var INVERSE_FUZZ = 6;
var MODULE_R = 5;
var TEXT_ATTR = {
    'font-size': '10px',
    'font-family': 'Open Sans',
    'font-weight': '300',
    'text-anchor': 'middle',
    'white-space': 'nowrap',
    'vertical-align': 'middle',
};
var COLOR_CONN = 'gray';
var COLOR_AUX = 'black';
var Z_ORDER = {
    'flow': 1,
    'module': 2,
    'stock': 3,
    'aux': 4,
    'connector': 5,
};
var MIN_SCALE = .2;
var Z_MAX = 6;
var IS_CHROME = typeof navigator !== 'undefined' && navigator.userAgent.match(/Chrome/);
function addCSSClass(o, newClass) {
    'use strict';
    var existingClass = o.getAttribute('class');
    if (existingClass) {
        o.setAttribute('class', existingClass + ' ' + newClass);
    }
    else {
        o.setAttribute('class', newClass);
    }
}
;
function hasKey(o, k) {
    'use strict';
    return o.hasOwnProperty(k);
}
;
function isZero(n) {
    'use strict';
    return Math.abs(n) < 0.0000001;
}
;
function square(n) {
    'use strict';
    return Math.pow(n, 2);
}
;
function pt(x, y) {
    'use strict';
    return { 'x': x, 'y': y };
}
;
var SIDE_MAP = {
    0: 'right',
    1: 'bottom',
    2: 'left',
    3: 'top',
};
function findSide(element, defaultSide) {
    'use strict';
    if (defaultSide === void 0) { defaultSide = 'bottom'; }
    if ('@label_side' in element) {
        var side = element['@label_side'].toLowerCase();
        if (side === 'center')
            return defaultSide;
        return side;
    }
    if ('@label_angle' in element) {
        var θ = (element['@label_angle'] + 45) % 360;
        var i = (θ / 90) | 0;
        return SIDE_MAP[i];
    }
    return defaultSide;
}
;
function cloudAt(paper, x, y) {
    'use strict';
    var scale = (AUX_RADIUS * 2 / CLOUD_WIDTH);
    var t = 'matrix(' + scale + ', 0, 0, ' + scale + ', ' +
        (x - AUX_RADIUS) + ', ' + (y - AUX_RADIUS) + ')';
    return paper.path(CLOUD_PATH).attr({
        'fill': '#ffffff',
        'stroke': '#6388dc',
        'stroke-width': 2,
        'stroke-linejoin': 'round',
        'stroke-miterlimit': 4,
    }).transform(t);
}
;
function circleFromPoints(p1, p2, p3) {
    'use strict';
    var off = square(p2.x) + square(p2.y);
    var bc = (square(p1.x) + square(p1.y) - off) / 2;
    var cd = (off - square(p3.x) - square(p3.y)) / 2;
    var det = (p1.x - p2.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p2.y);
    if (isZero(det)) {
        console.log('blerg');
        return;
    }
    var idet = 1 / det;
    var cx = (bc * (p2.y - p3.y) - cd * (p1.y - p2.y)) * idet;
    var cy = (cd * (p1.x - p2.x) - bc * (p2.x - p3.x)) * idet;
    return {
        'x': cx,
        'y': cy,
        'r': Math.sqrt(Math.pow(p2.x - cx, 2) + Math.pow(p2.y - cy, 2)),
    };
}
;
function label(paper, cx, cy, side, text, rw, rh) {
    'use strict';
    if (rw === void 0) { rw = AUX_RADIUS; }
    if (rh === void 0) { rh = AUX_RADIUS; }
    var x, y;
    switch (side) {
        case 'top':
            x = cx;
            y = cy - rh - LABEL_PAD;
            break;
        case 'bottom':
            x = cx;
            y = cy + rh + LABEL_PAD;
            break;
        case 'left':
            x = cx - rw - LABEL_PAD;
            y = cy;
            break;
        case 'right':
            x = cx + rw + LABEL_PAD;
            y = cy;
            break;
        default:
            console.log('unknown case ' + side);
    }
    var lbl = paper.text(x, y, text.split('\n')).attr(TEXT_ATTR);
    var linesAttr = lbl.attr('text');
    var lines;
    if (typeof linesAttr === 'string') {
        lines = [linesAttr];
    }
    else {
        lines = linesAttr;
    }
    var spans = lbl.node.getElementsByTagName('tspan');
    var maxH = Number.MIN_VALUE, maxW = Number.MIN_VALUE;
    if (IS_CHROME) {
        for (var i = 0; i < spans.length; i++) {
            var span = spans[i];
            var bb = span.getBBox();
            if (bb.height > maxH)
                maxH = bb.height;
            if (bb.width > maxW)
                maxW = bb.width;
        }
    }
    else {
        for (var i = 0; i < lines.length; i++) {
            var t = paper.text(0, 0, lines[i]).attr(TEXT_ATTR);
            var bb = t.getBBox();
            if (bb.height > maxH)
                maxH = bb.height;
            if (bb.width > maxW)
                maxW = bb.width;
            t.remove();
        }
    }
    for (var i = 0; i < spans.length; i++) {
        if (side === 'left' || side === 'right') {
        }
        if (i > 0) {
            spans[i].setAttribute('x', String(x));
            spans[i].setAttribute('dy', String(0.9 * maxH));
        }
    }
    var off;
    switch (side) {
        case 'bottom':
            lbl.attr({ y: y + LABEL_PAD });
            break;
        case 'top':
            lbl.attr({ y: y - (spans.length - 1) * (maxH / 2) - LABEL_PAD * +(spans.length > 1) });
            break;
        case 'left':
            if (spans.length > 1) {
                off = (spans.length - 2) * (maxH / 2);
            }
            else {
                off = -maxH / 4;
            }
            addCSSClass(lbl.node, 'right-aligned');
            lbl.node.setAttribute('style', lbl.node.getAttribute('style').replace('middle', 'right'));
            lbl.attr({
                y: y - off,
                x: x,
            });
            break;
        case 'right':
            addCSSClass(lbl.node, 'left-aligned');
            lbl.node.setAttribute('style', lbl.node.getAttribute('style').replace('middle', 'left'));
            lbl.attr({
                y: y - (spans.length - 2) * (maxH / 2),
            });
            break;
        default:
            console.log('unknown case ' + side);
    }
    return lbl;
}
;
function last(arr) {
    'use strict';
    return arr[arr.length - 1];
}
;
function arrowhead(paper, x, y, r) {
    'use strict';
    var head = 'M' + x + ',' + y + 'L' + (x - r) + ',' + (y + r / 2) +
        'A' + r * 3 + ',' + r * 3 + ' 0 0,1 ' + (x - r) + ',' + (y - r / 2) + 'z';
    return paper.path(head);
}
;
function sparkline(paper, cx, cy, w, h, time, values, graph) {
    'use strict';
    var x = cx - w / 2;
    var y = cy - h / 2;
    var xMin = time[0];
    var xMax = last(time);
    var xSpan = xMax - xMin;
    var yMin = Math.min(0, Math.min.apply(null, values));
    var yMax = Math.max.apply(null, values);
    var ySpan = (yMax - yMin) || 1;
    var p = '';
    for (var i = 0; i < values.length; i++) {
        if (util_1.isNaN(values[i])) {
            console.log('NaN at ' + time[i]);
        }
        p += (i === 0 ? 'M' : 'L') + (x + w * (time[i] - xMin) / xSpan) + ',' + (y + h - h * (values[i] - yMin) / ySpan);
    }
    var pAxis = 'M' + (x) + ',' + (y + h - h * (0 - yMin) / ySpan) + 'L' + (x + w) + ',' + (y + h - h * (0 - yMin) / ySpan);
    if (!graph) {
        return paper.group(paper.path(pAxis).attr({
            'class': 'spark-axis',
            'stroke-width': 0.125,
            'stroke-linecap': 'round',
            'stroke': '#999',
            'fill': 'none',
        }), paper.path(p).attr({
            'class': 'spark-line',
            'stroke-width': 0.5,
            'stroke-linecap': 'round',
            'stroke': '#2299dd',
            'fill': 'none',
        }));
    }
    else {
        var line = graph.node.querySelector('.spark-line');
        line.setAttribute('d', p);
        return graph;
    }
}
;
var DStock = (function () {
    function DStock(drawing, element) {
        this.drawing = drawing;
        this.e = element;
        this.name = util_1.eName(element['@name']);
        this.dName = util_1.dName(element['@name']);
        this.cx = element['@x'];
        this.cy = element['@y'];
        if (element['@width']) {
            this.cx += .5 * element['@width'];
            this.w = element['@width'];
        }
        else {
            this.w = 45;
        }
        if (element['@height']) {
            this.cy += .5 * element['@height'];
            this.h = element['@height'];
        }
        else {
            this.h = 35;
        }
        this.color = this.drawing.colorOverride ? COLOR_AUX : element['@color'] || COLOR_AUX;
        this.labelSide = findSide(element, 'top');
    }
    DStock.prototype.init = function () {
        // we are a stock, and need to inform all the flows into and
        // out of us that they, in fact, flow in and out of us.
        var mEnt = this.drawing.model.vars[this.name];
        for (var i = 0; i < mEnt.inflows.length; i++) {
            var n = mEnt.inflows[i];
            var dEnt = this.drawing.named_ents[n];
            if (!dEnt) {
                console.log('failed connecting ' + this.name + ' .to ' + n);
                continue;
            }
            dEnt.to = this.name;
        }
        for (var i = 0; i < mEnt.outflows.length; i++) {
            var n = mEnt.outflows[i];
            var dEnt = this.drawing.named_ents[n];
            if (!dEnt) {
                console.log('failed connecting ' + this.name + ' .from ' + n);
                continue;
            }
            this.drawing.named_ents[n].from = this.name;
        }
    };
    DStock.prototype.draw = function () {
        var paper = this.drawing.paper;
        var w = this.w;
        var h = this.h;
        this.set = this.drawing.group(paper.rect(Math.ceil(this.cx - w / 2), Math.ceil(this.cy - h / 2), w, h).attr({
            'fill': 'white',
            'stroke-width': STROKE,
            'stroke': this.color,
        }));
    };
    DStock.prototype.drawLabel = function () {
        var paper = this.drawing.paper;
        var w = this.w;
        var h = this.h;
        this.set.add(label(paper, this.cx, this.cy, this.labelSide, this.dName, w / 2, h / 2));
    };
    DStock.prototype.visualize = function (time, values) {
        var hadGraph = !!this.graph;
        this.graph = sparkline(this.drawing.paper, this.cx, this.cy, this.w - 4, this.h - 4, time, values, this.graph);
        if (!hadGraph)
            this.set.add(this.graph);
    };
    return DStock;
})();
var DModule = (function () {
    function DModule(drawing, element) {
        this.drawing = drawing;
        this.e = element;
        this.name = util_1.eName(element['@name']);
        this.dName = util_1.dName(element['@name']);
        this.cx = element['@x'];
        this.cy = element['@y'];
        this.w = 55;
        this.h = 45;
        this.color = this.drawing.colorOverride ? COLOR_AUX : element['@color'] || COLOR_AUX;
        this.labelSide = findSide(element);
    }
    DModule.prototype.init = function () { };
    DModule.prototype.draw = function () {
        var paper = this.drawing.paper;
        var w = this.w;
        var h = this.h;
        this.set = this.drawing.group(paper.rect(Math.ceil(this.cx - w / 2), Math.ceil(this.cy - h / 2), w, h, MODULE_R, MODULE_R).attr({
            'fill': 'white',
            'stroke-width': STROKE,
            'stroke': this.color,
        }));
    };
    DModule.prototype.drawLabel = function () {
        var paper = this.drawing.paper;
        var w = this.w;
        var h = this.h;
        this.set.add(label(paper, this.cx, this.cy, this.labelSide, this.dName, w / 2, h / 2));
    };
    DModule.prototype.visualize = function (time, values) {
        var hadGraph = !!this.graph;
        this.graph = sparkline(this.drawing.paper, this.cx, this.cy, this.w - 6, this.h - 6, time, values, this.graph);
        if (!hadGraph)
            this.set.add(this.graph);
    };
    return DModule;
})();
var DAux = (function () {
    function DAux(drawing, element) {
        this.drawing = drawing;
        this.e = element;
        this.name = util_1.eName(element['@name']);
        this.dName = util_1.dName(element['@name']);
        this.cx = element['@x'];
        this.cy = element['@y'];
        if (element['@width']) {
            this.cx += .5 * element['@width'];
            this.r = element['@width'] / 2;
        }
        else {
            this.r = AUX_RADIUS;
        }
        if (element['@height']) {
            this.cy += .5 * element['@height'];
            this.r = element['@height'] / 2;
        }
        else {
            this.r = AUX_RADIUS;
        }
        this.color = this.drawing.colorOverride ? COLOR_AUX : element['@color'] || COLOR_AUX;
        this.labelSide = findSide(element);
    }
    DAux.prototype.init = function () { };
    DAux.prototype.draw = function () {
        var paper = this.drawing.paper;
        this.set = this.drawing.group(paper.circle(this.cx, this.cy, this.r).attr({
            'fill': 'white',
            'stroke-width': STROKE,
            'stroke': this.color,
        }));
    };
    DAux.prototype.drawLabel = function () {
        var paper = this.drawing.paper;
        this.set.add(label(paper, this.cx, this.cy, this.labelSide, this.dName));
    };
    DAux.prototype.visualize = function (time, values) {
        var hadGraph = !!this.graph;
        this.graph = sparkline(this.drawing.paper, this.cx, this.cy, AUX_RADIUS, AUX_RADIUS, time, values, this.graph);
        if (!hadGraph)
            this.set.add(this.graph);
    };
    return DAux;
})();
var DFlow = (function () {
    function DFlow(drawing, element) {
        this.drawing = drawing;
        this.e = element;
        this.name = util_1.eName(element['@name']);
        this.dName = util_1.dName(element['@name']);
        this.cx = element['@x'];
        this.cy = element['@y'];
        this.to = null;
        this.from = null;
        this.color = this.drawing.colorOverride ? COLOR_AUX : element['@color'] || COLOR_AUX;
        this.labelSide = findSide(element);
    }
    DFlow.prototype.init = function () { };
    DFlow.prototype.draw = function () {
        var paper = this.drawing.paper;
        var cx = this.cx;
        var cy = this.cy;
        var pts = this.e.pts.pt;
        if (pts.length < 2) {
            console.log('ERROR: too few points for flow: ' + JSON.stringify(this));
            return;
        }
        var spath = '';
        for (var j = 0; j < pts.length; j++)
            spath += (j === 0 ? 'M' : 'L') + pts[j]['@x'] + ',' + pts[j]['@y'];
        var from_cloud;
        var cloud;
        this.set = this.drawing.group();
        if (!this.from) {
            cloud = cloudAt(paper, pts[0]['@x'], pts[0]['@y']);
            from_cloud = cloud;
        }
        if (!this.to) {
            var x, y, prevX, prevY;
            x = pts[pts.length - 1]['@x'];
            y = pts[pts.length - 1]['@y'];
            prevX = pts[pts.length - 2]['@x'];
            prevY = pts[pts.length - 2]['@y'];
            cloud = cloudAt(paper, x, y);
            this.set.add(cloud);
            if (prevX < x)
                pts[pts.length - 1]['@x'] = x - CLOUD_RADIUS;
            if (prevX > x)
                pts[pts.length - 1]['@x'] = x + CLOUD_RADIUS;
            if (prevY < y)
                pts[pts.length - 1]['@y'] = y - CLOUD_RADIUS;
            if (prevY > y)
                pts[pts.length - 1]['@y'] = y + CLOUD_RADIUS;
        }
        spath = '';
        var arrowθ;
        for (var j = 0; j < pts.length; j++) {
            var x = pts[j]['@x'];
            var y = pts[j]['@y'];
            if (j === pts.length - 1) {
                var dx = x - pts[j - 1]['@x'];
                var dy = y - pts[j - 1]['@y'];
                var θ = Math.atan2(dy, dx) * 180 / Math.PI;
                if (θ < 0)
                    θ += 360;
                if (θ >= 315 || θ < 45) {
                    x -= 4;
                    arrowθ = 0;
                }
                else if (θ >= 45 && θ < 135) {
                    y -= 4;
                    arrowθ = 90;
                }
                else if (θ >= 135 && θ < 225) {
                    x += 4;
                    arrowθ = 180;
                }
                else {
                    y += 4;
                    arrowθ = 270;
                }
            }
            spath += (j === 0 ? 'M' : 'L') + x + ',' + y;
        }
        this.set.add(paper.path(spath).attr({
            'stroke-width': STROKE * 4,
            'stroke': this.color,
            'fill': 'none',
        }));
        var lastPt = last(pts);
        this.set.add(arrowhead(paper, lastPt['@x'], lastPt['@y'], ARROWHEAD_RADIUS * 2).attr({
            'transform': 'rotate(' + (arrowθ) + ',' + lastPt['@x'] + ',' + lastPt['@y'] + ')',
            'stroke': this.color,
            'stroke-width': 1,
            'fill': 'white',
            'stroke-linejoin': 'round',
        }));
        this.set.add(paper.path(spath).attr({
            'stroke': 'white',
            'stroke-width': STROKE * 2,
            'fill': 'none',
        }));
        this.set.add(paper.circle(cx, cy, AUX_RADIUS).attr({
            'fill': 'white',
            'stroke-width': STROKE,
            'stroke': this.color,
        }));
        if (from_cloud)
            this.set.append(from_cloud);
    };
    DFlow.prototype.drawLabel = function () {
        var paper = this.drawing.paper;
        this.set.add(label(paper, this.cx, this.cy, this.labelSide, this.dName));
    };
    DFlow.prototype.visualize = function (time, values) {
        var hadGraph = !!this.graph;
        this.graph = sparkline(this.drawing.paper, this.cx, this.cy, AUX_RADIUS, AUX_RADIUS, time, values, this.graph);
        if (!hadGraph)
            this.set.add(this.graph);
    };
    return DFlow;
})();
var DConnector = (function () {
    function DConnector(drawing, element) {
        this.drawing = drawing;
        this.e = element;
        this.name = undefined;
        this.color = this.drawing.colorOverride ? COLOR_CONN : element['@color'] || COLOR_CONN;
    }
    DConnector.prototype.init = function () { };
    DConnector.prototype.draw = function () {
        var paper = this.drawing.paper;
        var cx = this.e['@x'];
        var cy = this.e['@y'];
        var fromEnt = this.drawing.named_ents[util_1.eName(this.e.from)];
        if (!fromEnt)
            return;
        var fx = fromEnt.cx;
        var fy = fromEnt.cy;
        var toEnt = this.drawing.named_ents[util_1.eName(this.e.to)];
        if (!toEnt)
            return;
        var tx = toEnt.cx;
        var ty = toEnt.cy;
        var circ = circleFromPoints(pt(cx, cy), pt(fx, fy), pt(tx, ty));
        var spath = '';
        var inv = 0;
        spath += 'M' + cx + ',' + cy;
        var r, endθ;
        if (circ) {
            var dx = fx - circ.x;
            var dy = fy - circ.y;
            var startθ = Math.atan2(dy, dx) * 180 / Math.PI;
            dx = tx - circ.x;
            dy = ty - circ.y;
            endθ = Math.atan2(dy, dx) * 180 / Math.PI;
            var spanθ = endθ - startθ;
            while (spanθ < 0)
                spanθ += 360;
            spanθ %= 360;
            inv = +(spanθ <= 180 - INVERSE_FUZZ);
            if (toEnt instanceof DModule) {
                r = 25;
            }
            else {
                r = AUX_RADIUS;
            }
            var internalθ = Math.tan(r / circ.r) * 180 / Math.PI;
            tx = circ.x + circ.r * Math.cos((endθ + (inv ? -1 : 1) * internalθ) / 180 * Math.PI);
            ty = circ.y + circ.r * Math.sin((endθ + (inv ? -1 : 1) * internalθ) / 180 * Math.PI);
            spath += 'A' + circ.r + ',' + circ.r + ' 0 0,' + (inv ? '1' : '0') + ' ' + tx + ',' + ty;
        }
        else {
            var dx = tx - fx;
            var dy = ty - fy;
            endθ = Math.atan2(dy, dx) * 180 / Math.PI;
            spath += 'L' + tx + ',' + ty;
        }
        var θ = 0;
        if (circ) {
            var slope2 = -Math.atan2((tx - circ.x), (ty - circ.y));
            θ = slope2 * 180 / Math.PI;
            if (inv)
                θ += 180;
        }
        else {
            θ = endθ;
        }
        this.set = this.drawing.group(paper.path(spath).attr({
            'stroke-width': STROKE / 2,
            'stroke': this.color,
            'fill': 'none',
        }), paper.circle(cx, cy, 2).attr({ 'stroke-width': 0, fill: '#c83639' }), arrowhead(paper, tx, ty, ARROWHEAD_RADIUS).attr({
            'transform': 'rotate(' + (θ) + ',' + tx + ',' + ty + ')',
            'stroke': this.color,
            'stroke-width': 1,
            'fill': this.color,
            'stroke-linejoin': 'round',
        }));
    };
    DConnector.prototype.drawLabel = function () { };
    DConnector.prototype.visualize = function () { };
    return DConnector;
})();
var DTypes = {
    'stock': DStock,
    'flow': DFlow,
    'aux': DAux,
    'connector': DConnector,
    'module': DModule,
};
var Drawing = (function () {
    function Drawing(model, xmile, svgElement, overrideColors, enableMousewheel) {
        this.model = model;
        this.xmile = xmile;
        var element;
        var svg;
        if (typeof svgElement === 'string') {
            var selector = svgElement;
            if (selector.length > 0 && selector[0] === '#')
                selector = selector.substr(1);
            element = document.getElementById(selector);
        }
        else {
            element = svgElement;
        }
        svg = element;
        element.innerHTML = '';
        this.paper = Snap(svg);
        var defs = svg.getElementsByTagName('defs')[0];
        if (defs) {
            defs.outerHTML = runtime.drawCSS;
        }
        else {
            element.innerHTML += runtime.drawCSS;
        }
        this._g = this.paper.g();
        this._g.node.id = 'viewport';
        this.colorOverride = overrideColors;
        element.setAttribute('preserveAspectRatio', 'xMinYMin');
        {
            var tz = 'translateZ(0px)';
            var style = element.style;
            style['-webkit-transform'] = tz;
            style['-moz-transform'] = tz;
            style['-ms-transform'] = tz;
            style['-o-transform'] = tz;
            style.transform = tz;
        }
        var elems = [];
        for (var n in DTypes) {
            if (!DTypes.hasOwnProperty(n))
                continue;
            if (!(n in xmile))
                continue;
            if (!(xmile[n] instanceof Array))
                xmile[n] = [xmile[n]];
            for (var i = 0; i < xmile[n].length; i++) {
                xmile[n][i]['@tagName'] = n;
                elems.push(xmile[n][i]);
            }
        }
        this.d_ents = [];
        this.z_ents = new Array(Z_MAX);
        for (var i = 0; i < Z_MAX; i++)
            this.z_ents[i] = [];
        this.named_ents = {};
        for (var i = 0; i < elems.length; i++) {
            var e = elems[i];
            var tagName = e['@tagName'];
            if (!tagName)
                continue;
            if (!hasKey(DTypes, tagName)) {
                console.log('unknown draw ent type ' + e.tagName);
                continue;
            }
            var de = new DTypes[tagName](this, e);
            this.d_ents.push(de);
            this.z_ents[Z_ORDER[tagName]].push(de);
            if (de.name)
                this.named_ents[de.name] = de;
        }
        for (var i = 0; i < this.d_ents.length; i++)
            this.d_ents[i].init();
        for (var i = 0; i < Z_MAX; i++) {
            for (var j = 0; j < this.z_ents[i].length; j++)
                this.z_ents[i][j].draw();
        }
        for (var i = 0; i < Z_MAX; i++) {
            for (var j = 0; j < this.z_ents[i].length; j++)
                this.z_ents[i][j].drawLabel();
        }
        this._t = {
            scale: 1,
            dscale: 0,
            x: 0,
            y: 0,
            dx: 0,
            dy: 0,
        };
        var _this = this;
        if (!enableMousewheel)
            return;
        svg.onwheel = function (e) {
            var drawing = _this;
            var delta = -e.deltaY / 20;
            drawing.applyDScaleAt(delta, e);
            drawing.normalizeTransform();
            drawing.transform();
        };
    }
    Drawing.prototype.applyDScaleAt = function (dscale, e) {
        this._t.dscale = dscale;
        if (this._t.scale + this._t.dscale < MIN_SCALE)
            this._t.dscale = MIN_SCALE - this._t.scale;
        this._t.dx = -(e.pageX - this._t.x) * (this._t.dscale) / this._t.scale;
        this._t.dy = -(e.pageY - this._t.y) * (this._t.dscale) / this._t.scale;
    };
    Drawing.prototype.transform = function (scale, x, y) {
        if (arguments.length === 3) {
            this._t.scale = scale;
            this._t.x = x;
            this._t.y = y;
        }
        x = this._t.x + this._t.dx;
        y = this._t.y + this._t.dy;
        scale = this._t.scale + this._t.dscale;
        var matrix = 'translateZ(0px) matrix(' + scale + ',0,0,' + scale +
            ',' + x + ',' + y + ')';
        this._g.node.style['-webkit-transform'] = matrix;
        this._g.node.style['-moz-transform'] = matrix;
        this._g.node.style['-ms-transform'] = matrix;
        this._g.node.style.transform = matrix;
    };
    Drawing.prototype.normalizeTransform = function () {
        this._t.x += this._t.dx;
        this._t.y += this._t.dy;
        this._t.scale += this._t.dscale;
        if (this._t.scale < MIN_SCALE)
            this._t.scale = MIN_SCALE;
        this._t.dx = 0;
        this._t.dy = 0;
        this._t.dscale = 0;
    };
    Drawing.prototype.visualize = function (data) {
        if (data.project) {
            var sim = data;
            var d = this;
            sim.series.apply(sim, Object.keys(this.named_ents)).then(function (result) {
                for (var n in result) {
                    if (!result.hasOwnProperty(n))
                        continue;
                    data = result[n];
                    var dEnt = d.named_ents[n];
                    if (!dEnt) {
                        console.log('sim data for non-drawn ' + n);
                        continue;
                    }
                    dEnt.visualize(data.time, data.values);
                }
            }).done();
        }
        else {
            var result = data;
            for (var n in result) {
                if (!result.hasOwnProperty(n))
                    continue;
                data = result[n];
                var dEnt = this.named_ents[n];
                if (!dEnt) {
                    console.log('sim data for non-drawn ' + n);
                    continue;
                }
                dEnt.visualize(data.time, data.values);
            }
        }
    };
    Drawing.prototype.group = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        var g = this.paper.g.apply(this.paper, args);
        this._g.append(g);
        return g;
    };
    return Drawing;
})();
exports.Drawing = Drawing;
