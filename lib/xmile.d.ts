export declare function camelCase(s: string): string;
export declare function splitOnComma(str: string): string[];
export declare function numberize(arr: string[]): number[];
export declare function i32(n: number): number;
export declare class Error {
    error: string;
    constructor(error: string);
}
export interface XNode {
    toXml(doc: XMLDocument, parent: Element): boolean;
}
export declare class Point implements XNode {
    x: number;
    y: number;
    static Build(el: Node): [Point, Error];
    toXml(doc: XMLDocument, parent: Element): boolean;
}
export declare class Size implements XNode {
    width: number;
    height: number;
    constructor(el: Element);
    toXml(doc: XMLDocument, parent: Element): boolean;
}
export declare class Rect implements Point, Size, XNode {
    x: number;
    y: number;
    width: number;
    height: number;
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
    type: string;
    name: string;
    eqn: string;
    gf: GF;
    dimensions: Dimension[];
    elements: ArrayElement[];
    connections: Connection[];
    resource: string;
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
    ident: string;
    toXml(doc: XMLDocument, parent: Element): boolean;
}
export declare class Shape implements XNode {
    static Types: string[];
    type: string;
    static Build(el: Node): [Shape, Error];
    toXml(doc: XMLDocument, parent: Element): boolean;
}
export declare class ViewElement implements XNode {
    type: string;
    name: string;
    uid: number;
    x: number;
    y: number;
    width: number;
    height: number;
    shape: Shape;
    borderWidth: string;
    borderColor: string;
    borderStyle: string;
    fontFamily: string;
    fontWeight: string;
    textDecoration: string;
    textAlign: string;
    verticalTextAlign: string;
    fontColor: string;
    textBackground: string;
    fontSize: number;
    padding: number[];
    color: string;
    background: string;
    zIndex: number;
    labelSide: string;
    labelAngle: number;
    from: string;
    to: string;
    angle: number;
    pts: Point[];
    of: string;
    static Build(el: Node): [ViewElement, Error];
    ident: string;
    toXml(doc: XMLDocument, parent: Element): boolean;
}
export declare class View implements XNode {
    type: string;
    order: number;
    width: number;
    height: number;
    zoom: number;
    scrollX: number;
    scrollY: number;
    background: string;
    pageWidth: number;
    pageHeight: number;
    pageSequence: string;
    pageOrientation: string;
    showPages: boolean;
    homePage: number;
    homeView: boolean;
    elements: ViewElement[];
    static Build(el: Node): [View, Error];
    toXml(doc: XMLDocument, parent: Element): boolean;
}
export declare class GF implements XNode {
    static Types: string[];
    name: string;
    type: string;
    xPoints: number[];
    yPoints: number[];
    xScale: Scale;
    yScale: Scale;
    static Build(el: Node): [GF, Error];
    toXml(doc: XMLDocument, parent: Element): boolean;
}
export declare class Scale implements XNode {
    min: number;
    max: number;
    static Build(el: Node): [Scale, Error];
    toXml(doc: XMLDocument, parent: Element): boolean;
}
export declare class Connection implements XNode {
    to: string;
    from: string;
    static Build(el: Node): [Connection, Error];
    toXml(doc: XMLDocument, parent: Element): boolean;
}
export declare function canonicalize(id: string): string;
