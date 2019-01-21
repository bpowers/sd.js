// Copyright 2018 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

import * as common from './common';

import { defined } from './common';
import { isModel, Model } from './model';
import { Project } from './project';

export { Model } from './model';
export { Project, stdProject } from './project';
export { Sim } from './sim';
export { Variable } from './type';
export { Stock } from './vars';
export { FileFromJSON, View, ViewElement } from './xmile';

export const Error = common.Error;

/**
 * Attempts to parse the given xml string describing an xmile
 * model into a Model object, returning the Model on success, or
 * null on error.  On error, a string describing what went wrong
 * can be obtained by calling sd.error().
 *
 * @param xmlString A string containing a xmile model.
 * @return A valid Model object on success, or null on error.
 */
export function newModel(xmlDoc: XMLDocument): Model {
  const [project, err] = new Project().addXmileFile(xmlDoc);
  if (err) {
    throw err;
  }

  const model = defined(project).model();
  if (!isModel(model)) {
    throw new Error('unreachable');
  }
  return model;
}

export async function load(url: string): Promise<[Model, undefined] | [undefined, common.Error]> {
  const response = await fetch(url);
  if (response.status >= 400) {
    return [undefined, new common.Error(`fetch(${url}): status ${response.status}`)];
  }

  const body = await response.text();
  const parser = new DOMParser();
  const xml: XMLDocument = parser.parseFromString(body, 'application/xml');

  const mdl = newModel(xml);
  if (!mdl) {
    return [undefined, new common.Error('newModel failed')];
  }

  return [mdl, undefined];
}
