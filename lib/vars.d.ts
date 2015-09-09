import * as type from './type';
import * as xmile from './xmile';
import * as ast from './ast';
export declare class CodegenVisitor implements ast.Visitor {
    offsets: type.Offsets;
    code: string;
    isMain: boolean;
    scope: string;
    constructor(offsets: type.Offsets, isMain: boolean);
    ident(n: ast.Ident): boolean;
    constant(n: ast.Constant): boolean;
    call(n: ast.CallExpr): boolean;
    if(n: ast.IfExpr): boolean;
    paren(n: ast.ParenExpr): boolean;
    unary(n: ast.UnaryExpr): boolean;
    binary(n: ast.BinaryExpr): boolean;
    private refTime();
    private refDirect(ident);
    private refIndirect(ident);
}
export declare class Variable implements type.Variable {
    xmile: xmile.Variable;
    valid: boolean;
    ident: string;
    eqn: string;
    ast: ast.Node;
    project: type.Project;
    parent: type.Model;
    model: type.Model;
    _deps: type.StringSet;
    _allDeps: type.StringSet;
    constructor(model?: type.Model, v?: xmile.Variable);
    initialEquation(): string;
    code(offsets: type.Offsets): string;
    getDeps(): type.StringSet;
    lessThan(that: Variable): boolean;
    isConst(): boolean;
}
export declare class Stock extends Variable {
    initial: string;
    inflows: string[];
    outflows: string[];
    constructor(model: type.Model, v: xmile.Variable);
    initialEquation(): string;
    code(v: type.Offsets): string;
}
export declare class Table extends Variable {
    x: number[];
    y: number[];
    ok: boolean;
    constructor(model: type.Model, v: xmile.Variable);
    code(v: type.Offsets): string;
}
export declare class Module extends Variable implements type.Module {
    modelName: string;
    refs: type.ReferenceMap;
    constructor(project: type.Project, parent: type.Model, v: xmile.Variable);
    getDeps(): type.StringSet;
    referencedModels(all?: type.ModelDefSet): type.ModelDefSet;
}
export declare class Reference extends Variable implements type.Reference {
    xmileConn: xmile.Connection;
    ptr: string;
    constructor(conn: xmile.Connection);
    code(v: type.Offsets): string;
    lessThan(that: Variable): boolean;
    isConst(): boolean;
}
