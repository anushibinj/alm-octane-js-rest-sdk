export const VALUEEDGE_QUERY_SYNTAX_SOURCES = [
  'https://admhelp.microfocus.com/valueedge/en/latest/Online/Content/API/AboutQuerying.htm',
  'https://admhelp.microfocus.com/valueedge/en/latest/Online/Content/API/Paging.htm',
  'https://admhelp.microfocus.com/valueedge/en/latest/Online/Content/API/fields_clause.htm',
  'https://admhelp.microfocus.com/valueedge/en/latest/Online/Content/API/query_Clause.htm',
  'https://admhelp.microfocus.com/valueedge/en/latest/Online/Content/API/Cross_filtering_relations.htm',
] as const;

export interface SyntaxValidationResult {
  valid: boolean;
  message?: string;
}

interface Token {
  type: TokenType;
  value: string;
  index: number;
}

type TokenType =
  | 'identifier'
  | 'operator'
  | 'number'
  | 'boolean'
  | 'string'
  | 'placeholder'
  | 'null'
  | 'lparen'
  | 'rparen'
  | 'lbrace'
  | 'rbrace'
  | 'and'
  | 'or'
  | 'not'
  | 'comma'
  | 'range'
  | 'eof';

const QUERY_OPERATORS = new Set(['EQ', 'LT', 'GT', 'LE', 'GE', 'IN', 'BTW']);
const PLACEHOLDER_VALUES = new Set(['current_user', 'current_release']);

class QuerySyntaxError extends Error {
  index: number;
  constructor(message: string, index: number) {
    super(`${message} at position ${index}`);
    this.name = 'QuerySyntaxError';
    this.index = index;
  }
}

class QueryParser {
  private readonly tokens: Token[];
  private index = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parse(): void {
    this.parseOrExpression();
    this.expect('eof', 'Unexpected trailing content');
  }

  private parseOrExpression(): void {
    this.parseAndExpression();
    while (this.match('or')) {
      this.parseAndExpression();
    }
  }

  private parseAndExpression(): void {
    this.parseUnaryExpression();
    while (this.match('and')) {
      this.parseUnaryExpression();
    }
  }

  private parseUnaryExpression(): void {
    while (this.match('not')) {
      // Keep consuming chained negations.
    }
    this.parsePrimaryExpression();
  }

  private parsePrimaryExpression(): void {
    if (this.match('lparen')) {
      this.parseOrExpression();
      this.expect('rparen', 'Expected ")"');
      return;
    }
    this.parsePhrase();
  }

  private parsePhrase(): void {
    this.expect('identifier', 'Expected a field name');
    const operator = this.expect('operator', 'Expected a comparison operator').value;
    switch (operator) {
      case 'IN':
        this.parseInValueList();
        return;
      case 'BTW':
        this.parseBetweenRange();
        return;
      default:
        this.parseComparisonValue();
        return;
    }
  }

  private parseComparisonValue(): void {
    if (this.match('lbrace')) {
      this.parseReferenceValue();
      this.expect('rbrace', 'Expected "}"');
      return;
    }
    if (this.match('placeholder')) {
      return;
    }
    this.parseScalarValue(true);
  }

  private parseReferenceValue(): void {
    if (this.match('null')) {
      return;
    }
    if (this.match('placeholder')) {
      return;
    }
    this.parseOrExpression();
  }

  private parseInValueList(): void {
    this.parseInItem();
    while (this.match('comma')) {
      this.parseInItem();
    }
  }

  private parseInItem(): void {
    if (this.match('placeholder')) {
      return;
    }
    this.parseScalarValue(true);
  }

  private parseBetweenRange(): void {
    this.parseBetweenBound();
    this.expect('range', 'Expected "..." in BTW expression');
    this.parseBetweenBound();
  }

  private parseBetweenBound(): void {
    const token = this.peek();
    if (token.type === 'number' || token.type === 'string') {
      this.index += 1;
      return;
    }
    throw new QuerySyntaxError(
      'BTW expects numeric or date-time string bounds wrapped in carets',
      token.index
    );
  }

  private parseScalarValue(allowNull: boolean): void {
    const token = this.peek();
    if (token.type === 'number' || token.type === 'boolean' || token.type === 'string') {
      this.index += 1;
      return;
    }
    if (allowNull && token.type === 'null') {
      this.index += 1;
      return;
    }
    throw new QuerySyntaxError(
      'Expected a value (number, boolean, caret-wrapped string, reference, or null)',
      token.index
    );
  }

  private match(type: TokenType): boolean {
    if (this.peek().type === type) {
      this.index += 1;
      return true;
    }
    return false;
  }

  private expect(type: TokenType, message: string): Token {
    const token = this.peek();
    if (token.type !== type) {
      throw new QuerySyntaxError(message, token.index);
    }
    this.index += 1;
    return token;
  }

  private peek(): Token {
    return this.tokens[this.index];
  }
}

function tokenizeQuery(query: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < query.length) {
    const ch = query[i];
    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }
    if (ch === '(') {
      tokens.push({ type: 'lparen', value: ch, index: i });
      i += 1;
      continue;
    }
    if (ch === ')') {
      tokens.push({ type: 'rparen', value: ch, index: i });
      i += 1;
      continue;
    }
    if (ch === '{') {
      tokens.push({ type: 'lbrace', value: ch, index: i });
      i += 1;
      continue;
    }
    if (ch === '}') {
      tokens.push({ type: 'rbrace', value: ch, index: i });
      i += 1;
      continue;
    }
    if (ch === ';') {
      tokens.push({ type: 'and', value: ch, index: i });
      i += 1;
      continue;
    }
    if (ch === ',') {
      tokens.push({ type: 'comma', value: ch, index: i });
      i += 1;
      continue;
    }
    if (ch === '!') {
      tokens.push({ type: 'not', value: ch, index: i });
      i += 1;
      continue;
    }
    if (ch === '|' && query[i + 1] === '|') {
      tokens.push({ type: 'or', value: '||', index: i });
      i += 2;
      continue;
    }
    if (ch === '.' && query[i + 1] === '.' && query[i + 2] === '.') {
      tokens.push({ type: 'range', value: '...', index: i });
      i += 3;
      continue;
    }
    if (ch === '^') {
      let cursor = i + 1;
      while (cursor < query.length) {
        const current = query[cursor];
        if (current === '\\') {
          cursor += 2;
          continue;
        }
        if (current === '^') {
          break;
        }
        cursor += 1;
      }
      if (cursor >= query.length || query[cursor] !== '^') {
        throw new QuerySyntaxError('Unterminated caret string', i);
      }
      tokens.push({
        type: 'string',
        value: query.substring(i, cursor + 1),
        index: i,
      });
      i = cursor + 1;
      continue;
    }
    if (ch === '[') {
      const end = query.indexOf(']', i + 1);
      if (end === -1) {
        throw new QuerySyntaxError('Unterminated placeholder', i);
      }
      const rawValue = query.substring(i + 1, end).trim().toLowerCase();
      if (!PLACEHOLDER_VALUES.has(rawValue)) {
        throw new QuerySyntaxError(
          'Supported placeholders are [current_user] and [current_release]',
          i
        );
      }
      tokens.push({
        type: 'placeholder',
        value: query.substring(i, end + 1),
        index: i,
      });
      i = end + 1;
      continue;
    }
    if (ch === '-' || /\d/.test(ch)) {
      const start = i;
      if (ch === '-') {
        i += 1;
      }
      let hasDigits = false;
      while (i < query.length && /\d/.test(query[i])) {
        hasDigits = true;
        i += 1;
      }
      if (i < query.length && query[i] === '.') {
        i += 1;
        while (i < query.length && /\d/.test(query[i])) {
          hasDigits = true;
          i += 1;
        }
      }
      if (!hasDigits) {
        throw new QuerySyntaxError('Invalid numeric literal', start);
      }
      tokens.push({
        type: 'number',
        value: query.substring(start, i),
        index: start,
      });
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      const start = i;
      i += 1;
      while (i < query.length && /[A-Za-z0-9_.]/.test(query[i])) {
        i += 1;
      }
      const word = query.substring(start, i);
      const upper = word.toUpperCase();
      if (QUERY_OPERATORS.has(upper)) {
        tokens.push({ type: 'operator', value: upper, index: start });
      } else if (upper === 'TRUE' || upper === 'FALSE') {
        tokens.push({ type: 'boolean', value: upper.toLowerCase(), index: start });
      } else if (upper === 'NULL') {
        tokens.push({ type: 'null', value: 'null', index: start });
      } else {
        tokens.push({ type: 'identifier', value: word, index: start });
      }
      continue;
    }

    throw new QuerySyntaxError(`Unexpected character "${ch}"`, i);
  }

  tokens.push({ type: 'eof', value: '', index: query.length });
  return tokens;
}

class FieldClauseError extends Error {
  constructor(message: string, index: number) {
    super(`${message} at position ${index}`);
    this.name = 'FieldClauseError';
  }
}

class FieldClauseParser {
  private readonly source: string;
  private index = 0;

  constructor(source: string) {
    this.source = source;
  }

  parseTopLevelList(): string[] {
    const fields: string[] = [];
    this.skipWhitespace();
    if (this.index >= this.source.length) {
      return fields;
    }
    while (this.index < this.source.length) {
      const start = this.index;
      this.parseSingleFieldExpression();
      fields.push(this.source.substring(start, this.index).trim());
      this.skipWhitespace();
      if (this.index >= this.source.length) {
        break;
      }
      if (this.source[this.index] !== ',') {
        throw new FieldClauseError('Expected "," between fields', this.index);
      }
      this.index += 1;
      this.skipWhitespace();
    }
    return fields;
  }

  parseSingleFieldExpression(): void {
    this.skipWhitespace();
    this.parseFieldName();
    this.skipWhitespace();
    if (this.peek() === '{') {
      this.index += 1;
      this.skipWhitespace();
      this.parseSingleFieldExpression();
      this.skipWhitespace();
      while (this.peek() === ',') {
        this.index += 1;
        this.skipWhitespace();
        this.parseSingleFieldExpression();
        this.skipWhitespace();
      }
      if (this.peek() !== '}') {
        throw new FieldClauseError('Expected "}" in field expansion', this.index);
      }
      this.index += 1;
    }
    this.skipWhitespace();
  }

  private parseFieldName(): void {
    const start = this.index;
    if (!/[A-Za-z_]/.test(this.peek())) {
      throw new FieldClauseError('Expected a field name', this.index);
    }
    this.index += 1;
    while (/[A-Za-z0-9_.]/.test(this.peek())) {
      this.index += 1;
    }
    const value = this.source.substring(start, this.index);
    if (value.endsWith('.')) {
      throw new FieldClauseError('Field name cannot end with "."', start);
    }
  }

  private skipWhitespace(): void {
    while (this.index < this.source.length && /\s/.test(this.source[this.index])) {
      this.index += 1;
    }
  }

  private peek(): string {
    return this.source[this.index] ?? '';
  }
}

export function parseFieldsClause(fieldsClause: string): string[] {
  const parser = new FieldClauseParser(fieldsClause.trim());
  return parser.parseTopLevelList();
}

export function validateFieldExpression(fieldExpression: string): SyntaxValidationResult {
  try {
    const parser = new FieldClauseParser(fieldExpression.trim());
    parser.parseSingleFieldExpression();
    return { valid: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return { valid: false, message };
  }
}

export function validateOctaneQuerySyntax(query: string): SyntaxValidationResult {
  const trimmed = query.trim();
  if (trimmed.length === 0) {
    return { valid: false, message: 'query must not be empty' };
  }
  try {
    const parser = new QueryParser(tokenizeQuery(trimmed));
    parser.parse();
    return { valid: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return { valid: false, message };
  }
}

export function escapeOctaneStringValue(value: string): string {
  const source = value.trim();
  let escaped = '';
  for (const ch of source) {
    switch (ch) {
      case '\\':
        escaped += '\\\\';
        break;
      case '"':
        escaped += '\\"';
        break;
      case '^':
        escaped += '\\^';
        break;
      case '\'':
        escaped += '\\q';
        break;
      case '<':
        escaped += '\\l';
        break;
      case '>':
        escaped += '\\g';
        break;
      case '{':
        escaped += '\\{';
        break;
      case '(':
        escaped += '\\(';
        break;
      case ')':
        escaped += '\\)';
        break;
      case '[':
        escaped += '\\[';
        break;
      case '?':
        escaped += '\\?';
        break;
      default:
        escaped += ch;
        break;
    }
  }
  return escaped;
}
