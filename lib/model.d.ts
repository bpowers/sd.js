import type = require('./type');
import draw = require('./draw');
import sim = require('./sim');
import xmile = require('./xmile');
export declare class Model implements type.Model {
    name: string;
    valid: boolean;
    project: type.Project;
    xModel: xmile.Model;
    modules: type.ModuleMap;
    tables: type.TableMap;
    vars: type.VariableMap;
    private spec;
    constructor(project: type.Project, ident: string, xModel: xmile.Model);
    ident: string;
    simSpec: type.SimSpec;
    lookup(id: string): type.Variable;
    sim(isStandalone: boolean): sim.Sim;
    drawing(svgElementID: string, overrideColors: boolean, enableMousewheel: boolean): draw.Drawing;
    private parseVars(variables);
}
