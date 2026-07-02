/* eslint-env mocha */

import assert from 'assert';
import { McpValidationError } from '../../lib/mcp/errors';
import { getCliHelpText, parseCliArgs } from '../../lib/mcp/cliArgs';

describe('mcp cli args', () => {
  it('returns empty startup config when no args provided', () => {
    const result = parseCliArgs([]);
    assert.strictEqual(result.showHelp, false);
    assert.strictEqual(result.startupConnection, undefined);
  });

  it('parses credentials startup config', () => {
    const result = parseCliArgs([
      '--server-url',
      'https://octane.example.com',
      '--shared-space-id',
      '1001',
      '--workspace-id',
      '1002',
      '--auth',
      'credentials',
      '--username',
      'alice',
      '--password',
      'secret',
    ]);

    assert.deepStrictEqual(result.startupConnection, {
      sessionId: 'default',
      server: 'https://octane.example.com',
      sharedSpace: 1001,
      workspace: 1002,
      user: 'alice',
      password: 'secret',
    });
  });

  it('parses token startup config', () => {
    const result = parseCliArgs([
      '--server-url',
      'https://octane.example.com',
      '--shared-space-id',
      '1001',
      '--workspace-id',
      '1002',
      '--auth',
      'token',
      '--bearer-token',
      'tok123',
      '--session-id',
      'workspace-a',
    ]);

    assert.deepStrictEqual(result.startupConnection, {
      sessionId: 'workspace-a',
      server: 'https://octane.example.com',
      sharedSpace: 1001,
      workspace: 1002,
      token: 'tok123',
    });
  });

  it('throws when auth mode specific args are missing', () => {
    assert.throws(
      () =>
        parseCliArgs([
          '--server-url',
          'https://octane.example.com',
          '--shared-space-id',
          '1001',
          '--workspace-id',
          '1002',
          '--auth',
          'credentials',
          '--username',
          'alice',
        ]),
      McpValidationError
    );

    assert.throws(
      () =>
        parseCliArgs([
          '--server-url',
          'https://octane.example.com',
          '--shared-space-id',
          '1001',
          '--workspace-id',
          '1002',
          '--auth',
          'token',
        ]),
      McpValidationError
    );
  });

  it('returns help mode and help text', () => {
    const result = parseCliArgs(['--help']);
    assert.strictEqual(result.showHelp, true);
    assert.ok(getCliHelpText().includes('--server-url <url>'));
  });
});
