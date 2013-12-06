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

Open Standards
--------------

`sd.js` is built on
[XMILE](https://www.oasis-open.org/committees/tc_home.php?wg_abbrev=xmile),
the emerging open standard for representing system dynamics models.
When the standard is complete, `sd.js` will aim for full conformance,
making it possible to use models created in desktop software platforms
on the web, and models created or modified in `sd.js` on the desktop.

Building
--------

Python, Make, node.js and npm are required to build `sd.js`, as are
some standard unix utilities.  Windows is not supported as a
development platform (patches welcome).  Once those are installed on
your system, execute the following command to install the required
node libraries:

    [bpowers@fina sd.js]$ npm install requirejs nodeunit xmldom jshint

Now you should be able to run the unit tests and build the library:

```
[bpowers@fina sd.js]$ make check
node_modules/.bin/nodeunit test/runner.js

runner.js
✔ suite - identifierSet
✔ suite - lex
✔ suite - lynx1
✔ suite - var - deps
✔ suite - var - less than
✔ suite - var - tables
✔ suite - var - equations
✔ suite - sort
✔ suite - lookup
✔ suite - var - equations 2

OK: 134 assertions (101ms)

[bpowers@fina sd.js]$ make
mkdir -p build
node_modules/.bin/r.js -o build.js

Tracing dependencies for: vendor/almond

/home/bpowers/tmp/sd.js/build/sd.nakid.js
----------------
/home/bpowers/tmp/sd.js/lib/vendor/almond.js
/home/bpowers/tmp/sd.js/lib/common.js
/home/bpowers/tmp/sd.js/lib/util.js
/home/bpowers/tmp/sd.js/lib/lex.js
/home/bpowers/tmp/sd.js/lib/vars.js
/home/bpowers/tmp/sd.js/lib/draw.js
/home/bpowers/tmp/sd.js/lib/runtime.js
/home/bpowers/tmp/sd.js/lib/sim.js
/home/bpowers/tmp/sd.js/lib/model.js
/home/bpowers/tmp/sd.js/lib/sd.js

cat lib/vendor/{mustache,q,snapsvg}.js build/sd.nakid.js >build/sd.js
```
