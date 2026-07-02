/* eslint-env mocha */

import assert from 'assert';
import { Params } from '../../lib/root/octane';
import { OctaneClient } from '../../lib/mcp/types';
import { OctaneSessionStore } from '../../lib/mcp/sessionStore';
import { createStartupConfiguration } from '../../lib/mcp/startup';

class StubClient implements OctaneClient {
  at(): OctaneClient { return this; }
  limit(): OctaneClient { return this; }
  offset(): OctaneClient { return this; }
  fields(): OctaneClient { return this; }
  orderBy(): OctaneClient { return this; }
  query(): OctaneClient { return this; }
  script(): OctaneClient { return this; }
  get(): OctaneClient { return this; }
  create(): OctaneClient { return this; }
  update(): OctaneClient { return this; }
  updateBulk(): OctaneClient { return this; }
  delete(): OctaneClient { return this; }
  getAttachmentContent(): OctaneClient { return this; }
  uploadAttachment(): OctaneClient { return this; }
  async authenticate(): Promise<unknown> { return {}; }
  async signOut(): Promise<unknown> { return {}; }
  async executeCustomRequest(): Promise<unknown> { return {}; }
  async execute(): Promise<unknown> { return {}; }
}

describe('mcp startup configuration', () => {
  it('creates handlers without startup session when no args', () => {
    const startup = createStartupConfiguration([]);
    assert.strictEqual(startup.showHelp, false);
    assert.ok(startup.handlers);
  });

  it('returns help payload', () => {
    const startup = createStartupConfiguration(['--help']);
    assert.strictEqual(startup.showHelp, true);
    assert.ok(
      startup.helpText &&
        startup.helpText.includes('--auth <credentials|client-credentials|token>')
    );
  });

  it('preconnects default session from cli args', () => {
    const store = new OctaneSessionStore((_params: Params) => new StubClient());
    const startup = createStartupConfiguration(
      [
        '--server-url',
        'https://octane.example.com',
        '--shared-space-id',
        '1001',
        '--workspace-id',
        '1002',
        '--auth',
        'token',
        '--bearer-token',
        'abc',
      ],
      store
    );

    assert.strictEqual(startup.showHelp, false);
    assert.strictEqual(store.getDescriptor('default').server, 'https://octane.example.com');
    assert.strictEqual(store.getDescriptor('default').authMode, 'token');
  });

  it('preconnects session from client-credentials args', () => {
    const store = new OctaneSessionStore((_params: Params) => new StubClient());
    const startup = createStartupConfiguration(
      [
        '--server-url',
        'https://octane.example.com',
        '--shared-space-id',
        '1001',
        '--workspace-id',
        '1002',
        '--auth',
        'client-credentials',
        '--client-id',
        'cid',
        '--client-secret',
        'csecret',
      ],
      store
    );

    assert.strictEqual(startup.showHelp, false);
    assert.strictEqual(store.getDescriptor('default').authMode, 'credentials');
  });
});
