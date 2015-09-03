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

behavior
--------

Can cause `non_negative` to propogate, but can't turn that off.
i.e. you can't specify `non_negative` and then have a single stock
able to go negative, while you can do the inverse.

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

GF
--

I am just understanding the idea of a 'gf' outside of a variable, and
I don't think I like it.  It seems much cleaner to me to always have a
GF as an attribute of a variable, but allow a variable with a GF but
no equation to be considered valid.

Also - the begining of the Doc mentions accessing GFs with square
bracket notation, but later on with ()?

`FIXME`: need to unify the concepts of XMILE GF, standalone GF, and
Table in my stuff.

Numbers
-------

`FIXME`: need to restrict exponent to an integer


Views
-----

`page_width` + `page_height` - "The width of a printed page".  In what
units?  This either shouldn't be required, or needs to be much more
specified.

`page_sequence`...

- `lable_angle` - counter-clockwise? `This is always specified in conjunction with label_side` -- how is that useful?  Isn't it either/or?

There are 2 possible formattings to use for the display of an entity
name, that specified in the 'name' attribute of the
`<aux>`/`<stock>`/`<flow>` tag under the `<view>` section, or the
'name' attribute of the tag under the `model` section.  I am choosing
to use the formatting under the model section.
