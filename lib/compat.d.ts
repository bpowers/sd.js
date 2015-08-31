export interface Vendor {
    match(xmile: any): boolean;
    translate(xmile: any): boolean;
}
export declare const vendors: {
    [name: string]: Vendor;
};
