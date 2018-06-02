// Copyright 2015 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

import * as type from './type';

export function exists<T>(object: T | null): T {
  if (object === null) throw 'expected non-null object';
  return object;
}

export function defined<T>(object: T | undefined): T {
  if (object === undefined) throw 'expected non-undefined object';
  return object;
}

export function titleCase(str: string): string {
  return str.replace(/(?:^|\s)\w/g, function(match: string): string {
    return match.toUpperCase();
  });
}

/// dName converts a string into the format the user
/// expects to see on a diagram.
export function dName(s: string): string {
  return s.replace(/\\n/g, '\n').replace(/_/g, ' ');
}

// swap the values at 2 indexes in the specified array, used for
// quicksort.
function swap(array: any[], a: number, b: number): void {
  let tmp = array[a];
  array[a] = array[b];
  array[b] = tmp;
}

// partition used in quicksort, based off pseudocode
// on wikipedia
export function partition(
  array: any[],
  l: number,
  r: number,
  p: number,
): number {
  let pValue = array[p];
  // move the pivot to the end
  swap(array, p, r);
  let store = l;
  for (let i = l; i < r; ++i) {
    if (array[i].lessThan(pValue)) {
      swap(array, i, store);
      store += 1;
    }
  }
  // move pivot to final location.
  swap(array, store, r);
  return store;
}

// partition used in quicksort for numbers, based off
// pseudocode on wikipedia
/*
  function partitionNum(array, l, r, p) {
  let pValue = array[p];
  // move the pivot to the end
  swap(array, p, r);
  let i, store = l;
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
*/

/**
 *  Quicksort implementation, sorts in place.
 */
export function sort(
  array: any[],
  l = 0,
  r = array.length - 1,
  part = partition,
): void {
  if (l >= r) return;

  let pivot = Math.floor(l + (r - l) / 2);
  let newPivot = part(array, l, r, pivot);
  sort(array, l, newPivot - 1, part);
  sort(array, newPivot + 1, r, part);
}

/**
 * Interpolates the y-value of the given index in the table.  If
 * the index is outside the range of the table, the minimum or
 * maximum value in the table is returned.
 *
 * @param table An object with x and y arrays.
 * @param index The requested index into the given table.
 * @return The y-value of the given index.
 */
export function lookup(table: any, index: number): number {
  const size = table.x.length;
  if (size === 0) return NaN;

  const x = table.x;
  const y = table.y;

  if (index <= x[0]) {
    return y[0];
  } else if (index >= x[size - 1]) {
    return y[size - 1];
  }

  // binary search seems to be the most appropriate choice here.
  let low = 0;
  let high = size;
  let mid: number;
  while (low < high) {
    mid = Math.floor(low + (high - low) / 2);
    if (x[mid] < index) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  let i = low;
  if (x[i] === index) {
    return y[i];
  } else {
    // slope = deltaY/deltaX
    const slope = (y[i] - y[i - 1]) / (x[i] - x[i - 1]);
    // y = m*x + b
    return (index - x[i - 1]) * slope + y[i - 1];
  }
}

/**
 *  Returns the minimum of either of the arguments
 */
export function min(a: number, b: number): number {
  return a < b ? a : b;
}

/**
 * numArr returns a new array, composed of the result of calling
 * parseFloat on every item in arr.
 */
export function numArr(arr: any[]): number[] {
  let result: number[] = [];
  for (let i = 0; i < arr.length; i++) {
    result.push(parseFloat(arr[i]));
  }
  return result;
}

export function floatAttr(o: any, n: any): number {
  return parseFloat(o.getAttribute(n));
}

// wrapper/re-implementation of querySelector that works under
// Node with xmldom.
export function qs(e: any, s: any): any {
  if (e.querySelector) return e.querySelector(s);

  let selectors = s.split('>');
  let curr = e;
  let n: any;

  outer: for (let i = 0; curr && i < selectors.length; i++) {
    for (let j = 0; j < curr.childNodes.length; j++) {
      n = curr.childNodes[j];
      if (!n.tagName) continue;
      if (n.tagName.toLowerCase() === selectors[i].toLowerCase()) {
        curr = n;
        continue outer;
      }
    }
    curr = null;
  }
  return curr;
}

export function querySelectorInner(e: any, selectors: any): any {
  let sel = selectors[0];
  let rest = selectors.slice(1);
  let result: any[] = [];
  let child: any;
  for (const child of e.childNodes) {
    if (child.tagName && child.tagName.toLowerCase() === sel) {
      if (rest.length) {
        result = result.concat(querySelectorInner(child, rest));
      } else {
        result.push(child);
      }
    }
  }
  return result;
}

// wrapper/re-implementation of querySelectorAll that works under
// Node with xmldom
export function qsa(e: any, s: any): any {
  if (e.querySelectorAll) return e.querySelectorAll(s);
  let selectors = s.split('>').map(function(sel: string): string {
    return sel.toLowerCase();
  });

  return querySelectorInner(e, selectors);
}

export function isNaN(n: number): boolean {
  return n !== n;
}
