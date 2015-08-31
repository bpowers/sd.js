export declare var err: string;
export declare class Errors {
    static ERR_VERSION: string;
    static ERR_BAD_TIME: string;
}
export interface Properties {
    usesTime?: boolean;
}
export declare const builtins: {
    [name: string]: Properties;
};
export declare const reserved: {
    'if': boolean;
    'then': boolean;
    'else': boolean;
};
