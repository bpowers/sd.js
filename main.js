// jshint devel:true

var drawing, sim;

// when the browser resizes (or switches between vertical and
// horizontal on mobile), we potentially want to scale our diagram up
// or down.
function scaleDrawing() {
    'use strict';
    if (!drawing)
        return;

    let viewport = $('#viewport')[0];
    if (!viewport)
        return;
    let bbox = viewport.getBBox();
    let canvas = $('#model1')[0].getBoundingClientRect();

    // truncate to 2 decimal places
    let scale = ((canvas.width / bbox.width * 100)|0)/100;
    if (scale > 2)
        scale = 2;
    let wPadding = canvas.width - scale*bbox.width;
    let hPadding = canvas.height - scale*bbox.height;
    drawing.transform(scale, wPadding/2 - 20, hPadding/2 - 40);
}

//$(window).resize(scaleDrawing);

function getQueryParams(qs) {
    'use strict';
    qs = qs.split('+').join(' ');

    var params = {},
        tokens,
        re = /[?&]?([^=]+)=([^&]*)/g;

    while (tokens = re.exec(qs)) {
        params[decodeURIComponent(tokens[1])] = decodeURIComponent(tokens[2]);
    }

    return params;
}


$(function(){
    var params = getQueryParams(document.location.search);
    var modelPath = 'hares_and_foxes.xmile'; // 'population.xmile';
    if ('model' in params)
        modelPath = params['model'];

    var stocksXYCenter = params['use_stock_xy_as_center'] === 'true';

    $('#main-header').text(modelPath);

    sd.load(modelPath, function(model) {
        drawing = model.project.model('lynxes').drawing('#model1', true, false, stocksXYCenter);

        scaleDrawing();

        sim = model.sim();
        sim.setDesiredSeries(Object.keys(drawing.namedEnts));
        sim.runToEnd().then(function(data) {
            drawing.visualize(data);
        });
        sim.csv().then(function(csv) {
            console.log(csv);
        });
    });
});
