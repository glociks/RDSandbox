/**
 * Secure, High-Performance Recursive-Descent Math Tokenizer, AST Parser & Compiler.
 *
 * Compiles mathematical expressions into optimized execution closures with zero
 * usage of `eval()` or `new Function()`, preventing arbitrary code execution and
 * Content Security Policy (CSP) violations.
 */

export interface MathEvalContext {
    x: number;
    y: number;
    w: number;
    h: number;
    nx: number;
    ny: number;
    r: number;
    theta: number;
    t: number;
    pi: number;
    e: number;
    [key: string]: number | undefined;
}

export type MathCompiledFunc = (ctx: MathEvalContext) => number;

type TokenType = 
    | 'NUMBER'
    | 'IDENT'
    | 'PLUS'
    | 'MINUS'
    | 'MUL'
    | 'DIV'
    | 'MOD'
    | 'POW'
    | 'LPAREN'
    | 'RPAREN'
    | 'COMMA'
    | 'LT'
    | 'GT'
    | 'LTE'
    | 'GTE'
    | 'EQ'
    | 'NEQ'
    | 'AND'
    | 'OR'
    | 'NOT'
    | 'EOF';

interface Token {
    type: TokenType;
    value: string | number;
}

// Tokenizer
function tokenize(expr: string): Token[] {
    const tokens: Token[] = [];
    let i = 0;
    const len = expr.length;

    while (i < len) {
        const ch = expr[i];

        if (/\s/.test(ch)) {
            i++;
            continue;
        }

        // Numbers (including floats)
        if (/[0-9]/.test(ch) || (ch === '.' && i + 1 < len && /[0-9]/.test(expr[i + 1]))) {
            let numStr = '';
            while (i < len && (/[0-9]/.test(expr[i]) || expr[i] === '.')) {
                numStr += expr[i++];
            }
            tokens.push({ type: 'NUMBER', value: parseFloat(numStr) });
            continue;
        }

        // Identifiers / function names / variables
        if (/[a-zA-Z_]/.test(ch)) {
            let idStr = '';
            while (i < len && /[a-zA-Z0-9_.]/.test(expr[i])) {
                idStr += expr[i++];
            }
            // Strip any "Math." prefix if present
            if (idStr.startsWith('Math.')) {
                idStr = idStr.substring(5);
            }
            tokens.push({ type: 'IDENT', value: idStr.toLowerCase() });
            continue;
        }

        // Multi-character comparisons and logic
        if (ch === '&' && i + 1 < len && expr[i + 1] === '&') {
            tokens.push({ type: 'AND', value: '&&' });
            i += 2;
            continue;
        }
        if (ch === '|' && i + 1 < len && expr[i + 1] === '|') {
            tokens.push({ type: 'OR', value: '||' });
            i += 2;
            continue;
        }
        if (ch === '=' && i + 1 < len && expr[i + 1] === '=') {
            tokens.push({ type: 'EQ', value: '==' });
            i += 2;
            continue;
        }
        if (ch === '!' && i + 1 < len && expr[i + 1] === '=') {
            tokens.push({ type: 'NEQ', value: '!=' });
            i += 2;
            continue;
        }
        if (ch === '<' && i + 1 < len && expr[i + 1] === '=') {
            tokens.push({ type: 'LTE', value: '<=' });
            i += 2;
            continue;
        }
        if (ch === '>' && i + 1 < len && expr[i + 1] === '=') {
            tokens.push({ type: 'GTE', value: '>=' });
            i += 2;
            continue;
        }

        // Single character operators
        switch (ch) {
            case '+': tokens.push({ type: 'PLUS', value: '+' }); break;
            case '-': tokens.push({ type: 'MINUS', value: '-' }); break;
            case '*': tokens.push({ type: 'MUL', value: '*' }); break;
            case '/': tokens.push({ type: 'DIV', value: '/' }); break;
            case '%': tokens.push({ type: 'MOD', value: '%' }); break;
            case '^': tokens.push({ type: 'POW', value: '^' }); break;
            case '(': tokens.push({ type: 'LPAREN', value: '(' }); break;
            case ')': tokens.push({ type: 'RPAREN', value: ')' }); break;
            case ',': tokens.push({ type: 'COMMA', value: ',' }); break;
            case '<': tokens.push({ type: 'LT', value: '<' }); break;
            case '>': tokens.push({ type: 'GT', value: '>' }); break;
            case '!': tokens.push({ type: 'NOT', value: '!' }); break;
            default:
                break;
        }
        i++;
    }

    tokens.push({ type: 'EOF', value: '' });
    return tokens;
}

// AST Nodes
type ASTNode = 
    | { type: 'num'; val: number }
    | { type: 'var'; name: keyof MathEvalContext }
    | { type: 'unary'; op: '+' | '-' | '!'; expr: ASTNode }
    | { type: 'binary'; op: string; left: ASTNode; right: ASTNode }
    | { type: 'call'; name: string; args: ASTNode[] };

class Parser {
    private tokens: Token[];
    private pos: number = 0;

    constructor(tokens: Token[]) {
        this.tokens = tokens;
    }

    private peek(): Token {
        return this.tokens[this.pos] || { type: 'EOF', value: '' };
    }

    private consume(): Token {
        return this.tokens[this.pos++] || { type: 'EOF', value: '' };
    }

    public parse(): ASTNode {
        return this.parseLogicalOr();
    }

    private parseLogicalOr(): ASTNode {
        let left = this.parseLogicalAnd();
        while (this.peek().type === 'OR') {
            const op = this.consume().value as string;
            const right = this.parseLogicalAnd();
            left = { type: 'binary', op, left, right };
        }
        return left;
    }

    private parseLogicalAnd(): ASTNode {
        let left = this.parseEquality();
        while (this.peek().type === 'AND') {
            const op = this.consume().value as string;
            const right = this.parseEquality();
            left = { type: 'binary', op, left, right };
        }
        return left;
    }

    private parseEquality(): ASTNode {
        let left = this.parseRelational();
        while (this.peek().type === 'EQ' || this.peek().type === 'NEQ') {
            const op = this.consume().value as string;
            const right = this.parseRelational();
            left = { type: 'binary', op, left, right };
        }
        return left;
    }

    private parseRelational(): ASTNode {
        let left = this.parseAddSub();
        while (['LT', 'GT', 'LTE', 'GTE'].includes(this.peek().type)) {
            const op = this.consume().value as string;
            const right = this.parseAddSub();
            left = { type: 'binary', op, left, right };
        }
        return left;
    }

    private parseAddSub(): ASTNode {
        let left = this.parseMulDiv();
        while (this.peek().type === 'PLUS' || this.peek().type === 'MINUS') {
            const op = this.consume().value as string;
            const right = this.parseMulDiv();
            left = { type: 'binary', op, left, right };
        }
        return left;
    }

    private parseMulDiv(): ASTNode {
        let left = this.parsePower();
        while (this.peek().type === 'MUL' || this.peek().type === 'DIV' || this.peek().type === 'MOD') {
            const op = this.consume().value as string;
            const right = this.parsePower();
            left = { type: 'binary', op, left, right };
        }
        return left;
    }

    private parsePower(): ASTNode {
        let left = this.parseUnary();
        if (this.peek().type === 'POW') {
            this.consume();
            const right = this.parsePower();
            return { type: 'binary', op: '^', left, right };
        }
        return left;
    }

    private parseUnary(): ASTNode {
        const p = this.peek();
        if (p.type === 'PLUS' || p.type === 'MINUS' || p.type === 'NOT') {
            const op = this.consume().value as '+' | '-' | '!';
            const expr = this.parseUnary();
            return { type: 'unary', op, expr };
        }
        return this.parsePrimary();
    }

    private parsePrimary(): ASTNode {
        const token = this.consume();

        if (token.type === 'NUMBER') {
            return { type: 'num', val: token.value as number };
        }

        if (token.type === 'IDENT') {
            const name = token.value as string;

            if (this.peek().type === 'LPAREN') {
                this.consume();
                const args: ASTNode[] = [];
                if (this.peek().type !== 'RPAREN') {
                    args.push(this.parse());
                    while (this.peek().type === 'COMMA') {
                        this.consume();
                        args.push(this.parse());
                    }
                }
                if (this.peek().type === 'RPAREN') {
                    this.consume();
                }
                return { type: 'call', name, args };
            }

            if (name === 'pi' || name === 'math_pi') return { type: 'var', name: 'pi' };
            if (name === 'e' || name === 'math_e') return { type: 'var', name: 'e' };

            if (['x', 'y', 'w', 'h', 'nx', 'ny', 'r', 'theta', 't'].includes(name)) {
                return { type: 'var', name: name as keyof MathEvalContext };
            }

            return { type: 'num', val: 0 };
        }

        if (token.type === 'LPAREN') {
            const expr = this.parse();
            if (this.peek().type === 'RPAREN') {
                this.consume();
            }
            return expr;
        }

        return { type: 'num', val: 0 };
    }
}

function simpleNoise(x: number, y: number): number {
    const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return n - Math.floor(n);
}

function compileNode(node: ASTNode): (ctx: MathEvalContext) => number {
    switch (node.type) {
        case 'num': {
            const v = node.val;
            return () => v;
        }
        case 'var': {
            const key = node.name;
            return (ctx) => ctx[key] ?? 0;
        }
        case 'unary': {
            const fn = compileNode(node.expr);
            if (node.op === '-') return (ctx) => -fn(ctx);
            if (node.op === '+') return (ctx) => +fn(ctx);
            if (node.op === '!') return (ctx) => (fn(ctx) ? 0 : 1);
            return fn;
        }
        case 'binary': {
            const l = compileNode(node.left);
            const r = compileNode(node.right);
            switch (node.op) {
                case '+': return (ctx) => l(ctx) + r(ctx);
                case '-': return (ctx) => l(ctx) - r(ctx);
                case '*': return (ctx) => l(ctx) * r(ctx);
                case '/': return (ctx) => {
                    const denom = r(ctx);
                    return denom === 0 ? 0 : l(ctx) / denom;
                };
                case '%': return (ctx) => {
                    const denom = r(ctx);
                    return denom === 0 ? 0 : l(ctx) % denom;
                };
                case '^': return (ctx) => Math.pow(l(ctx), r(ctx));
                case '<': return (ctx) => (l(ctx) < r(ctx) ? 1 : 0);
                case '>': return (ctx) => (l(ctx) > r(ctx) ? 1 : 0);
                case '<=': return (ctx) => (l(ctx) <= r(ctx) ? 1 : 0);
                case '>=': return (ctx) => (l(ctx) >= r(ctx) ? 1 : 0);
                case '==': return (ctx) => (Math.abs(l(ctx) - r(ctx)) < 1e-7 ? 1 : 0);
                case '!=': return (ctx) => (Math.abs(l(ctx) - r(ctx)) >= 1e-7 ? 1 : 0);
                case '&&': return (ctx) => (l(ctx) !== 0 && r(ctx) !== 0 ? 1 : 0);
                case '||': return (ctx) => (l(ctx) !== 0 || r(ctx) !== 0 ? 1 : 0);
                default: return () => 0;
            }
        }
        case 'call': {
            const argFns = node.args.map(compileNode);
            const name = node.name;

            switch (name) {
                case 'sin': return (ctx) => Math.sin(argFns[0]?.(ctx) ?? 0);
                case 'cos': return (ctx) => Math.cos(argFns[0]?.(ctx) ?? 0);
                case 'tan': return (ctx) => Math.tan(argFns[0]?.(ctx) ?? 0);
                case 'asin': return (ctx) => Math.asin(Math.max(-1, Math.min(1, argFns[0]?.(ctx) ?? 0)));
                case 'acos': return (ctx) => Math.acos(Math.max(-1, Math.min(1, argFns[0]?.(ctx) ?? 0)));
                case 'atan': return (ctx) => Math.atan(argFns[0]?.(ctx) ?? 0);
                case 'atan2': return (ctx) => Math.atan2(argFns[0]?.(ctx) ?? 0, argFns[1]?.(ctx) ?? 0);
                case 'sinh': return (ctx) => Math.sinh(argFns[0]?.(ctx) ?? 0);
                case 'cosh': return (ctx) => Math.cosh(argFns[0]?.(ctx) ?? 0);
                case 'tanh': return (ctx) => Math.tanh(argFns[0]?.(ctx) ?? 0);
                case 'exp': return (ctx) => Math.exp(Math.min(50, argFns[0]?.(ctx) ?? 0));
                case 'log':
                case 'ln': return (ctx) => {
                    const v = argFns[0]?.(ctx) ?? 0;
                    return v > 0 ? Math.log(v) : 0;
                };
                case 'sqrt': return (ctx) => {
                    const v = argFns[0]?.(ctx) ?? 0;
                    return v >= 0 ? Math.sqrt(v) : 0;
                };
                case 'cbrt': return (ctx) => Math.cbrt(argFns[0]?.(ctx) ?? 0);
                case 'abs': return (ctx) => Math.abs(argFns[0]?.(ctx) ?? 0);
                case 'min': return (ctx) => Math.min(argFns[0]?.(ctx) ?? 0, argFns[1]?.(ctx) ?? 0);
                case 'max': return (ctx) => Math.max(argFns[0]?.(ctx) ?? 0, argFns[1]?.(ctx) ?? 0);
                case 'floor': return (ctx) => Math.floor(argFns[0]?.(ctx) ?? 0);
                case 'ceil': return (ctx) => Math.ceil(argFns[0]?.(ctx) ?? 0);
                case 'round': return (ctx) => Math.round(argFns[0]?.(ctx) ?? 0);
                case 'sign': return (ctx) => Math.sign(argFns[0]?.(ctx) ?? 0);
                case 'fract': return (ctx) => {
                    const v = argFns[0]?.(ctx) ?? 0;
                    return v - Math.floor(v);
                };
                case 'clamp': return (ctx) => {
                    const val = argFns[0]?.(ctx) ?? 0;
                    const min = argFns[1]?.(ctx) ?? 0;
                    const max = argFns[2]?.(ctx) ?? 1;
                    return Math.max(min, Math.min(max, val));
                };
                case 'hypot': return (ctx) => Math.hypot(argFns[0]?.(ctx) ?? 0, argFns[1]?.(ctx) ?? 0);
                case 'noise': return (ctx) => simpleNoise(argFns[0]?.(ctx) ?? 0, argFns[1]?.(ctx) ?? 0);
                case 'pow': return (ctx) => Math.pow(argFns[0]?.(ctx) ?? 0, argFns[1]?.(ctx) ?? 0);
                default: return () => 0;
            }
        }
    }
}

const compiledCache = new Map<string, MathCompiledFunc>();

export function compileSafeMathExpression(expr: string): MathCompiledFunc {
    if (!expr || typeof expr !== 'string' || expr.length > 1000) {
        return () => 0;
    }
    const cleanExpr = expr.trim();
    if (cleanExpr.length === 0 || cleanExpr.length > 1000) {
        return () => 0;
    }
    const cached = compiledCache.get(cleanExpr);
    if (cached) return cached;

    try {
        const tokens = tokenize(cleanExpr);
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const compiled = compileNode(ast);

        if (compiledCache.size > 200) {
            const firstKey = compiledCache.keys().next().value;
            if (firstKey) compiledCache.delete(firstKey);
        }
        compiledCache.set(cleanExpr, compiled);
        return compiled;
    } catch (err) {
        console.warn('[MathParser] Failed to parse expression:', expr, err);
        const fallback: MathCompiledFunc = () => 0;
        return fallback;
    }
}
