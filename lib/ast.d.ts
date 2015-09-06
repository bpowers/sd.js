import { SourceLoc } from './lex';
export interface Node {
    pos: SourceLoc;
    end: SourceLoc;
}
export declare class Ident implements Node {
    name: string;
    _pos: SourceLoc;
    _len: number;
    constructor(pos: SourceLoc, name: string);
    pos: SourceLoc;
    end: SourceLoc;
}
export declare class Constant implements Node {
    value: number;
    _pos: SourceLoc;
    _len: number;
    constructor(pos: SourceLoc, value: string);
    pos: SourceLoc;
    end: SourceLoc;
}
export declare class ParenExpr implements Node {
    x: Node;
    _lPos: SourceLoc;
    _rPos: SourceLoc;
    constructor(lPos: SourceLoc, x: Node, rPos: SourceLoc);
    pos: SourceLoc;
    end: SourceLoc;
}
export declare class CallExpr implements Node {
    fun: Node;
    args: Node[];
    _lParenPos: SourceLoc;
    _rParenPos: SourceLoc;
    constructor(fun: Node, lParenPos: SourceLoc, args: Node[], rParenPos: SourceLoc);
    pos: SourceLoc;
    end: SourceLoc;
}
export declare class UnaryExpr implements Node {
    op: string;
    x: Node;
    _opPos: SourceLoc;
    constructor(opPos: SourceLoc, op: string, x: Node);
    pos: SourceLoc;
    end: SourceLoc;
}
export declare class BinaryExpr implements Node {
    op: string;
    l: Node;
    r: Node;
    _opPos: SourceLoc;
    constructor(l: Node, opPos: SourceLoc, op: string, r: Node);
    pos: SourceLoc;
    end: SourceLoc;
}
export declare class IfExpr implements Node {
    cond: Node;
    t: Node;
    f: Node;
    _ifPos: SourceLoc;
    _thenPos: SourceLoc;
    _elsePos: SourceLoc;
    constructor(ifPos: SourceLoc, cond: Node, thenPos: SourceLoc, t: Node, elsePos: SourceLoc, f: Node);
    pos: SourceLoc;
    end: SourceLoc;
}
