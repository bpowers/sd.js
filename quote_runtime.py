#!/usr/bin/env python

import json

PREAMBLE = 'lib/runtime_ugly.js'
EPILOGUE = 'lib/epilogue_src.js'
DRAW_CSS = 'lib/draw.css'
DRAW_WRAP = '''<defs><style>
/* <![CDATA[ */
%s
/* ]]> */
</style></defs>
'''

WRAPPER = '''// Copyright 2013 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

define([], function() {
    'use strict';
    var runtime = {};
    // unquoted source in '%s'
    runtime.preamble = %s;
    // unquoted source in '%s'
    runtime.epilogue = %s;
    // unquoted source in '%s'
    runtime.drawCSS = %s;

    return runtime;
});
'''

def slurp(file_name):
    with open(file_name, 'r') as f:
        return f.read().strip()

def main():
    preamble = slurp(PREAMBLE)
    epilogue = slurp(EPILOGUE)
    draw_css = DRAW_WRAP % (slurp(DRAW_CSS),)
    print WRAPPER % (PREAMBLE, json.dumps(preamble),
                     EPILOGUE, json.dumps(epilogue),
                     DRAW_CSS, json.dumps(draw_css))

if __name__ == '__main__':
    exit(main())
