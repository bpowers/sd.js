#!/usr/bin/env python2

import json

PREAMBLE = 'build-rt/runtime.js'
EPILOGUE = 'build-rt/epilogue.js'
DRAW_CSS = 'runtime/draw.css'
DRAW_WRAP = '''<defs><style>
/* <![CDATA[ */
%s
/* ]]> */
</style></defs>
'''

WRAPPER = '''// Copyright 2015 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

'use strict';

/* tslint:disable: max-line-length */

export const preamble = %s;

export const epilogue = %s;

export const drawCSS = %s;'''

def slurp(file_name):
    with open(file_name, 'r') as f:
        return f.read().strip()

def main():
    preamble = slurp(PREAMBLE)
    epilogue = slurp(EPILOGUE)
    draw_css = DRAW_WRAP % (slurp(DRAW_CSS),)
    print WRAPPER % (json.dumps(preamble),
                     json.dumps(epilogue),
                     json.dumps(draw_css))

if __name__ == '__main__':
    exit(main())
