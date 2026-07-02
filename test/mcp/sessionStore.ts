/* eslint-env mocha */

import assert from 'assert';
import { Params } from '../../lib/root/octane';
import { OctaneClient } from '../../lib/mcp/types';
import { OctaneSessionStore } from '../../lib/mcp/sessionStore';

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

describe('mcp session store', () => {
  it('connects and retrieves descriptors', () => {
    const store = new OctaneSessionStore((_params: Params) => new StubClient());
    const descriptor = store.connect('s1', {
      server: 'https://example',
      sharedSpace: 1001,
      workspace: 1002,
      user: 'user',
      password: 'pass',
    });

    assert.strictEqual(descriptor.sessionId, 's1');
    assert.strictEqual(descriptor.authMode, 'credentials');
    assert.strictEqual(store.getDescriptor('s1').workspace, 1002);
    assert.strictEqual(store.list().length, 1);
  });

  it('disconnects existing sessions', () => {
    const store = new OctaneSessionStore((_params: Params) => new StubClient());
    store.connect('s1', {
      server: 'https://example',
      sharedSpace: 1001,
      workspace: 1002,
      token: 'abc',
    });

    assert.strictEqual(store.disconnect('s1'), true);
    assert.strictEqual(store.disconnect('s1'), false);
  });
});
