import type = require('./type');
export declare class Project implements type.Project {
    name: string;
    valid: boolean;
    simSpec: type.SimSpec;
    main: type.Module;
    private files;
    private xmile;
    private models;
    constructor(xmileDoc: XMLDocument);
    model(name?: string): any;
    addDocument(xmileDoc: XMLDocument, isMain?: boolean): boolean;
}
