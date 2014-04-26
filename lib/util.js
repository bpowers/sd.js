// Copyright 2013 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

define([], function() {
    'use strict';

    var util = {};

    util.titleCase = function titleCase(str) {
        return str.replace(/(?:^|\s)\w/g, function(match) {
            return match.toUpperCase();
        });
    };

    /// dName converts a string into the format the user expects to
    /// see on a diagram.
    util.dName = function dName(s) {
        return s.replace(/\\n/g, '\n').replace(/_/g, ' ');
    };

    /// eName converts a string into the format used internally in
    /// the engine and drawing code with underscores.
    util.eName = function eName(s) {
        if (typeof s !== 'string')
            return '';
        return s.replace(/\\n/g, '_').replace(/\s/g, '_').toLowerCase();
    };

    /**
       Extracts the <simspecs> information into nice, usable, validated
       object.

       @param simspecs DOM node
       @return A validated specs object on success, null on failure
    */
    util.normalizeTimespec = function normalizeTimespec(specs) {
        if (!specs)
            return;
        if (!specs.savestep)
            specs.savestep = specs.dt;
        if (!specs['@method'])
            specs['@method'] = 'euler';
    };

    /**
       Turns the array of arguments into a hashset.  Bascially an object
       like:

       {arg1: true, arg2: true, ...}
    */
    util.set = function set() {
        var result = {};
        var i;
        for (i = 0; i < arguments.length; ++i)
            result[arguments[i]] = true;
        return result;
    };

    // swap the values at 2 indexes in the specified array, used for
    // quicksort.
    var swap = function swap(array, a, b) {
        var tmp = array[a];
        array[a] = array[b];
        array[b] = tmp;
    };

    // partition used in quicksort, based off pseudocode on wikipedia
    var partition = function partition(array, l, r, p) {
        var pValue = array[p];
        // move the pivot to the end
        swap(array, p, r);
        var i, store = l;
        for (i = l; i < r; ++i) {
            if (array[i].lessThan(pValue)) {
                swap(array, i, store);
                store += 1;
            }
        }
        // move pivot to final location.
        swap(array, store, r);
        return store;
    };

    // partition used in quicksort for numbers, based off pseudocode
    // on wikipedia
    util.partitionNum = function partitionNum(array, l, r, p) {
        var pValue = array[p];
        // move the pivot to the end
        swap(array, p, r);
        var i, store = l;
        for (i = l; i < r; ++i) {
            if (array[i] < pValue) {
                swap(array, i, store);
                store += 1;
            }
        }
        // move pivot to final location.
        swap(array, store, r);
        return store;
    };

    /**
       Quicksort implementation, sorts in place.
    */
    util.sort = function sort(array, l, r, part) {
        if (l === undefined) {
            l = 0;
            r = array.length - 1;
        }
        if (!part) {
            part = partition;
        }

        if (l >= r)
            return;

        var pivot = Math.floor(l + (r - l)/2);
        var newPivot = part(array, l, r, pivot);
        sort(array, l, newPivot - 1, part);
        sort(array, newPivot + 1, r, part);
    };

    /**
       Interpolates the y-value of the given index in the table.  If
       the index is outside the range of the table, the minimum or
       maximum value in the table is returned.

       @param table An object with x and y arrays.
       @param index The requested index into the given table.
       @return The y-value of the given index.
    */
    util.lookup = function lookup(table, index) {
        var size = table.x.length;
        if (size === 0)
            return NaN;

        var x = table.x;
        var y = table.y;

        if (index <= x[0])
            return y[0];
        else if (index >= x[size - 1])
            return y[size - 1];

        // binary search seems to be the most appropriate choice here.
        var low = 0;
        var high = size;
        var mid;
        while (low < high) {
            mid = Math.floor(low + (high - low)/2);
            if (x[mid] < index) {
                low = mid + 1;
            } else {
                high = mid;
            }
        }

        var i = low;
        if (x[i] === index) {
            return y[i];
        } else {
            // slope = deltaY/deltaX
            var slope = (y[i] - y[i-1]) / (x[i] - x[i-1]);
            // y = m*x + b
            return (index - x[i-1])*slope + y[i-1];
        }
    };

    /**
       Returns the minimum of either of the arguments
    */
    util.min = function min(a, b) {
        return a < b ? a : b;
    };

    /**
       numArr returns a new array, composed of the result of calling
       parseFloat on every item in arr.
    */
    util.numArr = function numArr(arr) {
        var result = [];
        var i;
        for (i = 0; i < arr.length; i++) {
            result.push(parseFloat(arr[i]));
        }
        return result;
    };

    util.floatAttr = function floatAttr(o, n) {
        return parseFloat(o.getAttribute(n));
    };

    // wrapper/re-implementation of querySelector that works under
    // Node with xmldom.
    util.qs = function qs(e, s) {
        if (e.querySelector)
            return e.querySelector(s);

        var selectors = s.split('>');
        var curr = e;
        var i, j, n;

        outer:
        for (i = 0; curr && i < selectors.length; i++) {
            for (j = 0; j < curr.childNodes.length; j++) {
                n = curr.childNodes[j];
                if (!n.tagName)
                    continue;
                if (n.tagName.toLowerCase() === selectors[i].toLowerCase()) {
                    curr = n;
                    continue outer;
                }
            }
            curr = null;
        }
        return curr;
    };

    function querySelectorInner(e, selectors) {
        var sel = selectors[0];
        var rest = selectors.slice(1);
        var result = [];
        var child;
        var i;
        for (i in e.childNodes) {
            child = e.childNodes[i];
            if (child.tagName && child.tagName.toLowerCase() === sel) {
                if (rest.length)
                    result = result.concat(querySelectorInner(child, rest));
                else
                    result.push(child);
            }
        }
        return result;
    }

    // wrapper/re-implementation of querySelectorAll that works under
    // Node with xmldom
    util.qsa = function qsa(e, s) {
        if (e.querySelectorAll)
            return e.querySelectorAll(s);
        var selectors = s.split('>').map(function(sel) {
            return sel.toLowerCase();
        });

        return querySelectorInner(e, selectors);
    };

    util.isNaN = function isNaN(n) {
        return n !== n;
    };

    return util;
});
