export declare class Point {
    X: number;
    Y: number;
}
export declare class Size {
    Width: number;
    Height: number;
}
export declare class Rect implements Point, Size {
    X: number;
    Y: number;
    Width: number;
    Height: number;
}
export declare class File {
    version: string;
    level: number;
    header: Header;
    simSpec: SimSpec;
    dimensions: Dimension[];
    units: Unit[];
    behavior: Behavior;
    style: Style;
    models: Model[];
}
export declare class SimSpec {
    timeUnits: string;
    start: number;
    stop: number;
    dt: number;
    savestep: number;
    method: string;
}
export declare class Unit {
    name: string;
    eqn: string;
    alias: string;
}
export declare class Header {
    options: Options;
    name: string;
    uuid: string;
    vendor: string;
    product: string;
}
export declare class Dimension {
    name: string;
    size: string;
}
export declare class Options {
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
}
export declare class Behavior {
    allNonNegative: boolean;
    stockNonNegative: boolean;
    flowNonNegative: boolean;
}
export declare class Style {
}
export declare class Data {
}
export declare class Model {
    name: string;
    variables: Variable[];
    views: View[];
}
export declare class Variable {
    name: string;
    doc: string;
    eqn: string;
    nonNeg: boolean;
    inflows: string[];
    outflows: string[];
    units: string;
    gf: GF;
    params: Connect[];
}
export declare class View {
}
export declare class GF {
    discrete: boolean;
    xPoints: string;
    yPoints: string;
    xScale: Scale;
    yScale: Scale;
}
export declare class Scale {
    min: number;
    max: number;
}
export declare class Connect {
    to: string;
    from: string;
}
