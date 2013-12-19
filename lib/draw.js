define(['./util', './vars', './runtime'], function(util, vars, runtime) {
    'use strict';

    var AUX_RADIUS = 9;
    var LABEL_PAD = 6;
    var STROKE = 1;
    var CLOUD_PATH = 'M 25.731189,3.8741489 C 21.525742,3.8741489 18.07553,7.4486396 17.497605,12.06118 C 16.385384,10.910965 14.996889,10.217536 13.45908,10.217535 C 9.8781481,10.217535 6.9473481,13.959873 6.9473482,18.560807 C 6.9473482,19.228828 7.0507906,19.875499 7.166493,20.498196 C 3.850265,21.890233 1.5000346,25.3185 1.5000346,29.310191 C 1.5000346,34.243794 5.1009986,38.27659 9.6710049,38.715902 C 9.6186538,39.029349 9.6083922,39.33212 9.6083922,39.653348 C 9.6083922,45.134228 17.378069,49.59028 26.983444,49.590279 C 36.58882,49.590279 44.389805,45.134229 44.389803,39.653348 C 44.389803,39.35324 44.341646,39.071755 44.295883,38.778399 C 44.369863,38.780301 44.440617,38.778399 44.515029,38.778399 C 49.470875,38.778399 53.499966,34.536825 53.499965,29.310191 C 53.499965,24.377592 49.928977,20.313927 45.360301,19.873232 C 45.432415,19.39158 45.485527,18.91118 45.485527,18.404567 C 45.485527,13.821862 42.394553,10.092543 38.598118,10.092543 C 36.825927,10.092543 35.215888,10.918252 33.996078,12.248669 C 33.491655,7.5434856 29.994502,3.8741489 25.731189,3.8741489 z';
    var CLOUD_WIDTH = 55;
    var ARROWHEAD_RADIUS = 4;
    var CLOUD_RADIUS = 8;
    var MODULE_R = 5;
    var TEXT_ATTR = {
        'font-size': '12px',
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
    var Z_MAX = 6;

    var dName = util.dName, eName = util.eName;

    var hasKey = function hasKey(o, k) {
        return o.hasOwnProperty(k);
    };

    var isZero = function isZero(n) {
        return Math.abs(n) < 0.0000001;
    };

    var isNaN = util.isNaN;

    var square = function square(n) {
        return Math.pow(n, 2);
    };

    var pt = function pt(x, y) {
        return {'x': x, 'y': y};
    };

    var floatAttr = util.floatAttr;

    var cloudAt = function cloudAt(paper, x, y) {
        var scale = (AUX_RADIUS*2/CLOUD_WIDTH);
        var t = 'matrix(' + scale + ', 0, 0, ' + scale + ', ' +
            (x - AUX_RADIUS) + ', ' + (y - AUX_RADIUS) + ')';
        return paper.path(CLOUD_PATH).attr({
            'fill': '#ffffff',
            'stroke':'#6388dc',
            'stroke-width': 2,
            'stroke-linejoin': 'round',
            'stroke-miterlimit': 4,
        }).transform(t);
    };

    var circleFromPoints = function(p1, p2, p3) {
        var off = square(p2.x) + square(p2.y);
        var bc = (square(p1.x) + square(p1.y) - off)/2;
        var cd = (off - square(p3.x) - square(p3.y))/2;
        var det = (p1.x - p2.x)*(p2.y - p3.y) - (p2.x - p3.x)*(p1.y - p2.y);
        if (isZero(det)) {
            console.log('blerg');
            return;
        }
        var idet = 1/det;
        var cx = (bc*(p2.y - p3.y) - cd*(p1.y - p2.y))*idet;
        var cy = (cd*(p1.x - p2.x) - bc*(p2.x - p3.x))*idet;
        return {
            'x': cx,
            'y': cy,
            'r': Math.sqrt(Math.pow(p2.x - cx, 2) + Math.pow(p2.y - cy, 2)),
        };
    };

    var label = function label(paper, cx, cy, side, text, rw, rh) {
        rw = rw || AUX_RADIUS;
        rh = rh || AUX_RADIUS;
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
        }

        var lbl = paper.text(x, y, text.split('\n')).attr(TEXT_ATTR);
        var lines = lbl.attr('text');
        if (typeof lines === 'string')
            lines = [lines];
        var spans = lbl.node.getElementsByTagName('tspan');
        var spanW = [];
        var i, t, bb;
        var maxH = Number.MIN_VALUE, maxW = Number.MIN_VALUE;
        for (i=0; i < lines.length; i++) {
            t = paper.text(0, 0, lines[i]).attr(TEXT_ATTR);
            bb = t.getBBox();
            spanW.push(bb.width);
            if (bb.height > maxH)
                maxH = bb.height;
            if (bb.width > maxW)
                maxW = bb.width;
            t.remove();
        }
        for (i = 0; i < spans.length; i++) {
            if (side === 'left' || side === 'right') {
                // TODO(bp) fix vertical centering
            }
            if (i > 0) {
                if (side === 'left')
                    spans[i].setAttribute('x', x - maxW/2);
                else
                    spans[i].setAttribute('x', x);
                spans[i].setAttribute('dy', 0.7*maxH);
            }
        }
        var off;
        switch (side) {
        case 'bottom':
            lbl.attr({y: y + LABEL_PAD});
            break;
        case 'top':
            lbl.attr({y: y - (spans.length-1)*(maxH/2) - LABEL_PAD*(spans.length > 1)});
            break;
        case 'left':
            // kind of gross, but I'm not sure what the correct metric
            // would be.  I think middle-align isn't working right or
            // something.
            if (spans.length > 1)
                off = (spans.length-2)*(maxH/2);
            else
                off = -maxH/4;

            lbl.attr({
                y: y - off,
                x: x - maxW/2
            });
            break;
        case 'right':
            lbl.node.classList.add('left-aligned');
            lbl.node.setAttribute('style', lbl.node.getAttribute('style').replace('middle', 'left'));
            lbl.attr({
                y: y - (spans.length-2)*(maxH/2)
            });
            break;
        }
        return lbl;
    };

    var last = function last(arr) {
        return arr[arr.length-1];
    };

    var arrowhead = function arrowhead(paper, x, y, r) {
        var head = 'M' + x + ',' + y + 'L' + (x-r) + ',' + (y + r/2) +
            'A' + r*3 + ',' + r*3 + ' 0 0,1 ' + (x-r) + ',' + (y - r/2) + 'z';
        return paper.path(head);
    };

    var sparkline = function sparkline(paper, cx, cy, w, h, time, values, graph) {
        var x = cx - w/2;
        var y = cy - h/2;
        var xMin = time[0];
        var xMax = last(time);
        var xSpan = xMax - xMin;
        var yMin = Math.min(0, Math.min.apply(null, values)); // 0 or below 0
        var yMax = Math.max.apply(null, values);
        var ySpan = (yMax - yMin) || 1;
        var p = '';
        var i;
        for (i = 0; i < values.length; i++) {
            if (isNaN(values[i])) {
                console.log('NaN at ' + time[i]);
            }
            p += (i === 0 ? 'M' : 'L') + (x + w*(time[i]-xMin)/xSpan) + ',' + (y + h - h*(values[i]-yMin)/ySpan);
        }
        var pAxis = 'M' + (x) + ',' + (y + h - h*(0-yMin)/ySpan) + 'L' + (x+w) + ',' + (y + h - h*(0-yMin)/ySpan);
        if (!graph) {
            return paper.g(
                paper.path(pAxis).attr({
                    'class': 'spark-axis',
                    'stroke-width': 0.125,
                    'stroke-linecap': 'round',
                    'stroke': '#999',
                    'fill': 'none',
                }),
                paper.path(p).attr({
                    'class': 'spark-line',
                    'stroke-width': 0.5,
                    'stroke-linecap': 'round',
                    'stroke': '#2299dd',
                    'fill': 'none',
                })
            );
        } else {
            var line = graph.node.querySelector('.spark-line')
            line.setAttribute('d', p);
            return graph;
        }
    };

    var DStock = function (drawing, element) {
        this.drawing = drawing;
        this.e = element;
        this.name = eName(element['@name']);
        this.dName = dName(element['@name']);

        this.cx = element['@x'];
        this.cy = element['@y'];
        this.w = 45;
        this.h = 35;
        this.color = this.drawing.colorOverride ? COLOR_AUX : element['@color'] || COLOR_AUX;
        this.labelSide = element['@label_side'] || 'top';
    };
    DStock.prototype.init = function() {
        // we are a stock, and need to inform all the flows into and
        // out of us that they, in fact, flow in and out of us.

        var mEnt = this.drawing.model.vars[this.name];

        var i, n, dEnt;
        for (i=0; i < mEnt.inflows.length; i++) {
            n = mEnt.inflows[i];
            dEnt = this.drawing.named_ents[n];
            if (!dEnt) {
                console.log('failed connecting ' + this.name + ' .to ' + n);
                continue;
            }
            dEnt.to = this.name;
        }
        for (i=0; i < mEnt.outflows.length; i++) {
            n = mEnt.outflows[i];
            dEnt = this.drawing.named_ents[n];
            if (!dEnt) {
                console.log('failed connecting ' + this.name + ' .from ' + n);
                continue;
            }
            this.drawing.named_ents[n].from = this.name;
        }
    };
    DStock.prototype.draw = function() {
        var paper = this.drawing.paper;
        var w = this.w;
        var h = this.h;

        // FIXME: the ceil calls are for Stella Modeler compatability.
        this.set = this.drawing.group(
            paper.rect(Math.ceil(this.cx - w/2), Math.ceil(this.cy - h/2), w, h).attr({
                'fill': 'white',
                'stroke-width': STROKE,
                'stroke': this.color,
            }),
            label(paper, this.cx, this.cy, this.labelSide, this.dName, w/2, h/2)
        );
    };
    DStock.prototype.visualize = function(time, values) {
        var hadGraph = !!this.graph;
        this.graph = sparkline(this.drawing.paper,
                               this.cx, this.cy, this.w-4, this.h-4,
                               time, values, this.graph);
        if (!hadGraph)
            this.set.add(this.graph);
    };

    var DModule = function (drawing, element) {
        this.drawing = drawing;
        this.e = element;
        this.name = eName(element['@name']);
        this.dName = dName(element['@name']);

        this.cx = element['@x'];
        this.cy = element['@y'];
        this.w = 55;
        this.h = 45;
        this.color = this.drawing.colorOverride ? COLOR_AUX : element['@color'] || COLOR_AUX;
        this.labelSide = element['@label_side'] || 'top';
    };
    DModule.prototype.init = function() {
    };
    DModule.prototype.draw = function() {
        var paper = this.drawing.paper;
        var w = this.w;
        var h = this.h;

        // FIXME: the ceil calls are for Stella Modeler compatability.
        this.set = this.drawing.group(
            paper.rect(Math.ceil(this.cx - w/2), Math.ceil(this.cy - h/2), w, h, MODULE_R, MODULE_R).attr({
                'fill': 'white',
                'stroke-width': STROKE,
                'stroke': this.color,
            }),
            label(paper, this.cx, this.cy, this.labelSide, this.dName, w/2, h/2)
        );
    };
    DModule.prototype.visualize = function(time, values) {
        var hadGraph = !!this.graph;
        this.graph = sparkline(this.drawing.paper,
                               this.cx, this.cy, this.w-6, this.h-6,
                               time, values, this.graph);
        if (!hadGraph)
            this.set.add(this.graph);
    };

    var DAux = function(drawing, element) {
        this.drawing = drawing;
        this.e = element;
        this.name = eName(element['@name']);
        this.dName = dName(element['@name']);

        this.cx = element['@x'];
        this.cy = element['@y'];
        this.color = this.drawing.colorOverride ? COLOR_AUX : element['@color'] || COLOR_AUX;
        this.labelSide = element['@label_side'] || 'bottom';
    };
    DAux.prototype.init = function() {};
    DAux.prototype.draw = function() {
        var paper = this.drawing.paper;
        this.set = this.drawing.group(
            paper.circle(this.cx, this.cy, AUX_RADIUS).attr({
                'fill': 'white',
                'stroke-width': STROKE,
                'stroke': this.color,
            }),
            label(paper, this.cx, this.cy, this.labelSide, this.dName)
        );
    };
    DAux.prototype.visualize = function(time, values) {
        var hadGraph = !!this.graph;
        this.graph = sparkline(this.drawing.paper,
                               this.cx, this.cy, AUX_RADIUS, AUX_RADIUS,
                               time, values, this.graph);
        if (!hadGraph)
            this.set.add(this.graph);
    };

    var DFlow = function(drawing, element) {
        this.drawing = drawing;
        this.e = element;
        this.name = eName(element['@name']);
        this.dName = dName(element['@name']);
        this.cx = element['@x'];
        this.cy = element['@y'];
        this.to = null;
        this.from = null;
        this.color = this.drawing.colorOverride ? COLOR_AUX : element['@color'] || COLOR_AUX;
        this.labelSide = element['@label_side'] || 'bottom';
    };
    DFlow.prototype.init = function() {};
    DFlow.prototype.draw = function() {
        var paper = this.drawing.paper;
        var cx = this.cx;
        var cy = this.cy;
        var pts = this.e.pts.pt;
        if (pts.length < 2) {
            console.log('ERROR: too few points for flow: ' + JSON.stringify(this));
            return;
        }
        var spath = '';
        var j;
        for (j = 0; j < pts.length; j++)
            spath += (j === 0 ? 'M' : 'L') + pts[j]['@x'] + ',' + pts[j]['@y'];

        var from_cloud;
        var cloud;
        this.set = this.drawing.group();
        if (!this.from) {
            cloud = cloudAt(paper, pts[0]['@x'], pts[0]['@y']);
            // when we are flowing out of a cloud, don't adjust the
            // length, just later the cloud above the pipe
            from_cloud = cloud;
        }
        var x, y, prevX, prevY;
        if (!this.to) {
            x = pts[pts.length-1]['@x'];
            y = pts[pts.length-1]['@y'];
            prevX = pts[pts.length-2]['@x'];
            prevY = pts[pts.length-2]['@y'];
            cloud = cloudAt(paper, x, y);
            this.set.add(cloud);
            if (prevX < x)
                pts[pts.length-1]['@x'] = x - CLOUD_RADIUS;
            if (prevX > x)
                pts[pts.length-1]['@x'] = x + CLOUD_RADIUS;
            if (prevY < y)
                pts[pts.length-1]['@y'] = y - CLOUD_RADIUS;
            if (prevY > y)
                pts[pts.length-1]['@y'] = y + CLOUD_RADIUS;
        }
        // recalcualte path after cloud intersection
        spath = '';
        var dx, dy, θ, arrowθ, lastPt;
        for (j = 0; j < pts.length; j++) {
            x = pts[j]['@x'];
            y = pts[j]['@y'];
            if (j === pts.length-1) {
                dx = x - pts[j-1]['@x'];
                dy = y - pts[j-1]['@y'];
                θ = Math.atan2(dy, dx) * 180/Math.PI;
                if (θ < 0)
                    θ += 360;
                if (θ >= 315 || θ < 45) {
                    x -= 4;
                    arrowθ = 0;
                } else if (θ >= 45 &&  θ < 135) {
                    y -= 4;
                    arrowθ = 90;
                } else if (θ >= 135 &&  θ < 225) {
                    x += 4;
                    arrowθ = 180;
                } else {
                    y += 4;
                    arrowθ = 270;
                }
            }
            spath += (j === 0 ? 'M' : 'L') + x + ',' + y;
        }
        this.set.add(paper.path(spath).attr({
            'stroke-width': STROKE*4,
            'stroke': this.color,
            'fill': 'none',
        }));

        lastPt = last(pts);
        this.set.add(arrowhead(paper, lastPt['@x'], lastPt['@y'], ARROWHEAD_RADIUS*2).attr({
            'transform': 'rotate(' + (arrowθ) + ',' + lastPt['@x'] + ',' + lastPt['@y'] + ')',
            'stroke': this.color,
            'stroke-width': 1,
            'fill': 'white',
            'stroke-linejoin': 'round',
        }));

        this.set.add(paper.path(spath).attr({
            'stroke': 'white',
            'stroke-width': STROKE*2,
            'fill': 'none',
        }));
        this.set.add(paper.circle(cx, cy, AUX_RADIUS).attr({
            'fill': 'white',
            'stroke-width': STROKE,
            'stroke': this.color,
        }));
        if (from_cloud)
            this.set.append(from_cloud);
        this.set.add(label(paper, cx, cy, this.labelSide, this.dName));
    };
    DFlow.prototype.visualize = function(time, values) {
        var hadGraph = !!this.graph;
        this.graph = sparkline(this.drawing.paper,
                               this.cx, this.cy, AUX_RADIUS, AUX_RADIUS,
                               time, values, this.graph);
        if (!hadGraph)
            this.set.add(this.graph);
    };

    var DConnector = function(drawing, element) {
        this.drawing = drawing;
        this.e = element;
        this.name = undefined;
        this.color = this.drawing.colorOverride ? COLOR_CONN : element['@color'] || COLOR_CONN;
    };
    DConnector.prototype.init = function() {};
    DConnector.prototype.draw = function() {
        var paper = this.drawing.paper;
        var cx = this.e['@x'];
        var cy = this.e['@y'];
        var fromEnt = this.drawing.named_ents[eName(this.e.from)];
        if (!fromEnt)
            return;
        var fx = fromEnt.cx;
        var fy = fromEnt.cy;
        var toEnt = this.drawing.named_ents[eName(this.e.to)];
        if (!toEnt)
            return;
        var tx = toEnt.cx;
        var ty = toEnt.cy;
        var circ = circleFromPoints(pt(cx, cy), pt(fx, fy), pt(tx, ty));
        var spath = '';
        var inv = 0;
        spath += 'M' + cx + ',' + cy;
        var dx, dy, startθ, endθ, spanθ, internalθ;

        var r;
        if (circ) {
            dx = fx - circ.x;
            dy = fy - circ.y;
            startθ = Math.atan2(dy, dx) * 180/Math.PI;
            dx = tx - circ.x;
            dy = ty - circ.y;
            endθ = Math.atan2(dy, dx) * 180/Math.PI;
            spanθ = endθ - startθ;
            while (spanθ < 0)
                spanθ += 360;
            spanθ %= 360;
            inv = spanθ <= 179;

            // FIXME(bp) this is an approximation, a bad one.
            if (toEnt instanceof DModule)
                r = 25;
            else
                r = AUX_RADIUS;
            internalθ = Math.tan(r/circ.r)*180/Math.PI;
            tx = circ.x + circ.r*Math.cos((endθ + (inv ? -1 : 1)*internalθ)/180*Math.PI);
            ty = circ.y + circ.r*Math.sin((endθ + (inv ? -1 : 1)*internalθ)/180*Math.PI);

            spath += 'A' + circ.r + ',' + circ.r + ' 0 0,' + (inv ? '1' : '0') + ' ' + tx + ',' + ty;
        } else {
            dx = tx - fx;
            dy = ty - fy;
            endθ = Math.atan2(dy, dx) * 180/Math.PI;
            // TODO(bp) subtract AUX_RADIUS from path
            spath += 'L' + tx + ',' + ty;
        }

        var θ = 0;
        if (circ) {
            // from center of to aux
            //var slope1 = (i.y - ty)/(i.x - tx);
            // inverse from center of circ
            var slope2 = -Math.atan2((tx - circ.x), (ty - circ.y));
            θ = slope2*180/Math.PI;//(slope1+slope2)/2;
            if (inv)
                θ += 180;
        }

        this.set = this.drawing.group(
            paper.path(spath).attr({
                'stroke-width': STROKE/2,
                'stroke': this.color,
                'fill': 'none',
            }),
            paper.circle(cx, cy, 2).attr({'stroke-width':0, fill:'#c83639'}),
            arrowhead(paper, tx, ty, ARROWHEAD_RADIUS).attr({
                'transform': 'rotate(' + (θ) + ',' + tx + ',' + ty + ')',
                'stroke': this.color,
                'stroke-width': 1,
                'fill': this.color,
                'stroke-linejoin': 'round',
            })
        );
    };

    var DTypes = {
        'stock': DStock,
        'flow': DFlow,
        'aux': DAux,
        'connector': DConnector,
        'module': DModule,
    };

    /**
       Drawing represents a stock-and-flow diagram of a SD model.
    */
    var Drawing = function(model, xmile, svgElementID, overrideColors, enableMousewheel) {
        this.model = model;
        this.xmile = xmile;
        this.paper = new Snap(svgElementID);
        if (svgElementID[0] === '#')
            svgElementID = svgElementID.substr(1);
        var svg = window.document.getElementById(svgElementID);
        var defs = svg.getElementsByTagName('defs')[0];
        if (defs)
            defs.outerHTML = runtime.drawCSS;
        else
            svg.innerHTML += runtime.drawCSS;
        this._selector = svgElementID;
        this._g = this.paper.g();
        this._g.node.id = 'viewport';
        this.colorOverride = overrideColors;

        //var zoom = floatAttr(view, 'zoom')/100.0;
        svg.setAttribute('preserveAspectRatio', 'xMinYMin');

        var elems = [];
        var n, i;
        for (n in DTypes) {
            if (!(n in xmile))
                continue;
            if (!(xmile[n] instanceof Array))
                xmile[n] = [xmile[n]];
            for (i = 0; i < xmile[n].length; i++) {
                xmile[n][i]['@tagName'] = n;
                elems.push(xmile[n][i]);
            }
        }

        this.d_ents = [];
        this.z_ents = new Array(Z_MAX);
        for (i = 0; i < Z_MAX; i++)
            this.z_ents[i] = [];
        this.named_ents = {};

        var j, e, de, tagName;

        // create a drawing entity for each known tag in the display
        for (i = 0; i < elems.length; i++) {
            e = elems[i];
            tagName = e['@tagName'];
            if (!tagName)
                continue;
            if (!hasKey(DTypes, tagName)) {
                console.log('unknown draw ent type ' + e.tagName);
                continue;
            }
            de = new DTypes[tagName](this, e);
            this.d_ents.push(de);
            this.z_ents[Z_ORDER[tagName]].push(de);
            if (de.name)
                this.named_ents[de.name] = de;
        }

        // all draw ents need to be constructed and read in before we
        // can initialize them
        for (i = 0; i < this.d_ents.length; i++)
            this.d_ents[i].init();

        // TODO(bp) sort by draw order
        for (i = 0; i < Z_MAX; i++) {
            for (j = 0; j < this.z_ents[i].length; j++)
                this.z_ents[i][j].draw();
        }

        // pieces to construct a transformation matrix from
        this._t = {
            'scale': 1,
            'offX': 0,
            'offY': 0,
            'x': 0,
            'y': 0,
            'dx': 0,
            'dy': 0,
        };

        var _this = this;
        svg.onmousedown = function(e) {
            var drawing = _this;
            drawing.dragStart = {x:e.pageX, y:e.pageY};
        };

        svg.onmousemove = function(e) {
            var drawing = _this;
            if (!drawing.dragStart)
                return;
            drawing._t.dx = e.pageX-drawing.dragStart.x;
            drawing._t.dy = e.pageY-drawing.dragStart.y;
            drawing.transform();
        };

        svg.onmouseup = function() {
            var drawing = _this;
            drawing._t.x += drawing._t.dx;
            drawing._t.y += drawing._t.dy;
            drawing._t.offX = drawing._t.x;
            drawing._t.offY = drawing._t.y;
            drawing._t.dx = 0;
            drawing._t.dy = 0;
            drawing.dragStart = null;
        };

        if (!enableMousewheel)
            return;

        svg.onmousewheel = function(e) {
            var drawing = _this;
            var delta = e.wheelDelta/120;
            //var w = $(drawing._selector).width();
            //var h = $(drawing._selector).height();
            drawing._t.scale += 0.2*delta;
            //drawing._t.x += drawing._t.offX + (1-drawing._t.scale)*w/10;
            //drawing._t.y += drawing._t.offY + (1-drawing._t.scale)*w/10;
            drawing.transform();
        };

        // firefox is special.
        svg.onDOMMouseScroll = function(e) {
            var drawing = _this;
            var delta = -e.detail/3;
            //var w = $(drawing._selector).width();
            //var h = $(drawing._selector).height();
            drawing._t.scale += 0.2*delta;
            //drawing._t.x = drawing._t.offX + (1-drawing._t.scale)*w/10;
            //drawing._t.y = drawing._t.offY + (1-drawing._t.scale)*w/10;
            drawing.transform();
        };
    };
    Drawing.prototype.transform = function(scale, x, y) {
        if (arguments.length === 3) {
            this._t.scale = scale;
            this._t.x = x;
            this._t.y = y;
        }
        var matrix = 'matrix(' + this._t.scale + ',0,0,' + this._t.scale +
            ',' + (this._t.x + this._t.dx) +
            ',' + (this._t.y + this._t.dy) + ')';
        this._g.node.setAttribute('transform', matrix);
    };
    Drawing.prototype.visualize = function(data) {
        // FIXME(bp) hack for compat
        if (data.project) {
            var sim = data;
            var d = this;
            sim.series.apply(sim, Object.keys(this.named_ents)).then(function(result) {
                var n, dEnt, data;
                for (n in result) {
                    data = result[n];
                    dEnt = d.named_ents[n];
                    if (!dEnt) {
                        console.log('sim data for non-drawn ' + n);
                        continue;
                    }
                    dEnt.visualize(data.time, data.values);
                }
            }).done();
        } else {
            var result = data;
            var n, dEnt;
            for (n in result) {
                data = result[n];
                dEnt = this.named_ents[n];
                if (!dEnt) {
                    console.log('sim data for non-drawn ' + n);
                    continue;
                }
                dEnt.visualize(data.time, data.values);
            }
        }
    };
    Drawing.prototype.group = function() {
        var g = this.paper.g.apply(this.paper, arguments);
        this._g.append(g);
        return g;
    };

    return {
        'Drawing': Drawing,
    };
});
