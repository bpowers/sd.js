#!/usr/bin/env python

import json

PREAMBLE = 'lib/runtime_ugly.js'
EPILOGUE = 'lib/epilogue_src.js'
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

    return runtime;
});
'''

def slurp(file_name):
    with open(file_name, 'r') as f:
        return f.read().strip()

def main():
    preamble = slurp(PREAMBLE)
    epilogue = slurp(EPILOGUE)
    print WRAPPER % (PREAMBLE, json.dumps(preamble),
                     EPILOGUE, json.dumps(epilogue))

if __name__ == '__main__':
    exit(main())
