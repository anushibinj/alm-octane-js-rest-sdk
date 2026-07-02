/* eslint-env mocha */

import assert from 'assert';
import { dispatchToolCall } from '../../lib/mcp/server';
import { McpToolHandlers, McpToolResponse } from '../../lib/mcp/toolHandlers';

class StubHandlers {
  async runTool(name: string, _input: unknown): Promise<McpToolResponse> {
    if (name === 'boom') {
      throw new Error('failure');
    }
    return { content: [{ type: 'text', text: '{"ok":true}' }] };
  }
}

describe('mcp server dispatch', () => {
  it('returns tool error if name missing', async () => {
    const result = await dispatchToolCall(
      new StubHandlers() as unknown as McpToolHandlers,
      {}
    );
    const payload = JSON.parse(result.content[0].text) as { message: string };
    assert.strictEqual(payload.message, 'Tool name is required');
  });

  it('returns handler result on success', async () => {
    const result = await dispatchToolCall(
      new StubHandlers() as unknown as McpToolHandlers,
      {
        params: {
          name: 'ok',
          arguments: {},
        },
      }
    );
    const payload = JSON.parse(result.content[0].text) as { ok: boolean };
    assert.strictEqual(payload.ok, true);
  });

  it('normalizes thrown tool errors', async () => {
    const result = await dispatchToolCall(
      new StubHandlers() as unknown as McpToolHandlers,
      {
        params: {
          name: 'boom',
          arguments: {},
        },
      }
    );
    const payload = JSON.parse(result.content[0].text) as { message: string };
    assert.strictEqual(payload.message, 'failure');
  });
});
