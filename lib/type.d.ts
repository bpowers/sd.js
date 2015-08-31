export interface Table {
    x: number[];
    y: number[];
}
export interface TimeSpec {
    start: number;
    stop: number;
    dt: number;
    savestep: number;
}
export interface Series {
    name: string;
    time: Float64Array;
    values: Float64Array;
}
export interface StringSet {
    [name: string]: boolean;
}
export interface VariableSet {
    [name: string]: Variable;
}
export interface RefSet {
    [name: string]: Reference;
}
export interface Model {
    name: string;
    valid: boolean;
    modules: ModuleMap;
    tables: TableMap;
    project: Project;
    vars: VariableSet;
    timespec: TimeSpec;
    lookup(name: string): Variable;
}
export interface ModelSet {
    [name: string]: Model;
}
export interface ModuleMap {
    [name: string]: Module;
}
export interface TableMap {
    [name: string]: Table;
}
export interface Project {
    name: string;
    main: Module;
    timespec: TimeSpec;
    models: ModelSet;
    model(name?: string): Model;
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
export interface Module extends Variable {
    modelName: string;
    refs: RefSet;
    referencedModels(all?: ModelDefSet): ModelDefSet;
}
export interface Reference extends Variable {
    ptr: string;
}
