// Copyright 2015 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.
/// <reference path="../typings/tsd.d.ts" />
'use strict';
var runtime = require('./runtime');
var util_1 = require("./util");
var PI = Math.PI;
var sin = Math.sin;
var cos = Math.cos;
var tan = Math.tan;
var atan2 = Math.atan2;
var sqrt = Math.sqrt;
var abs = Math.abs;
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
    'font-family': 'Roboto',
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
var STRAIGHT_LINE_MAX = 12;
var IS_CHROME = typeof navigator !== 'undefined' &&
    navigator.userAgent.match(/Chrome/) &&
    !navigator.userAgent.match(/Edge/);
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
function isZero(n, tolerance) {
    'use strict';
    if (tolerance === void 0) { tolerance = 0.0000001; }
    return Math.abs(n) < tolerance;
}
function isEqual(a, b, tolerance) {
    'use strict';
    if (tolerance === void 0) { tolerance = 0.0000001; }
    return isZero(a - b, tolerance);
}
function isInf(n) {
    'use strict';
    return !isFinite(n) || n > 2e14;
}
function square(n) {
    'use strict';
    return Math.pow(n, 2);
}
function pt(x, y) {
    'use strict';
    return { 'x': x, 'y': y };
}
var SIDE_MAP = {
    0: 'right',
    1: 'bottom',
    2: 'left',
    3: 'top',
};
function findSide(element, defaultSide) {
    'use strict';
    if (defaultSide === void 0) { defaultSide = 'bottom'; }
    if (element.labelSide) {
        var side = element.labelSide;
        if (side === 'center')
            return defaultSide;
        return side;
    }
    if (element.hasOwnProperty('labelAngle')) {
        var θ = (element.labelAngle + 45) % 360;
        var i = (θ / 90) | 0;
        return SIDE_MAP[i];
    }
    return defaultSide;
}
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
        'r': sqrt(square(p2.x - cx) + square(p2.y - cy)),
    };
}
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
function xmileToCanvasAngle(inDeg) {
    'use strict';
    var outDeg = (360 - inDeg) % 360;
    if (outDeg > 180)
        outDeg -= 360;
    return outDeg;
}
exports.xmileToCanvasAngle = xmileToCanvasAngle;
function degToRad(d) {
    'use strict';
    return d / 180 * PI;
}
function radToDeg(r) {
    'use strict';
    return r * 180 / PI;
}
function oppositeθ(θ) {
    'use strict';
    θ += PI;
    if (θ > PI)
        θ -= 2 * PI;
    return θ;
}
function last(arr) {
    'use strict';
    return arr[arr.length - 1];
}
function arrowhead(paper, x, y, r) {
    'use strict';
    var head = 'M' + x + ',' + y + 'L' + (x - r) + ',' + (y + r / 2) +
        'A' + r * 3 + ',' + r * 3 + ' 0 0,1 ' + (x - r) + ',' + (y - r / 2) + 'z';
    return paper.path(head);
}
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
var DStock = (function () {
    function DStock(drawing, element) {
        this.drawing = drawing;
        this.e = element;
        this.ident = element.ident;
        this.dName = util_1.dName(element.name);
        this.cx = element.x;
        this.cy = element.y;
        if (element.width) {
            if (!drawing.stocksXYCenter)
                this.cx += .5 * element.width;
            this.w = element.width;
        }
        else {
            this.w = 45;
        }
        if (element.height) {
            if (!drawing.stocksXYCenter)
                this.cy += .5 * element.height;
            this.h = element.height;
        }
        else {
            this.h = 35;
        }
        this.color = this.drawing.colorOverride ? COLOR_AUX : element.color || COLOR_AUX;
        this.labelSide = findSide(element, 'top');
    }
    DStock.prototype.init = function () {
        // we are a stock, and need to inform all the flows into and
        // out of us that they, in fact, flow in and out of us.
        var mEnt = this.drawing.model.vars[this.ident];
        for (var i = 0; i < mEnt.inflows.length; i++) {
            var n = mEnt.inflows[i];
            var dEnt = this.drawing.namedEnts[n];
            if (!dEnt) {
                console.log('failed connecting ' + this.ident + ' .to ' + n);
                continue;
            }
            dEnt.to = this.ident;
        }
        for (var i = 0; i < mEnt.outflows.length; i++) {
            var n = mEnt.outflows[i];
            var dEnt = this.drawing.namedEnts[n];
            if (!dEnt) {
                console.log('failed connecting ' + this.ident + ' .from ' + n);
                continue;
            }
            this.drawing.namedEnts[n].from = this.ident;
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
        this.ident = element.ident;
        this.dName = util_1.dName(element.name);
        this.cx = element.x;
        this.cy = element.y;
        this.w = 55;
        this.h = 45;
        this.color = this.drawing.colorOverride ? COLOR_AUX : element.color || COLOR_AUX;
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
        this.ident = element.ident;
        this.dName = util_1.dName(element.name);
        this.cx = element.x;
        this.cy = element.y;
        if (element.width) {
            this.r = element.width / 2;
        }
        else {
            this.r = AUX_RADIUS;
        }
        if (element.height) {
            this.r = element.height / 2;
        }
        else {
            this.r = AUX_RADIUS;
        }
        this.color = this.drawing.colorOverride ? COLOR_AUX : element.color || COLOR_AUX;
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
        this.ident = element.ident;
        this.dName = util_1.dName(element.name);
        this.cx = element.x;
        this.cy = element.y;
        this.to = null;
        this.from = null;
        this.color = this.drawing.colorOverride ? COLOR_AUX : element.color || COLOR_AUX;
        this.labelSide = findSide(element);
    }
    DFlow.prototype.init = function () { };
    DFlow.prototype.draw = function () {
        var paper = this.drawing.paper;
        var cx = this.cx;
        var cy = this.cy;
        var pts = this.e.pts;
        if (pts.length < 2) {
            console.log('ERROR: too few points for flow: ' + JSON.stringify(this));
            return;
        }
        var spath = '';
        for (var j = 0; j < pts.length; j++) {
            var pt_1 = pts[j];
            spath += (j === 0 ? 'M' : 'L') + pt_1.x + ',' + pt_1.y;
        }
        var from_cloud;
        var cloud;
        this.set = this.drawing.group();
        if (!this.from) {
            cloud = cloudAt(paper, pts[0].x, pts[0].y);
            from_cloud = cloud;
        }
        if (!this.to) {
            var x, y, prevX, prevY;
            x = pts[pts.length - 1].x;
            y = pts[pts.length - 1].y;
            prevX = pts[pts.length - 2].x;
            prevY = pts[pts.length - 2].y;
            cloud = cloudAt(paper, x, y);
            this.set.add(cloud);
            if (prevX < x)
                pts[pts.length - 1].x = x - CLOUD_RADIUS;
            if (prevX > x)
                pts[pts.length - 1].x = x + CLOUD_RADIUS;
            if (prevY < y)
                pts[pts.length - 1].y = y - CLOUD_RADIUS;
            if (prevY > y)
                pts[pts.length - 1].y = y + CLOUD_RADIUS;
        }
        spath = '';
        var arrowθ;
        for (var j = 0; j < pts.length; j++) {
            var x = pts[j].x;
            var y = pts[j].y;
            if (j === pts.length - 1) {
                var dx = x - pts[j - 1].x;
                var dy = y - pts[j - 1].y;
                var θ = atan2(dy, dx) * 180 / PI;
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
        this.set.add(arrowhead(paper, lastPt.x, lastPt.y, ARROWHEAD_RADIUS * 2).attr({
            'transform': 'rotate(' + (arrowθ) + ',' + lastPt.x + ',' + lastPt.y + ')',
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
        this.color = this.drawing.colorOverride ? COLOR_CONN : element.color || COLOR_CONN;
    }
    DConnector.prototype.init = function () { };
    DConnector.prototype.takeoffθ = function () {
        var from = this.drawing.namedEnts[this.e.from];
        if (!from) {
            console.log('connector with unknown origin: ' + this.e.from);
            return NaN;
        }
        if (this.e.hasOwnProperty('angle')) {
            return degToRad(xmileToCanvasAngle(this.e.angle));
        }
        else if (this.e.hasOwnProperty('x') && this.e.hasOwnProperty('y')) {
            return atan2(this.e.y - from.cy, this.e.x - from.cx);
        }
        console.log('connector from "' + this.e.from + '" doesn\'t have x, y, or angle');
        return NaN;
    };
    DConnector.prototype.isStraight = function () {
        var from = this.drawing.namedEnts[this.e.from];
        if (!from)
            return false;
        var to = this.drawing.namedEnts[this.e.to];
        if (!to)
            return false;
        var takeoffθ = this.takeoffθ();
        var midθ = atan2(to.cy - from.cy, to.cx - from.cx);
        return Math.abs(midθ - takeoffθ) < degToRad(STRAIGHT_LINE_MAX);
    };
    DConnector.prototype.draw = function () {
        if (this.isStraight()) {
            this.drawStraight();
        }
        else {
            this.drawArc();
        }
    };
    DConnector.prototype.drawLabel = function () { };
    DConnector.prototype.visualize = function () { };
    DConnector.prototype.arcCircle = function () {
        var from = this.drawing.namedEnts[this.e.from];
        var to = this.drawing.namedEnts[this.e.to];
        if (!from || !to)
            return;
        if (!this.e.hasOwnProperty('angle')) {
            return circleFromPoints({ x: from.cx, y: from.cy }, { x: to.cx, y: to.cy }, { x: this.e.x, y: this.e.y });
        }
        var slopeTakeoff = tan(this.takeoffθ());
        var slopePerpToTakeoff = -1 / slopeTakeoff;
        if (isZero(slopePerpToTakeoff))
            slopePerpToTakeoff = 0;
        var takeoffPerpθ = Math.atan(slopePerpToTakeoff);
        var bFrom = from.cy - slopePerpToTakeoff * from.cx;
        var cx;
        if (from.cy === to.cy) {
            cx = (from.cx + to.cx) / 2;
        }
        else {
            var slopeBisector = (from.cy - to.cy) / (from.cx - to.cx);
            var slopePerpToBisector = -1 / slopeBisector;
            var midx = (from.cx + to.cx) / 2;
            var midy = (from.cy + to.cy) / 2;
            var bPerp = midy - slopePerpToBisector * midx;
            cx = (bFrom - bPerp) / (slopePerpToBisector - slopePerpToTakeoff);
        }
        var cy = slopePerpToTakeoff * cx + bFrom;
        var cr = sqrt(square(from.cx - cx) + square(from.cy - cy));
        return { r: cr, x: cx, y: cy };
    };
    DConnector.prototype.intersectEntStraight = function (ent, θ) {
        var r = AUX_RADIUS;
        if (ent instanceof DModule)
            r = 25;
        else if (ent instanceof DStock)
            r = 20;
        return {
            x: ent.cx + r * cos(θ),
            y: ent.cy + r * sin(θ),
        };
    };
    DConnector.prototype.intersectEntArc = function (ent, circ, inv) {
        var r = AUX_RADIUS;
        if (ent instanceof DModule)
            r = 25;
        else if (ent instanceof DStock)
            r = 20;
        var offθ = tan(r / circ.r);
        var entCenterθ = atan2(ent.cy - circ.y, ent.cx - circ.x);
        return {
            x: circ.x + circ.r * cos(entCenterθ + (inv ? 1 : -1) * offθ),
            y: circ.y + circ.r * sin(entCenterθ + (inv ? 1 : -1) * offθ),
        };
    };
    DConnector.prototype.drawStraight = function () {
        var paper = this.drawing.paper;
        var from = this.drawing.namedEnts[this.e.from];
        var to = this.drawing.namedEnts[this.e.to];
        if (!from || !to)
            return;
        var θ = atan2(to.cy - from.cy, to.cx - from.cx);
        var start = this.intersectEntStraight(from, θ);
        var end = this.intersectEntStraight(to, oppositeθ(θ));
        var arrowheadAngle = radToDeg(θ);
        var path = 'M' + start.x + ',' + start.y + 'L' + end.x + ',' + end.y;
        this.set = this.drawing.group(paper.path(path).attr({
            'stroke-width': STROKE / 2,
            'stroke': this.color,
            'fill': 'none',
        }), paper.circle(start.x, start.y, 2).attr({ 'stroke-width': 0, fill: '#c83639' }), arrowhead(paper, end.x, end.y, ARROWHEAD_RADIUS).attr({
            'transform': 'rotate(' + arrowheadAngle + ',' + end.x + ',' + end.y + ')',
            'stroke': this.color,
            'stroke-width': 1,
            'fill': this.color,
            'stroke-linejoin': 'round',
        }));
    };
    DConnector.prototype.drawArc = function () {
        var paper = this.drawing.paper;
        var from = this.drawing.namedEnts[this.e.from];
        var to = this.drawing.namedEnts[this.e.to];
        if (!from || !to)
            return;
        var takeoffθ = this.takeoffθ();
        var circ = this.arcCircle();
        var fromθ = atan2(from.cy - circ.y, from.cx - circ.x);
        var toθ = atan2(to.cy - circ.y, to.cx - circ.x);
        var spanθ = toθ - fromθ;
        var inv = spanθ > 0 || spanθ <= degToRad(-180);
        var start = this.intersectEntArc(from, circ, inv);
        var end = this.intersectEntArc(to, circ, !inv);
        var startR = sqrt(square(start.x - from.cx) + square(start.y - from.cy));
        var expectedStartX = from.cx + startR * cos(takeoffθ);
        var expectedStartY = from.cy + startR * sin(takeoffθ);
        var sweep = !isEqual(expectedStartX, start.x, 5) || !isEqual(expectedStartY, start.y, 5);
        if (sweep) {
            inv = !inv;
            start = this.intersectEntArc(from, circ, inv);
            end = this.intersectEntArc(to, circ, !inv);
        }
        var spath = 'M' + start.x + ',' + start.y +
            'A' + circ.r + ',' + circ.r +
            ' 0 ' + (+sweep) + ',' + (+inv) +
            ' ' + end.x + ',' + end.y;
        var arrowheadAngle = radToDeg(atan2(end.y - circ.y, end.x - circ.x)) - 90;
        if (inv)
            arrowheadAngle += 180;
        this.set = this.drawing.group(paper.path(spath).attr({
            'stroke-width': STROKE / 2,
            'stroke': this.color,
            'fill': 'none',
        }), paper.circle(start.x, start.y, 2).attr({ 'stroke-width': 0, fill: '#c83639' }), arrowhead(paper, end.x, end.y, ARROWHEAD_RADIUS).attr({
            'transform': 'rotate(' + arrowheadAngle + ',' + end.x + ',' + end.y + ')',
            'stroke': this.color,
            'stroke-width': 1,
            'fill': this.color,
            'stroke-linejoin': 'round',
        }));
    };
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
    function Drawing(model, view, svgElement, overrideColors, enableMousewheel, stocksXYCenter) {
        this.model = model;
        this.xmile = view;
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
        this.stocksXYCenter = stocksXYCenter;
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
        this.dEnts = [];
        this.zEnts = new Array(Z_MAX);
        for (var i = 0; i < Z_MAX; i++)
            this.zEnts[i] = [];
        this.namedEnts = {};
        for (var i = 0; i < view.elements.length; i++) {
            var e = view.elements[i];
            if (e.type === 'style')
                continue;
            if (!DTypes.hasOwnProperty(e.type)) {
                console.log('unknown draw ent type ' + e.type);
                continue;
            }
            var de = new DTypes[e.type](this, e);
            this.dEnts.push(de);
            this.zEnts[Z_ORDER[e.type]].push(de);
            if (de.ident)
                this.namedEnts[de.ident] = de;
        }
        for (var i = 0; i < this.dEnts.length; i++)
            this.dEnts[i].init();
        for (var i = 0; i < Z_MAX; i++) {
            for (var j = 0; j < this.zEnts[i].length; j++)
                this.zEnts[i][j].draw();
        }
        for (var i = 0; i < Z_MAX; i++) {
            for (var j = 0; j < this.zEnts[i].length; j++)
                this.zEnts[i][j].drawLabel();
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
            sim.series.apply(sim, Object.keys(this.namedEnts)).then(function (result) {
                for (var n in result) {
                    if (!result.hasOwnProperty(n))
                        continue;
                    data = result[n];
                    var dEnt = d.namedEnts[n];
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
                var dEnt = this.namedEnts[n];
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
