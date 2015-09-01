/// <reference path="../typings/tsd.d.ts" />
import type = require('./type');
export interface EntStatic {
    new (drawing: Drawing, element: any): Ent;
}
export interface Ent {
    name: string;
    cx: number;
    cy: number;
    set: Snap.Element;
    to: string;
    from: string;
    init(): void;
    draw(): void;
    drawLabel(): void;
    visualize(times: number[], values: number[]): void;
}
export interface Transform {
    scale: number;
    dscale: number;
    x: number;
    y: number;
    dx: number;
    dy: number;
}
export declare class Drawing {
    model: type.Model;
    xmile: any;
    colorOverride: boolean;
    paper: Snap.Paper;
    _g: any;
    _t: Transform;
    d_ents: Ent[];
    named_ents: {
        [n: string]: Ent;
    };
    z_ents: Ent[][];
    constructor(model: type.Model, xmile: any, svgElement: string | HTMLElement, overrideColors: any, enableMousewheel: boolean);
    applyDScaleAt(dscale: number, e: any): void;
    transform(scale?: number, x?: number, y?: number): void;
    normalizeTransform(): void;
    visualize(data: any): void;
    group(...args: any[]): Snap.Element;
}
