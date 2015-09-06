sd.js - System Dynamics for the web
===================================

A modern, high performance, open source system dynamics engine for
today's web and tomorrow's.  `sd.js` runs in all major browsers
(IE11+, Chrome, Firefox, Safari), and on the server under
[node.js](https://nodejs.org) and [io.js](https://iojs.org).

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

GNU Make, node.js and npm are required to build `sd.js`, as are
some standard unix utilities.  Windows is not supported as a
development platform (patches welcome).  Once those are installed on
your system, you can simply run `make` to build the library for node
and the browser:

```
[bpowers@vyse sd.js]$ make
  TS    build-rt
  RT    src/runtime.ts
  TS    lib
  TS    build
  R.JS  sd.js
  R.JS  sd.min.js
```

Run `make test` to run unit tests, and `make rtest` to run regression
tests against the XMILE models in the
[SDXOrg/test-models](https://github.com/SDXorg/test-models) repository:

```
[bpowers@vyse sd.js]$ make test rtest
  TS    test
  TEST


  lex
    ✓ should lex a
[...]
    ✓ should lex "hares" * "birth fraction"


  32 passing (16ms)

  RTEST test/test-models/tests/number_handling/test_number_handling.xmile
  RTEST test/test-models/tests/lookups/test_lookups_no-indirect.xmile
  RTEST test/test-models/tests/logicals/test_logicals.xmile
  RTEST test/test-models/tests/if_stmt/if_stmt.xmile
  RTEST test/test-models/tests/exponentiation/exponentiation.xmile
time 0.000 mismatch in output (0.0 != 2.0)
time 1.000 mismatch in output (1.0 != 3.0)
time 2.000 mismatch in output (4.0 != 0.0)
time 3.000 mismatch in output (9.0 != 1.0)
time 4.000 mismatch in output (16.0 != 6.0)
  RTEST test/test-models/tests/eval_order/eval_order.xmile
  RTEST test/test-models/tests/comparisons/comparisons.xmile
  RTEST test/test-models/tests/builtin_min/builtin_min.xmile
  RTEST test/test-models/tests/builtin_max/builtin_max.xmile
  RTEST test/test-models/samples/teacup/teacup.xmile
  RTEST test/test-models/samples/teacup/teacup_w_diagram.xmile
  RTEST test/test-models/samples/bpowers-hares_and_lynxes_modules/model.xmile
  RTEST test/test-models/samples/SIR/SIR.xmile
Makefile:121: recipe for target 'rtest' failed
make: *** [rtest] Error 1
```

The standalone sd.js library for use in the browser is available at `sd.js`
and minified at `sd.min.js`, and includes all the dependencies (Snap.svg,
Mustache and Q).  For use under node, `require('sd')` should simply use the
CommonJS modules in the `lib/` directory.

TODO
----

- finish equation parser
- convert from old-style connector x,y center position to new-style
  connector takeoff angle (partially done).
- add-back isee compat support
- logging framework
- vensim diagrams
- vensim models
- arrays
