// Copyright 2013 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

define(['./common', './project', './model'], function(common, project, model) {
    'use strict';

    var sd = {};

    sd.Project = project.Project;
    sd.Model = model.Model;
    /**
       Attempts to parse the given xml string describing an xmile
       model into a Model object, returning the Model on success, or
       null on error.  On error, a string describing what went wrong
       can be obtained by calling sd.error().

       @param xmlString A string containing a xmile model.
       @return A valid Model object on success, or null on error.
    */
    sd.newModel = function(xmlDoc) {
        var ctx = new sd.Project(xmlDoc);
        if (ctx.valid)
            return ctx.model();
        return null;
    };

    sd.load = function(url, cb, errCb) {
        var req = new XMLHttpRequest();
        req.onreadystatechange = function() {
            if (req.readyState !== 4)
                return;
            if (req.status >= 200 && req.status < 300) {
                var xml = req.responseXML;
                if (!xml)
                    xml = (new DOMParser()).parseFromString(req.responseText, 'application/xml');
                var mdl = sd.newModel(xml);
                cb(mdl);
            } else if (errCb) {
                errCb(req);
            }
        };
        req.open('GET', url, true);
        req.send();
    };

    sd.errors = common.errors;

    /**
       If newModel or a major operation (like creating a new sim from
       a model) fails, call sd.error() to get a string describing the
       error.  You can compare this to specific errors in sd.errors,
       or simply pass the error string to the user.  If an error
       hasn't occured, or if no information is available, error() will
       return null.

       @return A string error message, or null if one isn't available.
    */
    sd.error = function() {
        return common.err;
    };

    return sd;
});
