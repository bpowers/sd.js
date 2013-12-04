#!/usr/bin/env python

import json

RUNTIME = 'lib/runtime_src.js'
WRAPPER = '''// Copyright 2013 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

define([], function() {
    var runtime = {};
    // quoted from '%s' file
    runtime.preamble = %s;

    return runtime;
});
'''

def slurp(file_name):
    with open(file_name, 'r') as f:
        return f.read().strip()

def main():
    src = slurp(RUNTIME)
    print WRAPPER % (RUNTIME, json.dumps(src))

if __name__ == '__main__':
    exit(main())
