import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { McpToolHandlers, normalizeMcpError } from './toolHandlers';

export interface CallToolLikeRequest {
  params?: {
    name?: string;
    arguments?: unknown;
  };
}

export async function dispatchToolCall(
  handlers: McpToolHandlers,
  request: CallToolLikeRequest
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const toolName = request.params?.name;
  if (!toolName || typeof toolName !== 'string') {
    return normalizeMcpError(new Error('Tool name is required'));
  }

  try {
    return await handlers.runTool(toolName, request.params?.arguments);
  } catch (error: unknown) {
    return normalizeMcpError(error);
  }
}

export function createMcpServer(handlers?: McpToolHandlers): Server {
  const toolHandlers = handlers ?? new McpToolHandlers();
  const server = new Server(
    {
      name: 'alm-octane-mcp-server',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: toolHandlers.listTools(),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) =>
    dispatchToolCall(toolHandlers, request)
  );

  return server;
}

export async function startStdioServer(handlers?: McpToolHandlers): Promise<void> {
  const server = createMcpServer(handlers);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
