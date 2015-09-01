import type = require('./type');
export declare class Project implements type.Project {
    name: string;
    main: type.Module;
    valid: boolean;
    xmile: XMLDocument;
    timespec: type.TimeSpec;
    models: type.ModelSet;
    constructor(xmileDoc: XMLDocument);
    model(name?: string): any;
}
