import type = require('./type');
import draw = require('./draw');
import sim = require('./sim');
export declare class Model implements type.Model {
    name: string;
    valid: boolean;
    xmile: any;
    modules: type.ModuleMap;
    tables: type.TableMap;
    project: type.Project;
    vars: type.VariableSet;
    _timespec: type.TimeSpec;
    constructor(project: type.Project, xmile: any);
    timespec: type.TimeSpec;
    _parseVars(defs: any): void;
    lookup(id: string): type.Variable;
    sim(isStandalone: boolean): sim.Sim;
    drawing(svgElementID: string, overrideColors: boolean, enableMousewheel: boolean): draw.Drawing;
}
