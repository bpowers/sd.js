export interface StringSet {
    [name: string]: boolean;
}
export interface Table {
    x: number[];
    y: number[];
}
export interface TableMap {
    [name: string]: Table;
}
export interface SimSpec {
    start: number;
    stop: number;
    dt: number;
    saveStep: number;
    method: string;
    timeUnits: string;
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
    model(name?: string): Model;
}
export interface Model {
    name: string;
    valid: boolean;
    modules: ModuleMap;
    tables: TableMap;
    project: Project;
    vars: VariableMap;
    simSpec: SimSpec;
    lookup(name: string): Variable;
}
export interface ModelMap {
    [name: string]: Model;
}
export interface Offsets {
    [name: string]: number | string;
}
export interface ModelDef {
    model: Model;
    modules: Module[];
}
export interface ModelDefSet {
    [name: string]: ModelDef;
}
export interface Variable {
    xmile: any;
    name: string;
    eqn: string;
    model: Model;
    parent: Model;
    project: Project;
    _deps: StringSet;
    _allDeps: StringSet;
    isConst(): boolean;
    getDeps(): StringSet;
    code(v: Offsets): string;
}
export interface VariableMap {
    [name: string]: Variable;
}
export interface Module extends Variable {
    modelName: string;
    refs: ReferenceMap;
    referencedModels(all?: ModelDefSet): ModelDefSet;
}
export interface ModuleMap {
    [name: string]: Module;
}
export interface Reference extends Variable {
    ptr: string;
}
export interface ReferenceMap {
    [name: string]: Reference;
}
