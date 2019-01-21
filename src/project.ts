// Copyright 2018 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

import { List, Map, Record } from 'immutable';

import * as xmldom from 'xmldom';

import * as stdlib from './stdlib';
import * as xmile from './xmile';

import { Error } from './common';
import { Model } from './model';
import { defined } from './util';
import { Module, Project as varsProject } from './vars';

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

const projectDefaults = {
  name: 'sd project',
  main: undefined as Module | undefined,
  files: List<xmile.File>(),
  models: Map<string, Model>(),
};

/**
 * Project is the container for a set of SD models.
 *
 * A single project may include models + non-model elements
 */
export class Project extends Record(projectDefaults) implements varsProject {
  constructor() {
    let models = Map<string, Model>();

    for (const [name, modelStr] of stdlib.xmileModels) {
      const xml = new xmldom.DOMParser().parseFromString(modelStr, 'application/xml');
      const [file, err] = Project.parseFile(xml);
      if (err) {
        throw err;
      }
      if (defined(file).models.size !== 1) {
        throw new Error(`stdlib layout error`);
      }

      const xModel = defined(defined(file).models.first());
      const model = new Model((undefined as any) as Project, xModel);
      if (!model.ident.startsWith('stdlib·')) {
        throw new Error(`stdlib bad model name: ${model.ident}`);
      }
      models = models.set(model.ident, model);
    }
    super({ models });
  }

  get simSpec(): xmile.SimSpec {
    return defined(defined(this.files.last()).simSpec);
  }

  getFiles(): List<xmile.File> {
    return this.files;
  }

  model(name?: string): Model | undefined {
    if (!name) {
      name = 'main';
    }
    if (this.models.has(name)) {
      return this.models.get(name);
    }

    return this.models.get('stdlib·' + name);
  }

  addXmileFile(xmileDoc: XMLDocument, isMain = false): [Project, undefined] | [undefined, Error] {
    const [file, err] = Project.parseFile(xmileDoc);
    if (err) {
      return [undefined, err];
    }

    return this.addFile(defined(file), isMain);
  }

  addFile(file: xmile.File, isMain = false): [Project, undefined] | [undefined, Error] {
    const files = this.files.push(file);

    // FIXME: merge the other parts of the model into the project
    const models = Map(
      defined(file).models.map(
        (xModel): [string, Model] => {
          const model = new Model(this, xModel);
          return [model.ident, model];
        },
      ),
    );

    let dupErr: Error | undefined;
    models.forEach((model, name) => {
      if (this.models.has(name)) {
        dupErr = new Error(`duplicate name ${name}`);
      }
    });
    if (dupErr) {
      return [undefined, dupErr];
    }

    const xMod = new xmile.Variable({
      type: 'module',
      name: 'main',
    });
    const main = new Module(xMod);

    let newProject = this.mergeDeep({
      files,
      models: this.models.merge(models),
      main,
    });

    if (models.has('main') && defined(file).header && defined(defined(file).header).name) {
      newProject = newProject.set('name', defined(defined(file).header).name);
    }

    return [newProject, undefined];
  }

  // isMain should only be true when called from the constructor.
  private static parseFile(xmileDoc: XMLDocument): [xmile.File, undefined] | [undefined, Error] {
    if (!xmileDoc || xmileDoc.getElementsByTagName('parsererror').length !== 0) {
      return [undefined, Error.Version];
    }
    const xmileElement = getXmileElement(xmileDoc);
    if (!xmileElement) {
      return [undefined, new Error('no XMILE root element')];
    }

    // FIXME: compat translation of XML

    // finished with XMLDocument at this point, we now
    // have a tree of native JS objects with a 1:1
    // correspondence to the XMILE doc
    const [file, err] = xmile.File.FromXML(xmileElement);
    if (err || !file) {
      return [undefined, new Error(`File.Build: ${err}`)];
    }

    // FIXME: compat translation of equations

    return [file, undefined];
  }
}

// a project consisting of all the standard library modules
export const stdProject: Project = new Project();
