sd.js - System Dynamics for the web
===================================

[![npm](https://img.shields.io/npm/v/sd.js.svg)]()
[![David status](https://david-dm.org/sdlabs/sd.js.svg)](https://david-dm.org/sdlabs/sd.js#info=dependencies&view=table)
[![David dev status](https://david-dm.org/sdlabs/sd.js/dev-status.svg)](https://david-dm.org/sdlabs/sd.js#info=devDependencies&view=table)

A modern, high performance, open source system dynamics engine for
today's web and tomorrow's.  `sd.js` runs in all major browsers
(Edge, Chrome, Firefox, Safari), and on the server under
[node.js](https://nodejs.org).

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
detials.  `sd.js` is built on [Snap.svg](http://snapsvg.io/) (Apache
licensed), and [mustache.js](https://github.com/janl/mustache.js) (MIT
licensed).  These permissive licences mean you can use and build upon
`sd.js` without concern for royalties.

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

GNU Make, node.js and yarn are required to build `sd.js`, as are some
standard unix utilities.  The build should work on Windows with yarn.
Once those are installed on your system, you can simply run `make`
(which simply ensures `yarn install` has run and wraps `yarn build`)
to build the library for node and the browser:

```bash
[bpowers@vyse sd.js]$ make
  YARN
yarn install v1.1.0
[1/5] Validating package.json...
[2/5] Resolving packages...
success Already up-to-date.
Done in 0.36s.
  YARN  sd.js
yarn run v1.1.0
$ npm run build

build/sd.js → sd.js...
created sd.js in 1.6s
Done in 7.35s.
```

Alternatively, you can also use `pnpm` to install your dependencies with `pnpm i` (assuming `pnpm` is installed globally using `npm i -g pnpm`), and run `npm run build` to build the output.

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
  RTEST test/test-models/tests/eval_order/eval_order.xmile
  RTEST test/test-models/tests/comparisons/comparisons.xmile
  RTEST test/test-models/tests/builtin_min/builtin_min.xmile
  RTEST test/test-models/tests/builtin_max/builtin_max.xmile
  RTEST test/test-models/samples/teacup/teacup.xmile
  RTEST test/test-models/samples/teacup/teacup_w_diagram.xmile
  RTEST test/test-models/samples/bpowers-hares_and_lynxes_modules/model.xmile
  RTEST test/test-models/samples/SIR/SIR.xmile
```

The standalone sd.js library for use in the browser is available at
`sd.js` and includes all required dependencies (Snap.svg and
Mustache).  For use under node, `require('sd.js')` to simply use the
CommonJS modules built in the `lib/` directory from the original
TypeScript sources.

TODO
----

- ability to save XMILE docs
- ignore dt 'reciprocal' on v10 and < v1.1b2 STELLA models
- intersection of arc w/ rectangle for takeoff from stock
- intersection of arc w/ rounded-rect for takeoff from module
- logging framework

Vensim TODO
-----------

- parse equations - should be pretty similar to XMILE, except logical
  ops are `:NOT:`, `:OR:`, etc.
- determine types (stocks and flows aren't explicitly defined as
  such. Stocks can be determined by use of the `INTEG` function, and
  flows are variables that are referenced inside of `INTEG` functions.
- read display section
  - read style
  - convert elements to XMILE display concepts.


Arrays TODO
-----------

- diagram changes (minimal)
- figure out if it makes sense to do single-dimensional first, or multi-
  dimensional from the start
- parser:
  - array reference/slicing
  - transpose operator
- semantic analysis/validation:
  - validate indexing
  - validate slicing
  - transpose using dimension names
  - transpose using positions
  - array slicing (`A[1, *]`)
- optimization?
  - the simple thing to do is have a nest of for loops for each individual
    variable.  This is simple, I worry it will be slow for large models (which
    are very common users of arrays).  If we're doing operations on multiple
    variables with the same dimensions in a row, we can merge them into a
    single loop.  This is straightforward logically, but there is no
    optimization framework in place yet, so that would need to be added.
- codegen:
  - apply-to-all equations
    - nested for loop
  - non-A2A equations
  - non-A2A graphical functions
  - array slicing (`A[1, *]`)
  - transpose using dimension names
  - transpose using positions
- runtime:
  - know about defined dimensions + their subscripts
  - allocate correct amount of space for arrayed variables
  - array builtins: `MIN`, `MEAN`, `MAX`, `RANK`, `SIZE`, `STDDEV`, `SUM`.
  - be able to enumerate all subscripted values for CSV output
  - be able to return results for `arrayed_variable[int_or_named_dimension]`
  - right now, the runtime is pretty dead-simple.  Every builtin
    function expects one or more numbers as input.  With the array
    builtins, this is no longer the case.
    - index into arrays with non-constant offsets:
      `constants[INT(RANDOM(1, SIZE(foods)))]`
    - create slices of arrays: `SUM(array[chosen_dim, *])`, where
      `chosen_dim` is an auxiliary variable.
    - this means runtime type checking, and I think runtime memory
      allocation (right now memory is allocated once, in one chunk, when a
      simulation is created, which is fast and optimial).
