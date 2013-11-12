define(['./util', './vars', './common'], function(util, vars, common) {

    var AUX_RADIUS = 9;
    var LABEL_PAD = 7;
    var STROKE = 1;
    var CLOUD_PATH = 'M 25.731189,3.8741489 C 21.525742,3.8741489 18.07553,7.4486396 17.497605,12.06118 C 16.385384,10.910965 14.996889,10.217536 13.45908,10.217535 C 9.8781481,10.217535 6.9473481,13.959873 6.9473482,18.560807 C 6.9473482,19.228828 7.0507906,19.875499 7.166493,20.498196 C 3.850265,21.890233 1.5000346,25.3185 1.5000346,29.310191 C 1.5000346,34.243794 5.1009986,38.27659 9.6710049,38.715902 C 9.6186538,39.029349 9.6083922,39.33212 9.6083922,39.653348 C 9.6083922,45.134228 17.378069,49.59028 26.983444,49.590279 C 36.58882,49.590279 44.389805,45.134229 44.389803,39.653348 C 44.389803,39.35324 44.341646,39.071755 44.295883,38.778399 C 44.369863,38.780301 44.440617,38.778399 44.515029,38.778399 C 49.470875,38.778399 53.499966,34.536825 53.499965,29.310191 C 53.499965,24.377592 49.928977,20.313927 45.360301,19.873232 C 45.432415,19.39158 45.485527,18.91118 45.485527,18.404567 C 45.485527,13.821862 42.394553,10.092543 38.598118,10.092543 C 36.825927,10.092543 35.215888,10.918252 33.996078,12.248669 C 33.491655,7.5434856 29.994502,3.8741489 25.731189,3.8741489 z';
    var CLOUD_WIDTH = 55;
    var ARROWHEAD_RADIUS = 8;

    var errors = common.errors;

    /// dName converts a string into the format the user expects to
    /// see on a diagram.
    var dName = function(s) {
        return s.replace('\\n', ' ').replace('_', ' '); // FIXME(bp) re-add newline
    }

    /// eName converts a string into the format used internally in
    /// the engine and drawing code with underscores.
    var eName = function(s) {
        return s.replace('\\n', '_').replace(' ', '_').toLowerCase();
    }

    var hasKey = function(o, k) {
        return o.hasOwnProperty(k);
    }

    var isZero = function(n) {
        return Math.abs(n) < .0000001;
    }

    var sq = function(n) {
        return Math.pow(n, 2);
    }

    var pt = function(x, y) {
        return {'x': x, 'y': y};
    }

    var path_for_circle = function(x, y, r) {
        return 'M' + x + ',' + (y-r) + 'A' + r + ',' + r + ' 0 1,1,' + (x-0.1) + ',' + (y-r) + 'z';
    }

    var cloud_at = function(paper, x, y) {
        const scale = (AUX_RADIUS*2/CLOUD_WIDTH);
        const t = 'T' + (x - AUX_RADIUS/scale) + ',' + (y - AUX_RADIUS/scale) + 'S' + scale + ',' + scale;
        return paper.path(CLOUD_PATH).attr({
            'fill': '#ffffff',
            'stroke':'#6388dc',
            'stroke-width': 2,
            'stroke-linejoin': 'round',
            'stroke-miterlimit': 4,
        }).transform('matrix(' + scale + ', 0, 0, ' + scale + ', ' + (x - AUX_RADIUS) + ', ' + (y - AUX_RADIUS) + ')');
    }

    var circle_from_points = function(p1, p2, p3) {
        var off = sq(p2.x) + sq(p2.y);
        var bc = (sq(p1.x) + sq(p1.y) - off)/2;
        var cd = (off - sq(p3.x) - sq(p3.y))/2;
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
    }

    var label_bottom = function label_bottom(paper, x, y, text) {
        const label = paper.text(x, y, text.split('\n')).attr({
            'font-size': '12px',
            'font-family': 'Source Sans Pro',
            'font-weight': '300',
            'text-anchor': 'middle',
            'white-space': 'nowrap',
        });
        const spans = $(label.node).children('tspan');
        var i;
        for (i = 0; i < spans.length; i++) {
            // TODO(bp) newlines
        }
        label.attr({y: y + .5*label.getBBox().height});
        return label;
    }

    var last = function last(arr) {
        return arr[arr.length-1];
    }

    var sparkline = function sparkline(paper, cx, cy, w, h, time, values) {
        var x = cx - w/2;
        var y = cy - h/2;
        var xMin = time[0];
        var xMax = last(time);
        var xSpan = xMax - xMin;
        var yMin = Math.min(0, Math.min.apply(null, values)); // 0 or below 0
        var yMax = Math.max.apply(null, values);
        var ySpan = yMax - yMin;
        var p = '';
        var i;
        for (i = 0; i < values.length; i++) {
            p += (i === 0 ? 'M' : 'L') + (x + w*(time[i]-xMin)/xSpan) + ',' + (y + h - h*(values[i]-yMin)/ySpan);
        }
        var pAxis = 'M' + (x) + ',' + (y + h - h*(0-yMin)/ySpan) + 'L' + (x+w) + ',' + (y + h - h*(0-yMin)/ySpan);
        return paper.g(
            paper.path(pAxis).attr({
                'stroke-width': .125,
                'stroke-linecap': 'round',
                'stroke': '#999',
                'fill': 'none',
            }),
            paper.path(p).attr({
                'stroke-width': .5,
                'stroke-linecap': 'round',
                'stroke': '#2299dd',
                'fill': 'none',
            })
        );
    }

    var DStock = function (drawing, element) {
        this.drawing = drawing;
        this.e = element;
        var je = $(this.e);
        this.name = eName(je.attr('name'));
        this.dName = dName(je.attr('name'));

        this.cx = parseFloat(je.attr('x'));
        this.cy = parseFloat(je.attr('y'));
        this.w = 45;
        this.h = 35;
    }
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
    }
    DStock.prototype.draw = function() {
        var paper = this.drawing.paper;
        var je = $(this.e);
        var w = this.w;
        var h = this.h;

        // FIXME: the ceil calls are for Stella Modeler compatability.
        this.set = paper.group([
            paper.rect(Math.ceil(this.cx - w/2), Math.ceil(this.cy - h/2), w, h).attr({
                'fill': 'white',
                'stroke-width': STROKE,
                'stroke': 'black',
            }),
            label_bottom(paper, this.cx, this.cy + h/2 + LABEL_PAD, this.dName),
        ]);
    }
    DStock.prototype.visualize = function(time, values) {
        var spark = sparkline(this.drawing.paper,
                              this.cx, this.cy, this.w-4, this.h-4,
                              time, values);
        this.set.add(spark);
    }

    var DAux = function(drawing, element) {
        this.drawing = drawing;
        this.e = element;
        var je = $(this.e);
        this.name = eName(je.attr('name'));
        this.dName = dName(je.attr('name'));
        this.cx = parseFloat(je.attr('x'));
        this.cy = parseFloat(je.attr('y'));
    }
    DAux.prototype.init = function() {}
    DAux.prototype.draw = function() {
        var paper = this.drawing.paper;
        var je = $(this.e);
        this.set = paper.group([
            paper.circle(this.cx, this.cy, AUX_RADIUS).attr({
                'fill': 'white',
                'stroke-width': STROKE,
                'stroke': 'black',
            }),
            label_bottom(paper, this.cx, this.cy + AUX_RADIUS + LABEL_PAD, this.dName)
        ]);
    }
    DAux.prototype.visualize = function(time, values) {
        var spark = sparkline(this.drawing.paper,
                              this.cx, this.cy, AUX_RADIUS, AUX_RADIUS,
                              time, values);
        this.set.add(spark);
    }

    var DFlow = function(drawing, element) {
        this.drawing = drawing;
        this.e = element;
        var je = $(this.e);
        this.name = eName(je.attr('name'));
        this.dName = dName(je.attr('name'));
        this.to = null;
        this.from = null;
        this.cx = parseFloat(je.attr('x'));
        this.cy = parseFloat(je.attr('y'));
    }
    DFlow.prototype.init = function() {}
    DFlow.prototype.draw = function() {
        var paper = this.drawing.paper;
        var je = $(this.e);
        var cx = this.cx;
        var cy = this.cy;
        var pts = je.find('pts pt');
        var spath = '';
        var j;
        for (j = 0; j < pts.length; j++) {
            jpt = $(pts[j]);
            spath += (j === 0 ? 'M' : 'L') + jpt.attr('x') + ',' + jpt.attr('y');
        }
        var scale = AUX_RADIUS*2/CLOUD_WIDTH;
        var from_cloud;
        var cloud, intersect, t, jpt, cpath;
        this.set = paper.group();
        if (!this.from) {
            jpt = $(pts[0]);
            cloud = cloud_at(paper, jpt.attr('x'), jpt.attr('y'));
            // when we are flowing out of a cloud, don't adjust the
            // length, just later the cloud above the pipe
            from_cloud = cloud;
        }
        if (!this.to) {
            jpt = $(pts[pts.length-1]);
            cloud = cloud_at(paper, jpt.attr('x'), jpt.attr('y'));
            this.set.add(cloud);
            t = 'T' + (jpt.attr('x') - AUX_RADIUS/scale) + ',' + (jpt.attr('y') - AUX_RADIUS/scale) + 'S' + scale + ',' + scale;
            //cpath = Raphael.transformPath(cloud.attr('path'), t).map(function(arr) { return arr[0] + ' ' + arr.slice(1).join(','); }).join(' ') + 'z';
            cpath = Raphael.transformPath(cloud.attr('path'), t);
            // update path start/end to take into acccount cloud intersection
            intersect = Raphael.pathIntersection(spath, cpath)[0];
            jpt.attr('x', intersect.x);
            jpt.attr('y', intersect.y);
        }
        // recalcualte path after cloud intersection
        spath = '';
        for (j = 0; j < pts.length; j++) {
            jpt = $(pts[j]);
            spath += (j === 0 ? 'M' : 'L') + jpt.attr('x') + ',' + jpt.attr('y');
        }
        this.set.add(paper.path(spath).attr({
            'stroke-width': STROKE*4,
            'stroke': 'black',
        }));
        this.set.add(paper.path(spath).attr({stroke:'white','stroke-width': STROKE*2}));
        this.set.add(paper.circle(cx, cy, AUX_RADIUS).attr({
            'fill': 'white',
            'stroke-width': STROKE,
            'stroke': 'black',
        }));
        if (from_cloud)
            this.set.append(from_cloud);
        this.set.add(label_bottom(paper, cx, cy + AUX_RADIUS + LABEL_PAD, this.dName));
    }
    DFlow.prototype.visualize = function(time, values) {
        var spark = sparkline(this.drawing.paper,
                              this.cx, this.cy, AUX_RADIUS, AUX_RADIUS,
                              time, values);
        this.set.add(spark);
    }

    var DConnector = function(drawing, element) {
        this.drawing = drawing;
        this.e = element;
        this.name = undefined;
    }
    DConnector.prototype.init = function() {}
    DConnector.prototype.draw = function() {
        var paper = this.drawing.paper;
        var je = $(this.e);
        var cx = parseFloat(je.attr('x'));
        var cy = parseFloat(je.attr('y'));
        var from = $(this.drawing.named_ents[eName(je.find('from').text())].e);
        var fx = parseFloat(from.attr('x'));
        var fy = parseFloat(from.attr('y'));
        var to = $(this.drawing.named_ents[eName(je.find('to').text())].e);
        var tx = parseFloat(to.attr('x'));
        var ty = parseFloat(to.attr('y'));
        var circ = circle_from_points(pt(cx, cy), pt(fx, fy), pt(tx, ty));

        var inv = cx > fx && cy < fy;
        var to_path = path_for_circle(tx, ty, AUX_RADIUS + STROKE/4);
        var spath = '';
        spath += 'M' + cx + ',' + cy;
        spath += 'A' + circ.r + ',' + circ.r + ' 0 0,' + (inv ? '1' : '0') + ' ' + tx + ',' + ty;
        var i = Raphael.pathIntersection(spath, to_path)[0];
        spath = 'M' + cx + ',' + cy;
        spath += 'A' + circ.r + ',' + circ.r + ' 0 0,' + (inv ? '1' : '0') + ' ' + i.x + ',' + i.y;

        // from center of to aux
        var slope1 = (i.y - ty)/(i.x - tx);
        // inverse from center of circ
        var slope2 = -(i.x - circ.x)/(i.y - circ.y);
        var ang = Math.atan(slope2);//(slope1+slope2)/2;
        if (!inv)
            ang += Math.PI;

        var head = 'M' + i.x + ',' + i.y + 'L' + (i.x-4) + ',' + (i.y + 2) + 'A12,12 0 0,1 ' + (i.x-4) + ',' + (i.y-2) + 'z';
        var p = paper.path(head).attr({
            'transform': 'rotate(' + (ang*180/Math.PI) + ',' + i.x + ',' + i.y + ')',
            'stroke': 'gray',
            'stroke-width': 1,
            'fill': 'gray',
            'stroke-linejoin': 'round',
        });

        this.set = paper.group([
            paper.path(spath).attr({
                'stroke-width': STROKE,
                'stroke': 'gray',
                'fill': 'none',
            }),
            paper.circle(cx, cy, 2).attr({'stroke-width':0, fill:'#c83639'}),
        ]);
    }

    var DTypes = {
        'STOCK': DStock,
        'FLOW': DFlow,
        'AUX': DAux,
        'CONNECTOR': DConnector,
    };

    /**
       Drawing represents a stock-and-flow diagram of a SD model.
    */
    var Drawing = function(model, svgElementID) {
        common.err = null;

        var view = $(model.xmile.find('view')[0]);

        this.model = model;
        this.paper = Snap(svgElementID);

        var zoom = parseFloat(view.attr('zoom'))/100.;
        $(svgElementID).get()[0].setAttribute('preserveAspectRatio', 'xMinYMin');
        $(svgElementID).get()[0].setAttribute('viewBox',
                                              [view.attr('scroll_x')/zoom,
                                               view.attr('scroll_y')/zoom,
                                               1024/zoom,
                                               768/zoom].join(' '));

        var elems = $(view.children());

        this.d_ents = [];
        this.named_ents = {};

        var i, j, e, de;

        // create a drawing entity for each known tag in the display
        for (i = 0; i < elems.length; i++) {
            e = elems[i];
            if (!hasKey(DTypes, e.tagName)) {
                console.log('unknown draw ent type ' + e.tagName);
                continue;
            }
            de = new DTypes[e.tagName](this, e);
            this.d_ents.push(de);
            if (de.name)
                this.named_ents[de.name] = de;
        }

        // all draw ents need to be constructed and read in before we
        // can initialize them
        for (i = 0; i < this.d_ents.length; i++)
            this.d_ents[i].init();

        // TODO(bp) sort by draw order
        for (i = 0; i < this.d_ents.length; i++)
            this.d_ents[i].draw();
    }
    Drawing.prototype.visualize = function(sim) {
        var d = this;
        sim.series.apply(sim, Object.keys(drawing.named_ents)).then(function(result) {
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
    };

    return {
        'Drawing': Drawing,
    };
});
