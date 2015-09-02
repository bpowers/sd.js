export declare class Error {
    error: string;
    constructor(error: string);
}
export interface NodeStatic {
    new (el: Element): NodeStatic;
}
export interface Node {
    toXml(doc: XMLDocument, parent: Element): boolean;
}
export interface Builder<N extends Node> {
    (el: Element): [N, Error];
}
export declare function PointBuilder(el: Element): [Point, Error];
export declare class Point implements Node {
    X: number;
    Y: number;
    constructor(el: Element);
    toXml(doc: XMLDocument, parent: Element): boolean;
}
export declare class Size implements Node {
    Width: number;
    Height: number;
    constructor(el: Element);
    toXml(doc: XMLDocument, parent: Element): boolean;
}
export declare class Rect implements Point, Size, Node {
    X: number;
    Y: number;
    Width: number;
    Height: number;
    constructor(el: Element);
    toXml(doc: XMLDocument, parent: Element): boolean;
}
export declare function FileBuilder(el: Element): [File, Error];
export declare class File implements Node {
    version: string;
    level: number;
    header: Header;
    simSpec: SimSpec;
    dimensions: Dimension[];
    units: Unit[];
    behavior: Behavior;
    style: Style;
    models: Model[];
    constructor(el: Element);
    static Build(el: Element): [File, Error];
    toXml(doc: XMLDocument, parent: Element): boolean;
}
export declare class SimSpec implements Node {
    start: number;
    stop: number;
    dt: number;
    saveStep: number;
    method: string;
    timeUnits: string;
    constructor(start: number, stop: number, dt: number, saveStep?: number, method?: string, timeUnits?: string);
    static Build(el: Element): [SimSpec, Error];
    toXml(doc: XMLDocument, parent: Element): boolean;
}
export declare class Unit implements Node {
    name: string;
    eqn: string;
    alias: string;
    constructor(el: Element);
    toXml(doc: XMLDocument, parent: Element): boolean;
}
export declare class Header implements Node {
    options: Options;
    name: string;
    uuid: string;
    vendor: string;
    product: string;
    constructor(el: Element);
    toXml(doc: XMLDocument, parent: Element): boolean;
}
export declare class Dimension implements Node {
    name: string;
    size: string;
    constructor(el: Element);
    toXml(doc: XMLDocument, parent: Element): boolean;
}
export declare class Options implements Node {
    namespaces: string[];
    usesConveyor: boolean;
    usesQueue: boolean;
    usesArrays: boolean;
    usesSubmodels: boolean;
    usesMacros: boolean;
    usesEventPosters: boolean;
    hasModelView: boolean;
    usesOutputs: boolean;
    usesInputs: boolean;
    usesAnnotations: boolean;
    constructor(el: Element);
    toXml(doc: XMLDocument, parent: Element): boolean;
}
export declare class Behavior implements Node {
    allNonNegative: boolean;
    stockNonNegative: boolean;
    flowNonNegative: boolean;
    constructor(el: Element);
    toXml(doc: XMLDocument, parent: Element): boolean;
}
export declare class Style implements Node {
    constructor(el: Element);
    toXml(doc: XMLDocument, parent: Element): boolean;
}
export declare class Data implements Node {
    constructor(el: Element);
    toXml(doc: XMLDocument, parent: Element): boolean;
}
export declare class Model implements Node {
    name: string;
    variables: Variable[];
    views: View[];
    constructor(el: Element);
    toXml(doc: XMLDocument, parent: Element): boolean;
}
export declare class Variable implements Node {
    name: string;
    doc: string;
    eqn: string;
    nonNeg: boolean;
    inflows: string[];
    outflows: string[];
    units: string;
    gf: GF;
    params: Connect[];
    constructor(el: Element);
    toXml(doc: XMLDocument, parent: Element): boolean;
}
export declare class View implements Node {
    constructor(el: Element);
    toXml(doc: XMLDocument, parent: Element): boolean;
}
export declare class GF implements Node {
    discrete: boolean;
    xPoints: string;
    yPoints: string;
    xScale: Scale;
    yScale: Scale;
    constructor(el: Element);
    toXml(doc: XMLDocument, parent: Element): boolean;
}
export declare class Scale implements Node {
    min: number;
    max: number;
    constructor(el: Element);
    toXml(doc: XMLDocument, parent: Element): boolean;
}
export declare class Connect implements Node {
    to: string;
    from: string;
    constructor(el: Element);
    toXml(doc: XMLDocument, parent: Element): boolean;
}
