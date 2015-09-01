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
export declare class Lexer {
    text: string;
    orig: string;
    _len: number;
    _pos: number;
    _line: number;
    _lstart: number;
    _peek: string;
    _tpeek: Token;
    constructor(text: string);
    peek(): Token;
    _nextRune(): string;
    _skipWhitespace(): void;
    _fastForward(num: number): void;
    _lexIdentifier(startPos: SourceLoc): Token;
    _lexNumber(startPos: SourceLoc): Token;
    nextTok(): Token;
}
export declare function identifierSet(str: string): StringSet;
