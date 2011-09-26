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
            if (array[i] < pValue) {
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

    return util;
});