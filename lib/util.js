// Copyright 2015 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.
'use strict';
function titleCase(str) {
    'use strict';
    return str.replace(/(?:^|\s)\w/g, function (match) {
        return match.toUpperCase();
    });
}
exports.titleCase = titleCase;
;
function dName(s) {
    'use strict';
    return s.replace(/\\n/g, '\n').replace(/_/g, ' ');
}
exports.dName = dName;
;
function eName(s) {
    'use strict';
    if (typeof s !== 'string')
        return '';
    return s.replace(/\\n/g, '_').replace(/\s/g, '_').toLowerCase();
}
exports.eName = eName;
;
function set() {
    'use strict';
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i - 0] = arguments[_i];
    }
    var result = {};
    for (var i = 0; i < args.length; ++i)
        result[args[i]] = true;
    return result;
}
exports.set = set;
;
function swap(array, a, b) {
    'use strict';
    var tmp = array[a];
    array[a] = array[b];
    array[b] = tmp;
}
;
function partition(array, l, r, p) {
    'use strict';
    var pValue = array[p];
    swap(array, p, r);
    var store = l;
    for (var i = l; i < r; ++i) {
        if (array[i].lessThan(pValue)) {
            swap(array, i, store);
            store += 1;
        }
    }
    swap(array, store, r);
    return store;
}
exports.partition = partition;
;
function sort(array, l, r, part) {
    'use strict';
    if (l === void 0) { l = 0; }
    if (r === void 0) { r = array.length - 1; }
    if (part === void 0) { part = partition; }
    if (l >= r)
        return;
    var pivot = Math.floor(l + (r - l) / 2);
    var newPivot = part(array, l, r, pivot);
    sort(array, l, newPivot - 1, part);
    sort(array, newPivot + 1, r, part);
}
exports.sort = sort;
;
function lookup(table, index) {
    'use strict';
    var size = table.x.length;
    if (size === 0)
        return NaN;
    var x = table.x;
    var y = table.y;
    if (index <= x[0]) {
        return y[0];
    }
    else if (index >= x[size - 1]) {
        return y[size - 1];
    }
    var low = 0;
    var high = size;
    var mid;
    while (low < high) {
        mid = Math.floor(low + (high - low) / 2);
        if (x[mid] < index) {
            low = mid + 1;
        }
        else {
            high = mid;
        }
    }
    var i = low;
    if (x[i] === index) {
        return y[i];
    }
    else {
        var slope = (y[i] - y[i - 1]) / (x[i] - x[i - 1]);
        return (index - x[i - 1]) * slope + y[i - 1];
    }
}
exports.lookup = lookup;
;
function min(a, b) {
    'use strict';
    return a < b ? a : b;
}
exports.min = min;
;
function numArr(arr) {
    'use strict';
    var result = [];
    for (var i = 0; i < arr.length; i++) {
        result.push(parseFloat(arr[i]));
    }
    return result;
}
exports.numArr = numArr;
;
function floatAttr(o, n) {
    'use strict';
    return parseFloat(o.getAttribute(n));
}
exports.floatAttr = floatAttr;
;
function qs(e, s) {
    'use strict';
    if (e.querySelector)
        return e.querySelector(s);
    var selectors = s.split('>');
    var curr = e;
    var n;
    outer: for (var i = 0; curr && i < selectors.length; i++) {
        for (var j = 0; j < curr.childNodes.length; j++) {
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
}
exports.qs = qs;
;
function querySelectorInner(e, selectors) {
    'use strict';
    var sel = selectors[0];
    var rest = selectors.slice(1);
    var result = [];
    var child;
    for (var i in e.childNodes) {
        if (!e.hasOwnProperty(i))
            continue;
        child = e.childNodes[i];
        if (child.tagName && child.tagName.toLowerCase() === sel) {
            if (rest.length) {
                result = result.concat(querySelectorInner(child, rest));
            }
            else {
                result.push(child);
            }
        }
    }
    return result;
}
exports.querySelectorInner = querySelectorInner;
function qsa(e, s) {
    'use strict';
    if (e.querySelectorAll)
        return e.querySelectorAll(s);
    var selectors = s.split('>').map(function (sel) {
        return sel.toLowerCase();
    });
    return querySelectorInner(e, selectors);
}
exports.qsa = qsa;
;
function isNaN(n) {
    'use strict';
    return n !== n;
}
exports.isNaN = isNaN;
function camelCase(s) {
    'use strict';
    var i = 0;
    while ((i = s.indexOf('_')) >= 0 && i < s.length - 1) {
        s = s.slice(0, i) + s.slice(i + 1, i + 2).toUpperCase() + s.slice(i + 2);
    }
    return s;
}
exports.camelCase = camelCase;
function i32(n) {
    'use strict';
    return n | 0;
}
exports.i32 = i32;
