sd.js - System Dynamics for the web
===================================

A modern, high performance, open source system dynamics engine for
today's web, and tomorrow's.

Clean, Simple API
-----------------

Running a model, displaying a stock and flow diagram, and visualizing
results on that diagram are all straightfoward.

```Javascript
var drawing, sim;

sd.load('/predator_prey.xmile', function(model) {

    // create a drawing in an existing SVG on the current page.  We
    // can have multiple diagrams for the same model, with different
    // views of the same underlying data.
    drawing = model.drawing('#diagram');

    // create a new simulation.  There can be multiple independent
    // simulations of the same model, running in parallel.
    sim = model.sim();

    // change the size of the initial predator population
    sim.setValue('lynx', 10000);

    sim.runToEnd().then(function() {
        // after completing a full run of the model, visualize the
        // results of this simulation in our stock and flow diagram.
        drawing.visualize(sim);
    }).done();
});
```

High Performance
----------------

Javascript code is dynamically generated and evaluated using modern
web browser's native
[just-in-time (JIT)](https://en.wikipedia.org/wiki/Just-in-time_compilation)
compilers.  This means simulation calculations run as native machine
code, rather than in an interpreter, with industry-leading speed as a
result.

Open Source
-----------

`sd.js` code is offered under the MIT license.  See LICENSE for
detials.  `sd.js` is built on
[q.js](http://documentup.com/kriskowal/q/) (MIT licensed),
[Snap.svg](http://snapsvg.io/) (Apache licensed), and
[mustache.js](https://github.com/janl/mustache.js) (MIT licensed).
These permissive licences mean you can use and build upon `sd.js`
without concern for royalties.

