import type = require('./type');
export declare class Project implements type.Project {
    name: string;
    main: type.Module;
    valid: boolean;
    xmile: any;
    timespec: type.TimeSpec;
    models: type.ModelSet;
    constructor(xmileDoc: any);
    model(name?: string): any;
}
