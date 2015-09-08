Sketch information section
==========================

What follows are notes about the Sketch information section of
[Vensim](http://vensim.com/) `.mdl` files.

The definitive reference is available online!

- [Sketch format](https://www.vensim.com/documentation/index.html?ref_sketch_format.htm)
- [Sketch objects](https://www.vensim.com/documentation/index.html?24305.htm)

Sketch version, name and styles
-------------------------------

The sketch information section begins with:

`
\\\---/// Sketch information - do not modify anything except names
V300  Do not put anything below this section - it will be ignored
*View 1
$192-192-192,0,Times New Roman|12||0-0-0|0-0-0|0-0-255|-1--1--1|-1--1--1|192,192,100,0
`

But the [Sketch
format](https://www.vensim.com/documentation/index.html?ref_sketch_format.htm)
documentation makes sure to note that the `\\\` is what denotes the
sketch information - I think between the `\\\` and the end-of-line
should just be discarded.

The second line is the version code - `V300` is used for Vensim 3, 4,
5, and 6.

The third line names the view - `View 1` in this case.

The fourth line is the default colors to use in that view.  The
nitty-gritty details are on
[here](https://www.vensim.com/documentation/index.html?ref_sketch_format.htm). The
color format seems to be `$R-$G-$B` where each variable is an `unsigned char`.

Sketch objects
--------------

Sketch objects are a comma-separated list of attributes that differ in
meaning depending on type.

Arrows look like:

    1,3,2,1,1,0,0,0,0,64,0,-1--1--1,,1|(278,61)|

With the attributes being:

    1,id,from,to,shape,hid,pol,thick,hasf,dtype,res,color,font,np|plist

Variables (stocks, flows, and aux) look like:

    10,1,var,53,36,35,19,8,3,0,0,0,0,0,0

With the attributes being:

    n,id,name,x,y,w,h,sh,bits,hid,hasf,tpos,bw,nav1,nav2,box,fill,font

Sketch object types
-------------------

n  | types
---|------
10 | Variables
11 | Valves
12 | Comments
30 | Bitmaps
31 | Metafiles

Clouds
------

Clouds are comment objects (type `12`) with the index `48` in the 3rd
(`name`) field.

