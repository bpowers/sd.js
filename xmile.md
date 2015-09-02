XMILE spec implementation notes
===============================

The [XMILE
spec](http://docs.oasis-open.org/xmile/xmile/v1.0/cos01/xmile-v1.0-cos01.html)
is a large ~80 page document containing a wealth of specifications for
compatability with isee software.  This document contains notes on
where [sd.js](https://github.com/sdlabs/sd.js) and
[libsd](https://github.com/sdlabs/libsd) diverge from the spec.

Header
------

- 'model caption' should be removed.
- the mix of plural vs. singular is weird and should be standardized.

[SimSpec](http://docs.oasis-open.org/xmile/xmile/v1.0/cos01/xmile-v1.0-cos01.html#_Toc426543481)
---------

A key feature of Vensim is savestep.  This is useful for many
purposes, but not mentioned in the spec.

[Includes](http://docs.oasis-open.org/xmile/xmile/v1.0/cos01/xmile-v1.0-cos01.html#_Toc426543489)
--------

Includes will eventually be implemented.  There are open questions as
to how includes interact with web-based tools.  CORS support should
probably be mandated to allow in-browser cross-origin requests for
XMILE files.

4 Model
-------

- doc: `If in plain text, it must use XMILE identifier escape
  sequences for non-printable characters (i.e., \n for newline, \t for
  tab, and, necessarily, \\ for backslash), rather than a hexadecimal
  code such as &#x0A. If in HTML, it must include the proper HTML
  header. Note this is true for all documentation and user-specified
  text fields in a XMILE file (i.e., including those in display
  objects defined in Chapters 5 and 6).`
  - HTML is not a subset of XML, so you can't embed an HTML DOM inside
    an XML DOM.

Variables
---------

- flow concepts.  No documentation, remove them.

Macros
------

Macros will almost definitely not be implemented.  Use Modules.

Identifiers
-----------

The formal spec doesn't deal with dotted identifiers.  Is
`Sub_Model.Output` a single identifier?  What about
`.Root_Model_Input`?

Numbers
-------

`FIXME`: need to restrict exponent to an integer
