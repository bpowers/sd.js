// Copyright 2015 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

'use strict';

import { Map } from 'immutable';

import * as vars from './vars';
import { buildSim } from './sim-builder';

export interface SeriesProps {
  name: string;
  time: Float64Array;
  values: Float64Array;
}
export type Series = Readonly<SeriesProps>;

export class Sim {
  root: vars.Module;
  project: vars.Project;
  seq: number = 1; // unique message ids
  // callback storage, keyed by message id
  promised: Map<number, (result: any, err: any) => void> = Map();
  worker?: Worker;

  constructor(project: vars.Project, root: vars.Module, isStandalone: boolean) {
    this.root = root;
    this.project = project;

    const worker = buildSim(project, root, isStandalone);
    if (!worker) {
      return;
    }

    this.worker = worker;
    this.worker.addEventListener('message', (e: MessageEvent): void => {
      const id: number = e.data[0];
      const result = e.data[1];
      const cb = this.promised.get(id);
      this.promised = this.promised.delete(id);
      if (cb) {
        cb(result[0], result[1]);
      }
    });
  }

  // FIXME: any?
  private post(...args: any[]): Promise<any> {
    const id = this.seq++;

    return new Promise<any>((resolve, reject) => {
      if (!this.worker) {
        return;
      }
      this.promised.set(id, (result: any, err: any) => {
        if (err !== undefined && err !== null) {
          reject(err);
        } else {
          resolve(result);
        }
      });
      this.worker.postMessage([id].concat(args));
    });
  }

  close(): void {
    if (!this.worker) {
      return;
    }
    this.worker.terminate();
    this.worker = undefined;
  }

  reset(): Promise<any> {
    return this.post('reset');
  }

  setValue(name: string, val: number): Promise<any> {
    return this.post('set_val', name, val);
  }

  value(...names: string[]): Promise<any> {
    const args = ['get_val'].concat(names);
    return this.post.apply(this, args);
  }

  series(...names: string[]): Promise<any> {
    const args = ['get_series'].concat(names);
    return this.post.apply(this, args);
  }

  dominance(overrides: { [n: string]: number }, indicators: string[]): Promise<any> {
    return this.post('dominance', overrides, indicators);
  }

  runTo(time: number): Promise<any> {
    return this.post('run_to', time);
  }

  runToEnd(): Promise<any> {
    return this.post('run_to_end');
  }

  setDesiredSeries(names: string[]): Promise<any> {
    return this.post('set_desired_series', names);
  }

  varNames(includeHidden = false): Promise<any> {
    return this.post('var_names', includeHidden);
  }

  async csv(delim: string = ','): Promise<string> {
    const names: string[] = await this.varNames();
    const data: { [name: string]: Series } = await this.series(...names);
    return Sim.csvFromData(data, names, delim);
  }

  private static csvFromData(
    data: { [name: string]: Series },
    vars: string[],
    delim: string,
  ): string {
    let file = '';
    const series: { [name: string]: Series } = {};
    let time: Series | undefined;
    let header = 'time' + delim;

    // create the CSV header
    for (const v of vars) {
      if (v === 'time') {
        time = data[v];
        continue;
      }
      header += v + delim;
      series[v] = data[v];
    }

    if (time === undefined) {
      throw new Error('no time?');
    }

    file += header.substr(0, header.length - 1);
    file += '\n';

    // now go timestep-by-timestep to generate each line
    const nSteps = time.values.length;
    for (let i = 0; i < nSteps; i++) {
      let msg = '';
      for (const v in series) {
        if (!series.hasOwnProperty(v)) {
          continue;
        }
        if (msg === '') {
          msg += series[v].time[i] + delim;
        }
        msg += series[v].values[i] + delim;
      }
      file += msg.substr(0, msg.length - 1);
      file += '\n';
    }

    return file;
  }
}
