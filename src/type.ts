// Copyright 2015 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

import { List, Map, Record, Set } from 'immutable';

import * as xmile from './xmile';

import { defined } from './common';

export interface Table {
  x: List<number>;
  y: List<number>;
}

export interface SimSpec {
  start: number;
  stop: number;
  dt: number;
  saveStep?: number;
  method?: string;
  timeUnits?: string;

  toJS(): { [key: string]: any };
}

export interface Series {
  name: string;
  time: Float64Array;
  values: Float64Array;
}

export interface Project {
  name: string;
  simSpec: SimSpec;
  main: Module;

  model(name?: string): Model | undefined;
  getFiles(): List<xmile.File>;
}

export interface Model {
  ident: string;
  valid: boolean;
  modules: Map<string, Module>;
  tables: Map<string, Table>;
  vars: Map<string, Variable>;
  simSpec?: SimSpec;

  view(index: number): xmile.View | undefined;
}

interface ModelDefProps {
  model: Model | undefined;
  modules: Set<Module>;
}

const modelDefDefaults: ModelDefProps = {
  model: undefined,
  modules: Set<Module>(),
};

export class ModelDef extends Record(modelDefDefaults) {
  constructor(params: ModelDefProps) {
    super(params);
  }

  get<T extends keyof ModelDefProps>(value: T): ModelDefProps[T] {
    return super.get(value);
  }
}

const contextDefaults = {
  project: (null as any) as Project,
  models: List<Model>(),
};

export class Context extends Record(contextDefaults) {
  constructor(project: Project, model: Model, prevContext?: Context) {
    const models = prevContext ? prevContext.models : List<Model>();
    super({
      project,
      models: models.push(model),
    });
  }

  get parent(): Model {
    return defined(this.models.last());
  }

  get mainModel(): Model {
    return defined(this.project.model(this.project.main.modelName));
  }

  lookup(ident: string): Variable | undefined {
    if (ident[0] === '.') {
      ident = ident.substr(1);
      return new Context(this.project, this.mainModel).lookup(ident);
    }

    const model = this.parent;
    if (model.vars.has(ident)) {
      return model.vars.get(ident);
    }
    const parts = ident.split('.');
    const module = model.modules.get(parts[0]);
    if (!module) {
      return undefined;
    }
    const nextModel = this.project.model(module.modelName);
    if (!nextModel) {
      return undefined;
    }
    return new Context(this.project, nextModel).lookup(parts.slice(1).join('.'));
  }
}

export interface Variable {
  readonly xmile: xmile.Variable | undefined;

  readonly ident?: string;
  readonly eqn?: string;

  readonly ast?: any; // FIXME: this is any to fix circular deps

  readonly deps: Set<string>;

  isConst(): boolean;
  getDeps(context: Context): Set<string>;
  initialEquation(parent: Model, offsets: Map<string, number>): string | undefined;
  code(parent: Model, offsets: Map<string, number>): string | undefined;
}

export interface Module extends Variable {
  modelName: string;
  refs: Map<string, Reference>;
  referencedModels(project: Project, all?: Map<string, ModelDef>): Map<string, ModelDef>;
}

export interface Reference extends Variable {
  ptr: string;
}

// FROM lex

// constants, sort of...
export const enum TokenType {
  TOKEN,
  IDENT,
  RESERVED,
  NUMBER,
}

const sourceLocDefaults = {
  line: -1,
  pos: -1,
};

export class SourceLoc extends Record(sourceLocDefaults) {
  constructor(line: number, pos: number) {
    super({ line, pos });
  }

  off(n: number): SourceLoc {
    return new SourceLoc(this.line, this.pos + n);
  }
}

export const UnknownSourceLoc = new SourceLoc(-1, -1);

const tokenDefaults = {
  tok: '',
  type: TokenType.TOKEN,
  startLoc: UnknownSourceLoc,
  endLoc: UnknownSourceLoc,
};

export class Token extends Record(tokenDefaults) {
  constructor(tok: string, type: TokenType, startLoc: SourceLoc, endLoc: SourceLoc) {
    super({ endLoc, startLoc, tok, type });
  }

  get value(): number {
    if (this.type !== TokenType.NUMBER) {
      throw new Error(`Token.value called for non-number: ${this.type}`);
    }

    return parseFloat(this.tok);
  }
}
