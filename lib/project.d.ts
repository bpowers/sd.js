import type = require('./type');
export declare class Project implements type.Project {
    name: string;
    valid: boolean;
    main: type.Module;
    xmile: XMLDocument;
    timespec: type.TimeSpec;
    models: type.ModelSet;
    constructor(xmileDoc: XMLDocument);
    model(name?: string): any;
    addDocument(xmileDoc: XMLDocument, isMain?: boolean): boolean;
}
