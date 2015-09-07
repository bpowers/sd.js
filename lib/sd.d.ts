import * as common from './common';
import { Model } from './model';
export { Project } from './project';
export { Model } from './model';
export declare const Errors: typeof common.Errors;
export declare function newModel(xmlDoc: any): Model;
export declare function load(url: string, cb: (m: Model) => void, errCb: (r: XMLHttpRequest) => void): void;
export default function error(): string;
