import { StringSet } from './type';
export declare const enum TokenType {
    TOKEN = 0,
    IDENT = 1,
    RESERVED = 2,
    NUMBER = 3,
}
export declare const reservedWords: any;
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
export declare class Scanner {
    text: string;
    textOrig: string;
    _len: number;
    _pos: number;
    _peek: string;
    _line: number;
    _lineStart: number;
    constructor(text: string);
    peek: Token;
    _getChar(): string;
    _skipWhitespace(): void;
    _fastForward(num: number): void;
    _lexIdentifier(startPos: SourceLoc): Token;
    _lexNumber(startPos: SourceLoc): Token;
    getToken(): Token;
}
export declare function identifierSet(str: string): StringSet;
