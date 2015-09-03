import type = require('./type');
import xmile = require('./xmile');
export declare class Variable implements type.Variable {
    xmile: xmile.Variable;
    ident: string;
    eqn: string;
    project: type.Project;
    parent: type.Model;
    model: type.Model;
    _deps: type.StringSet;
    _allDeps: type.StringSet;
    constructor(model?: type.Model, v?: xmile.Variable);
    initialEquation(): string;
    code(v: type.Offsets): string;
    getDeps(): type.StringSet;
    lessThan(that: Variable): boolean;
    isConst(): boolean;
}
export declare class Stock extends Variable {
    initial: string;
    inflows: string[];
    outflows: string[];
    constructor(model: type.Model, v: xmile.Variable);
    initialEquation(): string;
    code(v: type.Offsets): string;
}
export declare class Table extends Variable {
    x: number[];
    y: number[];
    ok: boolean;
    constructor(model: type.Model, v: xmile.Variable);
    code(v: type.Offsets): string;
}
export declare class Module extends Variable implements type.Module {
    modelName: string;
    refs: type.ReferenceMap;
    constructor(project: type.Project, parent: type.Model, v: xmile.Variable);
    getDeps(): type.StringSet;
    referencedModels(all?: type.ModelDefSet): type.ModelDefSet;
}
export declare class Reference extends Variable implements type.Reference {
    xmileConn: xmile.Connection;
    ptr: string;
    constructor(conn: xmile.Connection);
    code(v: type.Offsets): string;
    lessThan(that: Variable): boolean;
    isConst(): boolean;
}
