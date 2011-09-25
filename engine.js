// Copyright 2011 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

// if we're running under node this will be defined.  Otherwise, just
// use a simple object.
if (typeof exports === 'undefined')
    exports = {};
boosd = exports;

ERR_VERSION  = exports.ERR_VERSION  = "bad xml or unknown smile version";
ERR_BAD_TIME = exports.ERR_BAD_TIME = "bad time (control) data";
exports.err = null;

const requiredSpecs = ['start', 'stop', 'dt'];


boosd.builtins = {
    'max': function(a, b) {
        return a > b ? a : b;
    }
};


/**
   Converts a string of xml data represnting an xmile model into a
   javascript object.  The resulting javascript object can give
   information about the model (what variables does it have, what are
   their equations, etc), and can also create simulation objects.
   Simulation objects can be parametarized and run (simulated),
   generating time-series data on all of the variables.
*/
function Model(xmlString) {
    exports.err = null;

    const model = {};
    const xmile = $(xmlString);
    if (!xmile || xmile.find('header smile').attr('version') != "1.0") {
        exports.err = ERR_VERSION;
	this.valid = false;
        return;
    }
    model.name = xmile.find('header name').text() || 'boosd model';

    // get our time info: start-time, end-time, dt, etc.
    model.ctrl = parseControlInfo(xmile.children('simspecs'));
    if (!model.ctrl) {
	this.valid = false;
        return;
    }

    model.macros = parseMacros(xmile.children('macro'));
    if (!model.macros) {
	this.valid = false;
        return null;
    }

    model.vars = this._parseVars(xmile.children('model').children());

    this.valid = true
    return;
}

exports.newModel = function(xmlString) {
    const model = new Model(xmlString);

    return model.valid ? model : null;
}

/**
   Extracts the <simspecs> information into nice, usable, validated
   object. Sets exports.err on error.

   @param simspecs A JQuery object wrapped around the simspecs dom node
   @return A validated control object on success, null on failure
*/
const parseControlInfo = function(simspecs) {
    var error;

    // pull the start, stop and dt (requiredSpecs) info out of the DOM
    // into the ctrl object
    var ctrl = {};
    simspecs.children().map(function() {
        var name = $(this).get(0).tagName.toLowerCase();
        var val = parseFloat($(this).text());
        ctrl[name] = val;
    });

    // now validate that all of the requiredSpecs are there & were
    // converted to numbers correctly
    err = requiredSpecs.reduce(function(acc, e) {
        if (!ctrl.hasOwnProperty(e) || isNaN(ctrl[e])) {
            console.log('simspecs missing ' + e);
            return true;
        }
        return acc;
    }, false);
    if (err) {
        exports.err = ERR_BAD_TIME;
        return null;
    }

    // finally pull out some of the supplimental info, like
    // integration method and time units
    ctrl.method = (simspecs.attr('method') || 'euler').toLowerCase();
    ctrl.units = (simspecs.attr('time_units') || 'unknown').toLowerCase();

    return ctrl;
}

/**
   Extracts all <macro>'s into a usable format.

   FIXME: I'm skipping macros for now, will come back to them after
   the rest of this stuff works.

   @param macros JQuery list of all the DOM's macros.
   @return A validated map of all the defined macros.
*/
parseMacros = function(macros) {
    if (macros.length === 0)
        return {}

    // FIXME: is it parm or param?
    paramSet = {}
    params = macros.children('parm').map(function() {
        const name = $(this).text();
        paramSet[name] = true;
        return name;
    });

    return {};
}

function varCompare(other) {
    return 0;
}

function stockCompare(other) {
    return 0;
}

function varDeps(other) {
    return [];
}

function stockDeps(other) {
    return [];
}

function Variable(name, type, eqn, inflows, outflows) {
    this.eqnOrig = eqn;
    eqn = eqn.toLowerCase();
    this.name = name;
    this.type = type;
    if (type === 'stock') {
	this.compare = stockCompare;
	this.deps = stockDeps;
	this.initial = eqn;
	this.inflows = inflows;
	this.outflows = outflows;
    } else {
	this.compare = varCompare;
	this.deps = varDeps;
	this.eqn = eqn;
    }
}
// returns a string of this variables initial equation. suitable for
// exec()'ing
Variable.prototype.initialEquation = function() {
    if (this.type === 'stock') {
	return this.initial;
    } else {
	return this.eqn;
    }
}
Variable.prototype.equation = function() {
    if (this.type === 'stock') {
	return '';
    } else {
	return this.eqn;
    }
}

const mapText = function(jQueryObj) {
    var list = []
    jQueryObj.map(function() {
	list.push($(this).text().trim().toLowerCase());
    });
    return list;
}

/**
   Validates & figures out all necessary variable information.
*/
Model.prototype._parseVars = function(varList) {

    const initials = []
    const stocks = []
    const flows = []
    const vars = {}

    varList.map(function() {
	const name     = $(this).attr('name').trim().toLowerCase();
	const type     = $(this).get(0).tagName;
	const eqn      = $(this).children('eqn').text().trim();
	const inflows  = mapText($(this).children('inflow'));
	const outflows = mapText($(this).children('outflow'));
	const v        = new Variable(name, type, eqn, inflows, outflows);

	// add the variable to the map of all vars, and also to the
	// particular lists it needs to be in for calculations.
	// Stocks go into both intials and stocks, because they both
	// have initial values & update their values after we
	// calculate all the flows and auxes.
	vars[name] = v;
	if (type === 'stock') {
	    initials.push(v);
	    stocks.push(v);
	} else {
	    flows.push(v);
	}
    });

    // now we promote constants from being calculated every time step
    // (with the flows) to being calculated once, with the other
    // initial values.

    // now we need to sort all of the 3 lists, to make sure all our
    // computations happen in the right order.
}

//=============================================================== scanner ==//

// the idea is to use the scanner (& an eventual parser) to validate
// the equations, but especially the macros

const reservedWords = {
    'if': true,
    'then': true,
    'else': true
};

const isWhitespace = function(ch) {
    return (ch === ' ') || (ch === '\n') || (ch === '\t') || (ch === '\r');
}
const isNumberStart = function(ch) {
    return /[\d\.]/.test(ch);
};
const isIdentifierStart = function(ch) {
    return /[\w_]/.test(ch);
};

function Token(str, type, startLoc, endLoc) {
    this.tok = str;
    this.type = type;
    this.startLoc = startLoc;
    this.endLoc = endLoc;
}

function SourceLoc(line, pos) {
    this.line = line;
    this.pos = pos;
}

function Scanner(text) {
    this.textOrig = text;
    this.text = text.toLowerCase();
    this._len = text.length;
    this._pos = 0;
    this._peek = this.text[0];
    this._line = 0;
    this._lineStart = 0;
}
// constants, sort of...
Scanner.TOKEN = 'token';
Scanner.IDENT = 'word';
Scanner.NUMBER = 'number';

Scanner.prototype._getChar = function() {
    if (this._pos < this._len) {
        this._pos += 1;
        this._peek = this.text[this._pos];
    } else {
        this._peek = null;
    }

    return this._peek;
}
Scanner.prototype._skipWhitespace = function() {
    do {
        if (this._peek === '\n') {
            this._line += 1;
            this._lineStart = this._pos + 1;
        }
        if (!isWhitespace(this._peek))
            break;
    } while (this._getChar() !== null);
}
Scanner.prototype._fastForward = function(num) {
    this._pos += num;
    if (this._pos < this._len) {
        this._peek = this.text[this._pos];
    } else {
        this._peek = null;
    }
}
Scanner.prototype._lexIdentifier = function(startPos) {
    const ident = /[\w_][\w\d_]*/.exec(this.text.substring(this._pos))[0];
    const len = ident.length;
    this._fastForward(len);
    return new Token(ident, Scanner.IDENT, startPos,
                     new SourceLoc(startPos.line, startPos.pos + len));
}
Scanner.prototype._lexNumber = function(startPos) {
    // we do a .toLowerCase before the string gets to here, so we
    // don't need to match for lower and upper cased 'e's.
    const numStr = /[\d*\.\d*|\d+](e\d+)?/.exec(this.text.substring(this._pos))[0];
    const len = numStr.length;
    const num = parseFloat(numStr);
    this._fastForward(len);
    return new Token(num, Scanner.NUMBER, startPos,
                     new SourceLoc(startPos.line, startPos.pos + len));
}
Scanner.prototype.getToken = function() {
    this._skipWhitespace();
    const peek = this._peek;

    // at the end of the input, peek is null.
    if (peek === null)
        return null;

    // keep track of the start of the token, relative to the start of
    // the current line.
    const start = this._pos - this._lineStart
    const startLoc = new SourceLoc(this._line, start);

    // match two-char tokens
    switch (peek) {
    case '=':
        if (getChar('=') === '=') {
            // eat the second '=', since we matched.
            this._fastForward(2);
            return new Token('==', Scanner.TOKEN, startLoc,
                             new SourceLoc(this._line, start + 2));
        } else {
            this._getChar();
            return new Token('=', Scanner.TOKEN, startLoc,
                             new SourceLoc(this._line, start + 1));
        }
        break;
    default:
        break;
    }

    if (isNumberStart(peek))
        return this._lexNumber(startLoc);

    if (isIdentifierStart(peek))
        return this._lexIdentifier(startLoc);

    // if we haven't matched by here, it must be a simple one char
    // token.  Eat that char and return the new token object.
    this._getChar();
    return new Token(peek, Scanner.TOKEN, startLoc,
                     new SourceLoc(this._line, start + 1));
}
exports.Scanner = Scanner;
