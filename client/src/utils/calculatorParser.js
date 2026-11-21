/**
 * Pure local recursive-descent arithmetic expression parser for the browser calculator.
 * Zero eval(), zero Function(), zero network calls.
 *
 * Supported:
 *  - Binary operators: +, -, *, / (also Unicode ×, ÷, −)
 *  - Parentheses: (...)
 *  - Unary + and -
 *  - Percent postfix (%):
 *      a + b%  => a + (a * b / 100)
 *      a - b%  => a - (a * b / 100)
 *      a * b%  => a * (b / 100)
 *      a / b%  => a / (b / 100)
 *      b%      => b / 100
 *  - Rounds intermediate/final results to 12 significant digits to avoid float noise.
 */

class CalcParseError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CalcParseError';
  }
}

const ERR_DIV_ZERO = "Can't divide by zero";
const ERR_SYNTAX = 'Check the numbers';

function normalizeExpression(raw) {
  return String(raw || '')
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−|–/g, '-')
    .replace(/,/g, '')
    .trim();
}

function tokenize(expr) {
  const tokens = [];
  let i = 0;

  while (i < expr.length) {
    const ch = expr[i];

    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }

    if (/[0-9.]/.test(ch)) {
      let numStr = '';
      let dotCount = 0;
      while (i < expr.length && /[0-9.]/.test(expr[i])) {
        if (expr[i] === '.') {
          dotCount += 1;
          if (dotCount > 1) throw new CalcParseError(ERR_SYNTAX);
        }
        numStr += expr[i];
        i += 1;
      }
      if (numStr === '.') throw new CalcParseError(ERR_SYNTAX);
      const numVal = Number(numStr);
      if (!Number.isFinite(numVal)) throw new CalcParseError(ERR_SYNTAX);
      tokens.push({ type: 'NUMBER', value: numVal });
      continue;
    }

    if (ch === '+' || ch === '-' || ch === '*' || ch === '/') {
      tokens.push({ type: 'OP', value: ch });
      i += 1;
      continue;
    }

    if (ch === '(') {
      tokens.push({ type: 'LPAREN' });
      i += 1;
      continue;
    }

    if (ch === ')') {
      tokens.push({ type: 'RPAREN' });
      i += 1;
      continue;
    }

    if (ch === '%') {
      tokens.push({ type: 'PERCENT' });
      i += 1;
      continue;
    }

    throw new CalcParseError(ERR_SYNTAX);
  }

  return tokens;
}

export function roundCalculatorResult(num) {
  if (typeof num !== 'number' || Number.isNaN(num)) {
    throw new CalcParseError(ERR_SYNTAX);
  }
  if (!Number.isFinite(num)) {
    throw new CalcParseError(ERR_DIV_ZERO);
  }
  if (Object.is(num, -0) || num === 0) return 0;
  const rounded = Number(num.toPrecision(12));
  return Object.is(rounded, -0) || rounded === 0 ? 0 : rounded;
}

function resolveNode(node) {
  if (!node.isPercent) return node.val;
  return roundCalculatorResult(node.val / 100);
}

/**
 * Evaluates a math expression string via recursive descent.
 * Returns { ok: true, value: number, formatted: string }
 * or { ok: false, error: "Can't divide by zero" | "Check the numbers" }.
 */
export function evaluateExpression(rawInput) {
  const expr = normalizeExpression(rawInput);
  if (!expr) {
    return { ok: false, error: ERR_SYNTAX };
  }

  try {
    const tokens = tokenize(expr);
    if (tokens.length === 0) {
      return { ok: false, error: ERR_SYNTAX };
    }

    let pos = 0;
    const peek = () => tokens[pos] || null;
    const consume = () => tokens[pos++];

    function parseExpr() {
      let leftNode = parseTerm();
      let acc = resolveNode(leftNode);

      while (peek() && peek().type === 'OP' && (peek().value === '+' || peek().value === '-')) {
        const op = consume().value;
        const rightNode = parseTerm();

        if (rightNode.isPercent) {
          const pctDelta = roundCalculatorResult((acc * rightNode.val) / 100);
          acc = roundCalculatorResult(op === '+' ? acc + pctDelta : acc - pctDelta);
        } else {
          const rightVal = rightNode.val;
          acc = roundCalculatorResult(op === '+' ? acc + rightVal : acc - rightVal);
        }
      }

      return { val: acc, isPercent: false };
    }

    function parseTerm() {
      let current = parseUnary();

      while (peek() && peek().type === 'OP' && (peek().value === '*' || peek().value === '/')) {
        const op = consume().value;
        const leftVal = resolveNode(current);
        const rightNode = parseUnary();
        const rightVal = resolveNode(rightNode);

        if (op === '*') {
          current = { val: roundCalculatorResult(leftVal * rightVal), isPercent: false };
        } else {
          if (rightVal === 0) throw new CalcParseError(ERR_DIV_ZERO);
          current = { val: roundCalculatorResult(leftVal / rightVal), isPercent: false };
        }
      }

      return current;
    }

    function parseUnary() {
      const tok = peek();
      if (tok && tok.type === 'OP' && (tok.value === '+' || tok.value === '-')) {
        consume();
        const inner = parseUnary();
        return {
          val: tok.value === '-' ? roundCalculatorResult(-inner.val) : inner.val,
          isPercent: inner.isPercent
        };
      }
      return parsePostfix();
    }

    function parsePostfix() {
      let node = parsePrimary();
      while (peek() && peek().type === 'PERCENT') {
        consume();
        if (node.isPercent) {
          // Chained percent like 50%% => 0.5%
          node = { val: roundCalculatorResult(node.val / 100), isPercent: true };
        } else {
          node = { val: node.val, isPercent: true };
        }
      }
      return node;
    }

    function parsePrimary() {
      const tok = peek();
      if (!tok) throw new CalcParseError(ERR_SYNTAX);

      if (tok.type === 'NUMBER') {
        consume();
        return { val: tok.value, isPercent: false };
      }

      if (tok.type === 'LPAREN') {
        consume();
        const innerNode = parseExpr();
        const closeTok = peek();
        if (!closeTok || closeTok.type !== 'RPAREN') {
          throw new CalcParseError(ERR_SYNTAX);
        }
        consume();
        return { val: resolveNode(innerNode), isPercent: false };
      }

      throw new CalcParseError(ERR_SYNTAX);
    }

    const rootNode = parseExpr();
    if (pos < tokens.length) {
      throw new CalcParseError(ERR_SYNTAX);
    }

    const finalVal = roundCalculatorResult(resolveNode(rootNode));
    const formatted = String(finalVal);
    return { ok: true, value: finalVal, formatted };
  } catch (err) {
    if (err instanceof CalcParseError) {
      return { ok: false, error: err.message };
    }
    return { ok: false, error: ERR_SYNTAX };
  }
}
