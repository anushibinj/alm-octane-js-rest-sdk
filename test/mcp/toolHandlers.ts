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
  it('hides session setup tools when a startup session exists', async () => {
    const client = new FakeOctaneClient();
    const store = new OctaneSessionStore(() => client);
    store.connect('default', {
      server: 'https://example',
      sharedSpace: 1001,
      workspace: 1002,
      token: 'abc',
    });
    const handlers = new McpToolHandlers(store);

    const names = handlers.listTools().map((tool) => tool.name);
    assert.ok(!names.includes('connect'));
    assert.ok(!names.includes('authenticate'));
    assert.ok(names.includes('octane_get'));
  });

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

  it('reuses preconfigured default session when connect arguments are omitted', async () => {
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

    const result = await handlers.runTool('connect', undefined);
    const payload = textResult(result as { content: Array<{ text: string }> }) as {
      connected: boolean;
      reused: boolean;
    };
    assert.strictEqual(payload.connected, true);
    assert.strictEqual(payload.reused, true);
  });

  it('connects using clientId/clientSecret', async () => {
    const client = new FakeOctaneClient();
    const store = new OctaneSessionStore(() => client);
    const handlers = new McpToolHandlers(store);

    const result = await handlers.runTool('connect', {
      sessionId: 'ci',
      server: 'https://example',
      sharedSpace: 1001,
      workspace: 1002,
      clientId: 'cid',
      clientSecret: 'csecret',
    });

    const payload = textResult(result as { content: Array<{ text: string }> }) as {
      connected: boolean;
      session: { authMode: string };
    };
    assert.strictEqual(payload.connected, true);
    assert.strictEqual(payload.session.authMode, 'credentials');
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

  it('returns default session status when args are omitted', async () => {
    const client = new FakeOctaneClient();
    const store = new OctaneSessionStore(() => client);
    const handlers = new McpToolHandlers(store);

    await handlers.runTool('connect', {
      server: 'https://example',
      sharedSpace: 1001,
      workspace: 1002,
      token: 'abc',
    });
    const result = await handlers.runTool('session_status', undefined);
    const payload = textResult(result as { content: Array<{ text: string }> }) as {
      connected: boolean;
      session: { sessionId: string };
    };

    assert.strictEqual(payload.connected, true);
    assert.strictEqual(payload.session.sessionId, 'default');
  });

  it('returns non-throwing disconnected status for unknown session', async () => {
    const client = new FakeOctaneClient();
    const store = new OctaneSessionStore(() => client);
    const handlers = new McpToolHandlers(store);

    const result = await handlers.runTool('session_status', { sessionId: 'missing' });
    const payload = textResult(result as { content: Array<{ text: string }> }) as {
      connected: boolean;
      sessionId: string;
      message: string;
    };
    assert.strictEqual(payload.connected, false);
    assert.strictEqual(payload.sessionId, 'missing');
    assert.ok(payload.message.includes('not found'));
  });

  it('lists active sessions', async () => {
    const client = new FakeOctaneClient();
    const store = new OctaneSessionStore(() => client);
    const handlers = new McpToolHandlers(store);

    await handlers.runTool('connect', {
      sessionId: 'a',
      server: 'https://example',
      sharedSpace: 1001,
      workspace: 1002,
      token: 'abc',
    });
    const result = await handlers.runTool('list_sessions', {});
    const payload = textResult(result as { content: Array<{ text: string }> }) as {
      sessions: Array<{ sessionId: string }>;
    };
    assert.strictEqual(payload.sessions.length, 1);
    assert.strictEqual(payload.sessions[0].sessionId, 'a');
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

  it('gets ticket details and infers title field', async () => {
    const client = new FakeOctaneClient();
    client.executeResult = { id: 5519852, name: 'My Ticket Title', type: 'work_item' };
    const store = new OctaneSessionStore(() => client);
    const handlers = new McpToolHandlers(store);

    await handlers.runTool('connect', {
      sessionId: 's1',
      server: 'https://example',
      sharedSpace: 1001,
      workspace: 1002,
      token: 'abc',
    });
    const result = await handlers.runTool('octane_get_ticket_details', {
      sessionId: 's1',
      ticketId: 5519852,
      requestedDetail: 'title',
    });
    const payload = textResult(result as { content: Array<{ text: string }> }) as {
      ticketId: number;
      selectedFields: string[];
      details: { name: string };
    };
    assert.strictEqual(payload.ticketId, 5519852);
    assert.deepStrictEqual(payload.selectedFields, ['name']);
    assert.strictEqual(payload.details.name, 'My Ticket Title');
    assert.deepStrictEqual(client.calls, ['get:work_items', 'at:5519852', 'fields:name', 'execute']);
  });

  it('gets ticket details and infers multiple fields', async () => {
    const client = new FakeOctaneClient();
    client.executeResult = { id: 5519852, phase: { id: 1 }, owner: { id: 2 } };
    const store = new OctaneSessionStore(() => client);
    const handlers = new McpToolHandlers(store);

    await handlers.runTool('connect', {
      sessionId: 's1',
      server: 'https://example',
      sharedSpace: 1001,
      workspace: 1002,
      token: 'abc',
    });
    const result = await handlers.runTool('octane_get_ticket_details', {
      sessionId: 's1',
      ticketId: 5519852,
      requestedDetail: 'status and owner',
    });
    const payload = textResult(result as { content: Array<{ text: string }> }) as {
      selectedFields: string[];
    };
    assert.deepStrictEqual(payload.selectedFields, ['phase', 'owner']);
    assert.deepStrictEqual(
      client.calls,
      ['get:work_items', 'at:5519852', 'fields:phase,owner', 'execute']
    );
  });

  it('generates query string from natural language and validates it', async () => {
    const client = new FakeOctaneClient();
    client.executeResult = { total_count: 1, data: [] };
    const store = new OctaneSessionStore(() => client);
    const handlers = new McpToolHandlers(store);

    await handlers.runTool('connect', {
      sessionId: 's1',
      server: 'https://example',
      sharedSpace: 1001,
      workspace: 1002,
      token: 'abc',
    });
    const result = await handlers.runTool('octane_generate_query_string', {
      sessionId: 's1',
      text: 'Give me a query string for finding all tickets in product Case360',
    });

    const payload = textResult(result as { content: Array<{ text: string }> }) as {
      entityName: string;
      fields: string[];
      query: string;
      queryString: string;
      validation: { attempted: boolean; succeeded: boolean };
    };
    assert.strictEqual(payload.entityName, 'work_items');
    assert.deepStrictEqual(payload.fields, ['id', 'name']);
    assert.strictEqual(payload.query, 'name EQ ^*Case360*^');
    assert.strictEqual(
      payload.queryString,
      'fields=id,name&query=name EQ ^*Case360*^'
    );
    assert.strictEqual(payload.validation.attempted, true);
    assert.strictEqual(payload.validation.succeeded, true);
    assert.deepStrictEqual(client.calls, [
      'get:work_items',
      'fields:id,name',
      'query:name EQ ^*Case360*^',
      'limit:1',
      'execute',
    ]);
  });

  it('generates query string without validation when requested', async () => {
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
    const result = await handlers.runTool('octane_generate_query_string', {
      sessionId: 's1',
      text: 'find unassigned tickets for product Case360',
      validate: false,
    });
    const payload = textResult(result as { content: Array<{ text: string }> }) as {
      query: string;
      validation: { attempted: boolean };
    };
    assert.strictEqual(
      payload.query,
      'owner EQ {null};name EQ ^*Case360*^'
    );
    assert.strictEqual(payload.validation.attempted, false);
    assert.deepStrictEqual(client.calls, []);
  });
});
