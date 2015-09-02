export declare class Error {
    error: string;
    constructor(error: string);
}
export interface XNodeStatic {
    new (el: Element): XNodeStatic;
}
export interface XNode {
    toXml(doc: XMLDocument, parent: Element): boolean;
}
export declare class Point implements XNode {
    X: number;
    Y: number;
    constructor(el: Element);
    toXml(doc: XMLDocument, parent: Element): boolean;
}
export declare class Size implements XNode {
    Width: number;
    Height: number;
    constructor(el: Element);
    toXml(doc: XMLDocument, parent: Element): boolean;
}
export declare class Rect implements Point, Size, XNode {
    X: number;
    Y: number;
    Width: number;
    Height: number;
    constructor(el: Element);
    toXml(doc: XMLDocument, parent: Element): boolean;
}
export declare class File implements XNode {
    version: string;
    namespace: string;
    header: Header;
    simSpec: SimSpec;
    dimensions: Dimension[];
    units: Unit[];
    behavior: Behavior;
    style: Style;
    models: Model[];
    constructor(version: string, namespace: string, header: Header, simSpec: SimSpec, dimensions: Dimension[], units: Unit[], behavior: Behavior, style: Style, models: Model[]);
    static Build(el: Node): [File, Error];
    toXml(doc: XMLDocument, parent: Element): boolean;
}
export declare class SimSpec implements XNode {
    start: number;
    stop: number;
    dt: number;
    saveStep: number;
    method: string;
    timeUnits: string;
    constructor(start: number, stop: number, dt: number, saveStep?: number, method?: string, timeUnits?: string);
    static Build(el: Node): [SimSpec, Error];
    toXml(doc: XMLDocument, parent: Element): boolean;
}
export declare class Unit implements XNode {
    name: string;
    eqn: string;
    alias: string;
    constructor(el: Element);
    toXml(doc: XMLDocument, parent: Element): boolean;
}
export declare class Product implements XNode {
    name: string;
    lang: string;
    version: string;
    static Build(el: Node): [Product, Error];
    toXml(doc: XMLDocument, parent: Element): boolean;
}
export declare class Header implements XNode {
    options: Options;
    name: string;
    uuid: string;
    vendor: string;
    product: Product;
    constructor(el: Element);
    static Build(el: Node): [Header, Error];
    toXml(doc: XMLDocument, parent: Element): boolean;
}
export declare class Dimension implements XNode {
    name: string;
    size: string;
    constructor(el: Element);
    toXml(doc: XMLDocument, parent: Element): boolean;
}
export declare class Options implements XNode {
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
    static Build(el: Node): [Options, Error];
    toXml(doc: XMLDocument, parent: Element): boolean;
}
export declare class Behavior implements XNode {
    allNonNegative: boolean;
    stockNonNegative: boolean;
    flowNonNegative: boolean;
    constructor(el: Element);
    toXml(doc: XMLDocument, parent: Element): boolean;
}
export declare class Style implements XNode {
    constructor(el: Element);
    toXml(doc: XMLDocument, parent: Element): boolean;
}
export declare class Data implements XNode {
    constructor(el: Element);
    toXml(doc: XMLDocument, parent: Element): boolean;
}
export declare class Model implements XNode {
    name: string;
    simSpec: SimSpec;
    variables: Variable[];
    views: View[];
    constructor(el: Element);
    ident: string;
    toXml(doc: XMLDocument, parent: Element): boolean;
}
export declare class Variable implements XNode {
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
export declare class View implements XNode {
    constructor(el: Element);
    toXml(doc: XMLDocument, parent: Element): boolean;
}
export declare class GF implements XNode {
    discrete: boolean;
    xPoints: string;
    yPoints: string;
    xScale: Scale;
    yScale: Scale;
    constructor(el: Element);
    toXml(doc: XMLDocument, parent: Element): boolean;
}
export declare class Scale implements XNode {
    min: number;
    max: number;
    constructor(el: Element);
    toXml(doc: XMLDocument, parent: Element): boolean;
}
export declare class Connect implements XNode {
    to: string;
    from: string;
    constructor(el: Element);
    toXml(doc: XMLDocument, parent: Element): boolean;
}
export declare function canonicalize(id: string): string;
