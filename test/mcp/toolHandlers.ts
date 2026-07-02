/* eslint-env mocha */

import assert from 'assert';
import { OctaneSessionStore } from '../../lib/mcp/sessionStore';
import { McpToolHandlers } from '../../lib/mcp/toolHandlers';
import { OctaneClient } from '../../lib/mcp/types';

class FakeOctaneClient implements OctaneClient {
  calls: string[];
  executeResult: unknown;
  constructor() {
    this.calls = [];
    this.executeResult = { ok: true };
  }

  at(id: number): OctaneClient { this.calls.push(`at:${id}`); return this; }
  limit(limit: number): OctaneClient { this.calls.push(`limit:${limit}`); return this; }
  offset(offset: number): OctaneClient { this.calls.push(`offset:${offset}`); return this; }
  fields(...fieldNames: string[]): OctaneClient { this.calls.push(`fields:${fieldNames.join(',')}`); return this; }
  orderBy(...fieldNames: string[]): OctaneClient { this.calls.push(`orderBy:${fieldNames.join(',')}`); return this; }
  query(query: string): OctaneClient { this.calls.push(`query:${query}`); return this; }
  script(): OctaneClient { this.calls.push('script'); return this; }
  get(entityName: string): OctaneClient { this.calls.push(`get:${entityName}`); return this; }
  create(entityName: string): OctaneClient { this.calls.push(`create:${entityName}`); return this; }
  update(entityName: string): OctaneClient { this.calls.push(`update:${entityName}`); return this; }
  updateBulk(entityName: string): OctaneClient { this.calls.push(`updateBulk:${entityName}`); return this; }
  delete(entityName: string): OctaneClient { this.calls.push(`delete:${entityName}`); return this; }
  getAttachmentContent(): OctaneClient { this.calls.push('getAttachmentContent'); return this; }
  uploadAttachment(
    attachmentName: string,
    _attachmentData: object | string,
    ownerName: string,
    _ownerReference: object
  ): OctaneClient {
    this.calls.push(`uploadAttachment:${attachmentName}:${ownerName}`);
    return this;
  }
  async authenticate(): Promise<unknown> { this.calls.push('authenticate'); return { authenticated: true }; }
  async signOut(): Promise<unknown> { this.calls.push('signOut'); return { signedOut: true }; }
  async executeCustomRequest(customUrl: string, operation: string): Promise<unknown> {
    this.calls.push(`executeCustomRequest:${operation}:${customUrl}`);
    return { custom: true };
  }
  async execute(): Promise<unknown> { this.calls.push('execute'); return this.executeResult; }
}

function textResult(result: { content: Array<{ text: string }> }): unknown {
  return JSON.parse(result.content[0].text);
}

describe('mcp tool handlers', () => {
  it('reuses preconfigured default session on connect without params', async () => {
    const client = new FakeOctaneClient();
    const store = new OctaneSessionStore(() => client);
    const handlers = new McpToolHandlers(store);

    await handlers.runTool('connect', {
      sessionId: 'default',
      server: 'https://example',
      sharedSpace: 1001,
      workspace: 1002,
      token: 'abc',
    });

    const result = await handlers.runTool('connect', {});
    const payload = textResult(result as { content: Array<{ text: string }> }) as {
      connected: boolean;
      reused: boolean;
      session: { sessionId: string };
    };
    assert.strictEqual(payload.connected, true);
    assert.strictEqual(payload.reused, true);
    assert.strictEqual(payload.session.sessionId, 'default');
  });

  it('connects and returns session status', async () => {
    const client = new FakeOctaneClient();
    const store = new OctaneSessionStore(() => client);
    const handlers = new McpToolHandlers(store);

    await handlers.runTool('connect', {
      sessionId: 's1',
      server: 'https://example',
      sharedSpace: 1001,
      workspace: 1002,
      token: 'abc',
    });
    const result = await handlers.runTool('session_status', { sessionId: 's1' });
    const payload = textResult(result as { content: Array<{ text: string }> }) as {
      connected: boolean;
      session: { sessionId: string };
    };
    assert.strictEqual(payload.connected, true);
    assert.strictEqual(payload.session.sessionId, 's1');
  });

  it('executes get with query options', async () => {
    const client = new FakeOctaneClient();
    const store = new OctaneSessionStore(() => client);
    const handlers = new McpToolHandlers(store);

    await handlers.runTool('connect', {
      sessionId: 's1',
      server: 'https://example',
      sharedSpace: 1001,
      workspace: 1002,
      token: 'abc',
    });

    it('uses default session when sessionId is omitted', async () => {
      const client = new FakeOctaneClient();
      const store = new OctaneSessionStore(() => client);
      const handlers = new McpToolHandlers(store);

      await handlers.runTool('connect', {
        server: 'https://example',
        sharedSpace: 1001,
        workspace: 1002,
        token: 'abc',
      });
      await handlers.runTool('octane_get', {
        entityName: 'defects',
        options: { at: 42 },
      });

      assert.deepStrictEqual(client.calls, ['at:42', 'get:defects', 'execute']);
    });
    await handlers.runTool('octane_get', {
      sessionId: 's1',
      entityName: 'defects',
      options: {
        at: 17,
        fields: ['id', 'name'],
        orderBy: ['id'],
        query: 'id GT 1',
      },
    });

    assert.deepStrictEqual(client.calls, [
      'at:17',
      'fields:id,name',
      'orderBy:id',
      'query:id GT 1',
      'get:defects',
      'execute',
    ]);
  });

  it('returns base64 for attachment content', async () => {
    const client = new FakeOctaneClient();
    client.executeResult = Buffer.from('abc', 'utf8');
    const store = new OctaneSessionStore(() => client);
    const handlers = new McpToolHandlers(store);

    await handlers.runTool('connect', {
      sessionId: 's1',
      server: 'https://example',
      sharedSpace: 1001,
      workspace: 1002,
      token: 'abc',
    });
    const result = await handlers.runTool('octane_get_attachment_content', {
      sessionId: 's1',
      options: { at: 5 },
    });

    const payload = textResult(result as { content: Array<{ text: string }> }) as {
      attachmentDataBase64: string;
    };
    assert.strictEqual(payload.attachmentDataBase64, Buffer.from('abc').toString('base64'));
  });

  it('rejects delete without selector', async () => {
    const client = new FakeOctaneClient();
    const store = new OctaneSessionStore(() => client);
    const handlers = new McpToolHandlers(store);

    await handlers.runTool('connect', {
      sessionId: 's1',
      server: 'https://example',
      sharedSpace: 1001,
      workspace: 1002,
      token: 'abc',
    });

    await assert.rejects(
      async () =>
        handlers.runTool('octane_delete', {
          sessionId: 's1',
          entityName: 'defects',
          options: {},
        })
    );
  });
});
