/* eslint-env mocha */

import assert from 'assert';
import {
  escapeOctaneStringValue,
  parseFieldsClause,
  validateFieldExpression,
  validateOctaneQuerySyntax,
} from '../../lib/mcp/querySyntax';

describe('mcp query syntax', () => {
  it('accepts valid cross-filter and logical operators', () => {
    const validation = validateOctaneQuerySyntax(
      'subtype EQ ^defect^;severity EQ {name EQ ^high^}||owner EQ {[current_user]}'
    );
    assert.strictEqual(validation.valid, true);
  });

  it('rejects malformed query syntax', () => {
    const validation = validateOctaneQuerySyntax('owner.name == Ann');
    assert.strictEqual(validation.valid, false);
    assert.ok((validation.message ?? '').length > 0);
  });

  it('parses fields clause with nested references', () => {
    const fields = parseFieldsClause(
      'id,name,team{id,name,team_lead{id,full_name,email}}'
    );
    assert.deepStrictEqual(fields, [
      'id',
      'name',
      'team{id,name,team_lead{id,full_name,email}}',
    ]);
  });

  it('validates individual field expression', () => {
    const validation = validateFieldExpression('team{id,name}');
    assert.strictEqual(validation.valid, true);
  });

  it('escapes special characters in string values', () => {
    const escaped = escapeOctaneStringValue("d'Artagnan ^ high?");
    assert.strictEqual(escaped, 'd\\qArtagnan \\^ high\\?');
  });
});
