define(['./util', './vars', './common'], function(util, vars, common) {
    var drawing = {};

    var errors = common.errors;

    /**
       Drawing represents a stock-and-flow diagram of a SD model.
    */
    var Drawing = function Drawing(model, svgElement) {
        common.err = null;

        this.model = model;

        return;
    }

    drawing.Drawing = Drawing;

    return drawing;
});
