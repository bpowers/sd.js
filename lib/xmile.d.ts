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
    [indexName: string]: any;
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
    vendor: string;
    product: Product;
    options: Options;
    name: string;
    version: string;
    caption: string;
    author: string;
    affiliation: string;
    client: string;
    copyright: string;
    created: string;
    modified: string;
    uuid: string;
    static Build(el: Node): [Header, Error];
    toXml(doc: XMLDocument, parent: Element): boolean;
}
export declare class Dimension implements XNode {
    name: string;
    size: string;
    static Build(el: Node): [Dimension, Error];
    toXml(doc: XMLDocument, parent: Element): boolean;
}
export declare class Options implements XNode {
    namespaces: string[];
    usesArrays: boolean;
    usesMacros: boolean;
    usesConveyor: boolean;
    usesQueue: boolean;
    usesSubmodels: boolean;
    usesEventPosters: boolean;
    hasModelView: boolean;
    usesOutputs: boolean;
    usesInputs: boolean;
    usesAnnotation: boolean;
    maximumDimensions: number;
    invalidIndexValue: number;
    recursiveMacros: boolean;
    optionFilters: boolean;
    arrest: boolean;
    leak: boolean;
    overflow: boolean;
    messages: boolean;
    numericDisplay: boolean;
    lamp: boolean;
    gauge: boolean;
    numericInput: boolean;
    list: boolean;
    graphicalInput: boolean;
    [indexName: string]: any;
    static Build(el: Node): [Options, Error];
    toXml(doc: XMLDocument, parent: Element): boolean;
}
export declare class Behavior implements XNode {
    allNonNegative: boolean;
    stockNonNegative: boolean;
    flowNonNegative: boolean;
    static Build(el: Node): [Behavior, Error];
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
    run: boolean;
    namespaces: string[];
    resource: string;
    simSpec: SimSpec;
    variables: Variable[];
    views: View[];
    static Build(el: Node): [Model, Error];
    ident: string;
    toXml(doc: XMLDocument, parent: Element): boolean;
}
export declare class ArrayElement implements XNode {
    subscript: string[];
    eqn: string;
    gf: GF;
    static Build(el: Node): [ArrayElement, Error];
    toXml(doc: XMLDocument, parent: Element): boolean;
}
export declare class Range implements XNode {
    min: number;
    max: number;
    auto: boolean;
    group: number;
    static Build(el: Node): [Range, Error];
    toXml(doc: XMLDocument, parent: Element): boolean;
}
export declare class Format implements XNode {
    precision: string;
    scaleBy: string;
    displayAs: string;
    delimit000s: boolean;
    static Build(el: Node): [Format, Error];
    toXml(doc: XMLDocument, parent: Element): boolean;
}
export declare class Variable implements XNode {
    name: string;
    eqn: string;
    gf: GF;
    dimensions: Dimension[];
    elements: ArrayElement[];
    connections: Connect[];
    units: Unit;
    doc: string;
    range: Range;
    scale: Range;
    format: Format;
    nonNegative: boolean;
    inflows: string[];
    outflows: string[];
    flowConcept: boolean;
    static Build(el: Node): [Variable, Error];
    toXml(doc: XMLDocument, parent: Element): boolean;
}
export declare class View implements XNode {
    static Build(el: Node): [View, Error];
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
