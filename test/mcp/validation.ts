/* eslint-env mocha */

import assert from 'assert';
import { McpValidationError } from '../../lib/mcp/errors';
import { asQueryOptions, asString, asStringArray } from '../../lib/mcp/validation';

describe('mcp validation', () => {
  it('parses query options', () => {
    const options = asQueryOptions(
      {
        at: 10,
        limit: 100,
        offset: 5,
        fields: ['id', 'name'],
        orderBy: ['id', '-name'],
        query: 'id GT 1',
        script: true,
      },
      'options',
      true
    );

    assert.deepStrictEqual(options, {
      at: 10,
      limit: 100,
      offset: 5,
      fields: ['id', 'name'],
      orderBy: ['id', '-name'],
      query: 'id GT 1',
      script: true,
    });
  });

  it('rejects invalid limit', () => {
    assert.throws(
      () => asQueryOptions({ limit: 0 }, 'options', true),
      McpValidationError
    );
  });

  it('validates string helpers', () => {
    assert.strictEqual(asString('  abc ', 'name'), 'abc');
    assert.deepStrictEqual(asStringArray(['a', 'b'], 'values'), ['a', 'b']);
  });
});
