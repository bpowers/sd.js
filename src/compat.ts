// Copyright 2015 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

'use strict';

import { Set } from 'immutable';

const VENDOR = 'SDLabs';
const PRODUCT = 'sd.js';
const VERSION = '0.2.6';

const VAR_TYPES = Set<string>(['module', 'stock', 'aux', 'flow']);

// FIXME: remove 'any'
export interface Vendor {
  match(xmile: any): boolean;
  translate(xmile: any): boolean;
}

class Isee {
  // FIXME: remove 'any'
  match(xmile: any): boolean {
    'use strict';

    return (/isee/i).test(xmile.header.vendor);
  }

  // FIXME: remove 'any'
  translate(xmile: any): any {
    'use strict';

    for (let i = 0; i < xmile.model.length; i++) {
      let mdl = xmile.model[i];

      mdl.views = {};
      mdl.views.view = [];
      if (mdl.views) {
        mdl.views.view.push(mdl.display);
        delete mdl.display;
      }
      if (mdl.interface) {
        mdl.interface['@name'] = 'interface';
        mdl.views.view.push(mdl.interface);
        delete mdl.interface;
      }

      mdl.variables = {};
      for (let type in VAR_TYPES) {
        if (!mdl[type])
          continue;
        mdl.variables[type] = mdl[type];
        delete mdl[type];
        if (!(mdl.variables[type] instanceof Array))
          mdl.variables[type] = [mdl.variables[type]];
        if (!mdl.views.view[0][type])
          mdl.views.view[0][type] = [];
        for (let j = 0; j < mdl.variables[type].length; j++) {
          let display = mdl.variables[type][j].display;
          display['@name'] = mdl.variables[type][j]['@name'];
          if ('label_side' in display) {
            display['@label_side'] = display.label_side;
            delete display.label_side;
          }
          mdl.views.view[0][type].push(display);
          delete mdl.variables[type][j].display;
        }
      }
    }
    xmile.header.vendor = VENDOR;
    xmile.header.product = {
      '@version': VERSION,
      'keyValue': PRODUCT,
    };
    xmile.header.version = VERSION;

    return xmile;
  }
}

export const vendors: {[name: string]: Vendor} = {
  'isee': new Isee(),
};
