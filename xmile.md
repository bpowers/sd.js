XMILE spec implementation notes
===============================

The [XMILE
spec](http://docs.oasis-open.org/xmile/xmile/v1.0/cos01/xmile-v1.0-cos01.html)
is a large ~80 page document containing a wealth of specifications for
compatability with isee software.  This document contains notes on
where [sd.js](https://github.com/sdlabs/sd.js) and
[libsd](https://github.com/sdlabs/libsd) diverge from the spec.

[Includes](http://docs.oasis-open.org/xmile/xmile/v1.0/cos01/xmile-v1.0-cos01.html#_Toc426543489)
--------

Includes will eventually be implemented.  There are open questions as
to how includes interact with web-based tools.  CORS support should
probably be mandated to allow in-browser cross-origin requests for
XMILE files.

Macros
------

Macros will almost definitely not be implemented.  Use Modules.

Numbers
-------

`FIXME`: need to restrict exponent to an integer
