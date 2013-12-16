// Copyright 2013 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

define([], function() {
    'use strict';

    function isObject(v) {
        return typeof v === 'object';
    }

    function parseText(val) {
        val = val.trim();
        if (/^\s*$/.test(val))
            return null;
        if (/^(?:true|false)$/i.test(val))
            return val.toLowerCase() === 'true';
        if (isFinite(val))
            return parseFloat(val);
        return val;
    }

    function JXONBuild(parent) {
        var result = true;
        var collectedText = '';
        var len = 0, i = 0;
        var attrib, node, prop, content;

        if (parent.hasAttributes()) {
            result = {};
            for (len = 0; len < parent.attributes.length; len++) {
                attrib = parent.attributes.item(len);
                result['@' + attrib.name.toLowerCase()] = parseText(attrib.value);
            }
        }
        if (parent.hasChildNodes()) {
            for (i = 0; i < parent.childNodes.length; i++) {
                node = parent.childNodes.item(i);
                switch (node.nodeType) {
                case 4: // CData
                    collectedText += node.nodeValue;
                    break;
                case 3: // Text
                    collectedText += node.nodeValue.trim();
                    break;
                case 1: // Element
                    if (!len) {
                        result = {};
                        len++;
                    }
                    prop = node.nodeName.toLowerCase();
                    content = JXONBuild(node);
                    if (result.hasOwnProperty(prop)) {
                        if (!(result[prop] instanceof Array))
                            result[prop] = [result[prop]];
                        result[prop].push(content);
                    } else {
                        result[prop] = content;
                    }
                    break;
                }
            }
        }
        if (collectedText) {
            if (len)
                result.keyValue = collectedText;
            else
                result = parseText(collectedText);
        }
        return result;
    };
    function JXONUnbuild(obj) {

    };

    return {
        'JXON': {
            'build':   JXONBuild,
            'unbuild': JXONUnbuild,
        },
    };
});
