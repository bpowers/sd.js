// Copyright 2015 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.
'use strict';
function parseText(val) {
    'use strict';
    val = val.trim();
    if (/^\s*$/.test(val))
        return null;
    if (/^(?:true|false)$/i.test(val))
        return val.toLowerCase() === 'true';
    if (isFinite(val))
        return parseFloat(val);
    return val;
}
function build(parent) {
    'use strict';
    var hasAttrs = false;
    var result = true;
    var collectedText = '';
    if (parent.hasAttributes()) {
        result = {};
        hasAttrs = true;
        for (var len = 0; len < parent.attributes.length; len++) {
            var attrib = parent.attributes.item(len);
            result['@' + attrib.name.toLowerCase()] = parseText(attrib.value);
        }
    }
    if (parent.hasChildNodes()) {
        for (var i = 0; i < parent.childNodes.length; i++) {
            var node = parent.childNodes.item(i);
            switch (node.nodeType) {
                case 4:
                    collectedText += node.nodeValue;
                    break;
                case 3:
                    collectedText += node.nodeValue.trim();
                    break;
                case 1:
                    if (!hasAttrs) {
                        result = {};
                        hasAttrs = true;
                    }
                    var prop = node.nodeName.toLowerCase();
                    var content = build(node);
                    if (result.hasOwnProperty(prop)) {
                        if (!(result[prop] instanceof Array))
                            result[prop] = [result[prop]];
                        result[prop].push(content);
                    }
                    else {
                        result[prop] = content;
                    }
                    break;
                default:
                    console.log('unknown nodeType: ' + node.nodeType);
            }
        }
    }
    if (collectedText) {
        if (hasAttrs) {
            result.keyValue = collectedText;
        }
        else {
            result = parseText(collectedText);
        }
    }
    return result;
}
exports.build = build;
function unbuild() {
    'use strict';
    return;
}
exports.unbuild = unbuild;
