import type = require('./type');
export declare class Variable implements type.Variable {
    xmile: any;
    name: string;
    eqn: string;
    model: type.Model;
    parent: type.Model;
    project: type.Project;
    _deps: type.StringSet;
    _allDeps: type.StringSet;
    constructor(model?: type.Model, xmile?: any);
    initialEquation(): string;
    code(v: type.Offsets): string;
    getDeps(): type.StringSet;
    lessThan(that: Variable): boolean;
    isConst(): boolean;
}
export declare class Stock extends Variable {
    inflows: string[];
    outflows: string[];
    initial: string;
    constructor(model: type.Model, xmile: any);
    initialEquation(): string;
    code(v: type.Offsets): string;
}
export declare class Table extends Variable {
    x: number[];
    y: number[];
    ok: boolean;
    constructor(model: type.Model, xmile: any);
    code(v: type.Offsets): string;
}
export declare class Module extends Variable implements type.Module {
    modelName: string;
    refs: type.RefSet;
    constructor(project: type.Project, parent: type.Model, xmile: any);
    getDeps(): type.StringSet;
    referencedModels(all?: type.ModelDefSet): type.ModelDefSet;
}
export declare class Reference extends Variable implements type.Reference {
    ptr: string;
    constructor(xmile: any);
    code(v: type.Offsets): string;
    lessThan(that: Variable): boolean;
    isConst(): boolean;
}
