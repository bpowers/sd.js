// Copyright 2018 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

import { Map } from 'immutable';

import * as xmldom from 'xmldom';

import * as common from './common';
import * as stdlib from './stdlib';
import * as type from './type';
import * as xmile from './xmile';
import * as xmile2 from './xmile2';

import { Error } from './common';
import { Model } from './model';
import { defined } from './util';
import { Module } from './vars';

const getXmileElement = (xmileDoc: XMLDocument): Element | undefined => {
  // in Chrome/Firefox, item 0 is xmile.  Under node's XML DOM
  // item 0 is the <xml> prefix.  And I guess there could be
  // text nodes in there, so just explictly look for xmile
  for (let i = 0; i < xmileDoc.childNodes.length; i++) {
    const node = xmileDoc.childNodes.item(i) as Element;
    if (node.tagName === 'xmile') {
      return node;
    }
  }
  return undefined;
};

let stdModels: Map<string, type.Model> | undefined;

function parseStdModels() {
  stdModels = Map();
  for (const name in stdlib.xmileModels) {
    if (!stdlib.xmileModels.hasOwnProperty(name)) {
      continue;
    }
    const modelStr = stdlib.xmileModels[name];
    const xml = new xmldom.DOMParser().parseFromString(
      modelStr,
      'application/xml',
    );
    const ctx = new Project(xml, true);
    const mdl = ctx.model(name);
    if (!mdl) {
      console.log('FIXME: invariant broken');
      continue;
    }
    mdl.name = 'stdlib·' + mdl.name;
    const ident = mdl.ident;
    stdModels = stdModels.set('stdlib·' + ident, mdl);
  }
}

/**
 * Project is the container for a set of SD models.
 *
 * A single project may include models + non-model elements
 */
export class Project implements type.Project {
  name: string;
  valid: boolean;
  simSpec: type.SimSpec;
  main: type.Module;

  private files: xmile.File[];
  private xmile: XMLDocument;
  private models: Map<string, type.Model>;

  constructor(xmileDoc: XMLDocument, skipStdlib = false) {
    this.files = [];
    this.models = Map();
    this.valid = false;
    this.addDocument(xmileDoc, true, skipStdlib);
  }

  model(name?: string): type.Model | undefined {
    if (!name) {
      name = 'main';
    }
    if (this.models.has(name)) {
      return this.models.get(name);
    }

    return this.models.get('stdlib·' + name);
  }

  // isMain should only be true when called from the constructor.
  addDocument(
    xmileDoc: XMLDocument,
    isMain = false,
    skipStdlib = false,
  ): Error | undefined {
    if (
      !xmileDoc ||
      xmileDoc.getElementsByTagName('parsererror').length !== 0
    ) {
      this.valid = false;
      return Error.Version;
    }
    const xmileElement = getXmileElement(xmileDoc);
    if (!xmileElement) {
      this.valid = false;
      return new Error('no XMILE root element');
    }

    // FIXME: compat translation of XML

    // finished with XMLDocument at this point, we now
    // have a tree of native JS objects with a 1:1
    // correspondence to the XMILE doc
    const [file, err] = xmile.File.Build(xmileElement);
    if (err) {
      console.log('File.Build: ' + err.error);
      this.valid = false;
      return new Error('File.Build: ' + err.error);
    }

    // FIXME: compat translation of equations

    this.files.push(file);

    if (isMain) {
      this.name = file.header.name || 'sd project';
      this.simSpec = file.simSpec;
      if (!file.simSpec) {
        this.valid = false;
        return new Error('isMain, but no sim spec');
      }
    }

    if (!skipStdlib) {
      if (stdModels === undefined) {
        parseStdModels();
      }
      if (stdModels === undefined) {
        return new Error("couldn't parse std models");
      }

      // add standard models, like 'delay1' and 'smth3'.
      for (const [name, stdModel] of stdModels) {
        this.models = this.models.set(name, stdModel);
      }
    }

    // FIXME: merge the other parts of the model into the
    // project
    for (const xModel of file.models) {
      let ident = xModel.ident;
      if (ident === '' && !('main' in this.models)) {
        ident = 'main';
      }
      this.models = this.models.set(ident, new Model(this, ident, xModel));
    }
    this.valid = true;

    if (!this.models.has('main')) {
      return undefined;
    }

    const mainModel = defined(this.models.get('main'));

    const modVar = new xmile.Variable();
    modVar.name = 'main';
    this.main = new Module(this, null, modVar);
    this.main.updateRefs(mainModel);

    return undefined;
  }
}
