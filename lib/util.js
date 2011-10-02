// Copyright 2011 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

define([], function() {
    var util = {};

    /**
       Turns the array of arguments into a hashset.  Bascially an object
       like:

       {arg1: true, arg2: true, ...}
    */
    util.set = function() {
        var result = {};
        var i;
        for (i = 0; i < arguments.length; ++i)
            result[arguments[i]] = true;
        return result;
    }

    // swap the values at 2 indexes in the specified array, used for
    // quicksort.
    const swap = function(array, a, b) {
        const tmp = array[a];
        array[a] = array[b];
        array[b] = tmp;
    }
    // partition used in quicksort, based off pseudocode on wikipedia
    const partition = function(array, l, r, p) {
        const pValue = array[p];
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
    }

    /**
       Quicksort implementation, sorts in place.
    */
    util.sort = function quicksort(array, l, r) {
        if (l === undefined) {
            l = 0;
            r = array.length - 1;
        }

        if (l >= r)
            return;

        const pivot = Math.floor(l + (r - l)/2);
        const newPivot = partition(array, l, r, pivot);
        quicksort(array, l, newPivot - 1);
        quicksort(array, newPivot + 1, r);
    }

    /**
       Interpolates the y-value of the given index in the table.  If
       the index is outside the range of the table, the minimum or
       maximum value in the table is returned.

       @param table An object with x and y arrays.
       @param index The requested index into the given table.
       @return The y-value of the given index.
    */
    util.lookup = function(table, index) {
        const size = table.x.length;
        if (size === 0)
            return NaN;

        const x = table.x;
        const y = table.y;

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
            const slope = (y[i] - y[i-1]) / (x[i] - x[i-1]);
            // y = m*x + b
            return (index - x[i-1])*slope + y[i-1];
        }
    }

    /**
       Returns the minimum of either of the arguments
    */
    util.min = function(a, b) {
        return a < b ? a : b;
    };

    return util;
});
