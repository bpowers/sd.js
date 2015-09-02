import { StringSet } from './type';
export declare const enum TokenType {
    TOKEN = 0,
    IDENT = 1,
    RESERVED = 2,
    NUMBER = 3,
}
export declare const RESERVED: any;
export declare class SourceLoc {
    line: number;
    pos: number;
    constructor(line: number, pos: number);
    off(n: number): SourceLoc;
}
export declare class Token {
    tok: string;
    type: TokenType;
    startLoc: SourceLoc;
    endLoc: SourceLoc;
    constructor(tok: string, type: TokenType, startLoc?: SourceLoc, endLoc?: SourceLoc);
    value: number;
}
export declare class Lexer {
    text: string;
    orig: string;
    private len;
    private pos;
    private line;
    private lstart;
    private rpeek;
    private tpeek;
    constructor(text: string);
    peek(): Token;
    nextTok(): Token;
    private nextRune();
    private skipWhitespace();
    private fastForward(num);
    private lexIdentifier(startPos);
    private lexNumber(startPos);
}
export declare function identifierSet(str: string): StringSet;
