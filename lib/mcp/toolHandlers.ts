import { Params } from '../root/octane';
import { McpToolExecutionError, McpValidationError } from './errors';
import { OctaneSessionStore } from './sessionStore';
import {
  ConnectInput,
  CreateInput,
  CustomRequestInput,
  DeleteInput,
  DisconnectInput,
  GetAttachmentContentInput,
  GetInput,
  OctaneClient,
  QueryOptions,
  SessionStatusInput,
  UpdateBulkInput,
  UpdateInput,
  UploadAttachmentInput,
} from './types';
import {
  asObject,
  asQueryOptions,
  asString,
  asOptionalString,
  asOptionalStringArray,
  asNumber,
} from './validation';

export interface McpToolResponse {
  content: Array<{ type: 'text'; text: string }>;
}

function ok(payload: unknown): McpToolResponse {
  return {
    content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
  };
}

function asArgsObject(input: unknown): Record<string, unknown> {
  if (input === undefined) {
    return {};
  }
  return asObject(input, 'arguments');
}

function parseSessionId(value: unknown): string {
  if (value === undefined) {
    return 'default';
  }
  return asString(value, 'arguments.sessionId');
}

function extractErrorDetails(error: unknown): unknown {
  if (!error || typeof error !== 'object') {
    return undefined;
  }

  const maybeAxios = error as { response?: { status?: number; data?: unknown } };
  if (maybeAxios.response) {
    return {
      status: maybeAxios.response.status,
      data: maybeAxios.response.data,
    };
  }

  return undefined;
}

async function runClientCall<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error: unknown) {
    if (error instanceof McpValidationError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : 'Tool execution failed';
    throw new McpToolExecutionError(message, extractErrorDetails(error));
  }
}

function applyQueryOptions(client: OctaneClient, options?: QueryOptions): OctaneClient {
  if (!options) {
    return client;
  }

  if (options.at !== undefined) {
    client.at(options.at);
  }
  if (options.limit !== undefined) {
    client.limit(options.limit);
  }
  if (options.offset !== undefined) {
    client.offset(options.offset);
  }
  if (options.fields !== undefined) {
    client.fields(...options.fields);
  }
  if (options.orderBy !== undefined) {
    client.orderBy(...options.orderBy);
  }
  if (options.query !== undefined) {
    client.query(options.query);
  }
  if (options.script === true) {
    client.script();
  }

  return client;
}

function parseConnectInput(input: unknown): ConnectInput {
  const source = asArgsObject(input);
  const sessionId = parseSessionId(source.sessionId);
  const server = asOptionalString(source.server, 'arguments.server');
  const sharedSpace =
    source.sharedSpace === undefined
      ? undefined
      : asNumber(source.sharedSpace, 'arguments.sharedSpace');
  const workspace =
    source.workspace === undefined
      ? undefined
      : asNumber(source.workspace, 'arguments.workspace');
  const user = asOptionalString(source.user, 'arguments.user');
  const password = asOptionalString(source.password, 'arguments.password');
  const clientId = asOptionalString(source.clientId, 'arguments.clientId');
  const clientSecret = asOptionalString(source.clientSecret, 'arguments.clientSecret');
  const token = asOptionalString(source.token, 'arguments.token');
  const proxy = asOptionalString(source.proxy, 'arguments.proxy');
  const proxyUsername = asOptionalString(
    source.proxyUsername,
    'arguments.proxyUsername'
  );
  const proxyPassword = asOptionalString(
    source.proxyPassword,
    'arguments.proxyPassword'
  );
  const headers =
    source.headers === undefined
      ? undefined
      : (asObject(source.headers, 'arguments.headers') as Params['headers']);

  if (server === undefined && sharedSpace === undefined && workspace === undefined) {
    return {
      sessionId,
      server: '',
      sharedSpace: 0,
      workspace: 0,
    };
  }

  if (!server || sharedSpace === undefined || workspace === undefined) {
    throw new McpValidationError(
      'Provide server, sharedSpace and workspace together for connect'
    );
  }
  const resolvedUser = user ?? clientId;
  const resolvedPassword = password ?? clientSecret;

  if ((clientId && !clientSecret) || (!clientId && clientSecret)) {
    throw new McpValidationError(
      'Provide both clientId and clientSecret together for connect'
    );
  }
  if (!token && (!resolvedUser || !resolvedPassword)) {
    throw new McpValidationError(
      'Provide either token, user/password, or clientId/clientSecret for connect'
    );
  }

  return {
    sessionId,
    server,
    sharedSpace,
    workspace,
    user: resolvedUser,
    password: resolvedPassword,
    token,
    proxy,
    proxyUsername,
    proxyPassword,
    headers,
  };
}

function parseSessionStatusInput(input: unknown): SessionStatusInput {
  const source = asArgsObject(input);
  return {
    sessionId: parseSessionId(source.sessionId),
  };
}

function parseDisconnectInput(input: unknown): DisconnectInput {
  const source = asArgsObject(input);
  return {
    sessionId: parseSessionId(source.sessionId),
  };
}

function parseGetInput(input: unknown): GetInput {
  const source = asObject(input, 'arguments');
  return {
    sessionId: parseSessionId(source.sessionId),
    entityName: asString(source.entityName, 'arguments.entityName'),
    options: asQueryOptions(source.options, 'arguments.options'),
  };
}

function parseCreateInput(input: unknown): CreateInput {
  const source = asObject(input, 'arguments');
  return {
    sessionId: parseSessionId(source.sessionId),
    entityName: asString(source.entityName, 'arguments.entityName'),
    body: asObject(source.body, 'arguments.body'),
    options: asQueryOptions(source.options, 'arguments.options'),
  };
}

function parseUpdateInput(input: unknown): UpdateInput {
  const source = asObject(input, 'arguments');
  return {
    sessionId: parseSessionId(source.sessionId),
    entityName: asString(source.entityName, 'arguments.entityName'),
    body: asObject(source.body, 'arguments.body'),
    options: asQueryOptions(source.options, 'arguments.options'),
  };
}

function parseUpdateBulkInput(input: unknown): UpdateBulkInput {
  const source = asObject(input, 'arguments');
  return {
    sessionId: parseSessionId(source.sessionId),
    entityName: asString(source.entityName, 'arguments.entityName'),
    body: asObject(source.body, 'arguments.body'),
    options: asQueryOptions(source.options, 'arguments.options'),
  };
}

function parseDeleteInput(input: unknown): DeleteInput {
  const source = asObject(input, 'arguments');
  const options = asQueryOptions(source.options, 'arguments.options');
  if (!options || (options.at === undefined && options.query === undefined)) {
    throw new McpValidationError(
      'delete requires options.at or options.query to avoid accidental mass deletion'
    );
  }
  return {
    sessionId: parseSessionId(source.sessionId),
    entityName: asString(source.entityName, 'arguments.entityName'),
    options,
  };
}

function parseGetAttachmentContentInput(input: unknown): GetAttachmentContentInput {
  const source = asObject(input, 'arguments');
  const options = asQueryOptions(source.options, 'arguments.options', true);
  if (!options || options.at === undefined) {
    throw new McpValidationError('get attachment content requires options.at');
  }
  return {
    sessionId: parseSessionId(source.sessionId),
    options,
  };
}

function parseUploadAttachmentInput(input: unknown): UploadAttachmentInput {
  const source = asObject(input, 'arguments');
  return {
    sessionId: parseSessionId(source.sessionId),
    attachmentName: asString(source.attachmentName, 'arguments.attachmentName'),
    attachmentDataBase64: asString(
      source.attachmentDataBase64,
      'arguments.attachmentDataBase64'
    ),
    ownerName: asString(source.ownerName, 'arguments.ownerName'),
    ownerReference: asObject(source.ownerReference, 'arguments.ownerReference'),
  };
}

function parseCustomRequestInput(input: unknown): CustomRequestInput {
  const source = asObject(input, 'arguments');
  const headersValue = source.headers;
  if (
    headersValue !== undefined &&
    (typeof headersValue !== 'object' || headersValue === null || Array.isArray(headersValue))
  ) {
    throw new McpValidationError('arguments.headers must be an object');
  }

  const bodyValue = source.body;
  if (
    bodyValue !== undefined &&
    typeof bodyValue !== 'string' &&
    (typeof bodyValue !== 'object' || bodyValue === null || Array.isArray(bodyValue))
  ) {
    throw new McpValidationError('arguments.body must be a string or object');
  }

  return {
    sessionId: parseSessionId(source.sessionId),
    customUrl: asString(source.customUrl, 'arguments.customUrl'),
    operation: asString(source.operation, 'arguments.operation'),
    body: bodyValue as object | string | undefined,
    headers: headersValue as object | undefined,
  };
}

export class McpToolHandlers {
  private readonly sessionStore: OctaneSessionStore;

  constructor(sessionStore?: OctaneSessionStore) {
    this.sessionStore = sessionStore ?? new OctaneSessionStore();
  }

  listTools(): Array<{
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
  }> {
    const withSessionId = {
      sessionId: { type: 'string', description: 'Logical session ID' },
    };
    const queryOptionsSchema = {
      type: 'object',
      properties: {
        at: { type: 'number' },
        limit: { type: 'number' },
        offset: { type: 'number' },
        fields: { type: 'array', items: { type: 'string' } },
        orderBy: { type: 'array', items: { type: 'string' } },
        query: { type: 'string' },
        script: { type: 'boolean' },
      },
    };

    return [
      {
        name: 'connect',
        description: 'Create or replace an Octane session',
        inputSchema: {
          type: 'object',
          properties: {
            ...withSessionId,
            server: { type: 'string' },
            sharedSpace: { type: 'number' },
            workspace: { type: 'number' },
            user: { type: 'string' },
            password: { type: 'string' },
            clientId: { type: 'string' },
            clientSecret: { type: 'string' },
            token: { type: 'string' },
            proxy: { type: 'string' },
            proxyUsername: { type: 'string' },
            proxyPassword: { type: 'string' },
            headers: { type: 'object' },
          },
          required: [],
        },
      },
      {
        name: 'list_sessions',
        description: 'List active Octane sessions',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'session_status',
        description: 'Return active session details',
        inputSchema: {
          type: 'object',
          properties: withSessionId,
          required: [],
        },
      },
      {
        name: 'disconnect',
        description: 'Close an Octane session',
        inputSchema: {
          type: 'object',
          properties: withSessionId,
          required: [],
        },
      },
      {
        name: 'authenticate',
        description: 'Authenticate an existing Octane session',
        inputSchema: {
          type: 'object',
          properties: withSessionId,
          required: [],
        },
      },
      {
        name: 'sign_out',
        description: 'Sign out an existing Octane session',
        inputSchema: {
          type: 'object',
          properties: withSessionId,
          required: [],
        },
      },
      {
        name: 'octane_get',
        description: 'Execute GET on an entity collection',
        inputSchema: {
          type: 'object',
          properties: {
            ...withSessionId,
            entityName: { type: 'string' },
            options: queryOptionsSchema,
          },
          required: ['entityName'],
        },
      },
      {
        name: 'octane_create',
        description: 'Create entity records',
        inputSchema: {
          type: 'object',
          properties: {
            ...withSessionId,
            entityName: { type: 'string' },
            body: { type: 'object' },
            options: queryOptionsSchema,
          },
          required: ['entityName', 'body'],
        },
      },
      {
        name: 'octane_update',
        description: 'Update one entity record',
        inputSchema: {
          type: 'object',
          properties: {
            ...withSessionId,
            entityName: { type: 'string' },
            body: { type: 'object' },
            options: queryOptionsSchema,
          },
          required: ['entityName', 'body'],
        },
      },
      {
        name: 'octane_update_bulk',
        description: 'Update multiple entity records',
        inputSchema: {
          type: 'object',
          properties: {
            ...withSessionId,
            entityName: { type: 'string' },
            body: { type: 'object' },
            options: queryOptionsSchema,
          },
          required: ['entityName', 'body'],
        },
      },
      {
        name: 'octane_delete',
        description: 'Delete entities by id or query',
        inputSchema: {
          type: 'object',
          properties: {
            ...withSessionId,
            entityName: { type: 'string' },
            options: queryOptionsSchema,
          },
          required: ['entityName', 'options'],
        },
      },
      {
        name: 'octane_get_attachment_content',
        description: 'Get attachment bytes as base64',
        inputSchema: {
          type: 'object',
          properties: {
            ...withSessionId,
            options: queryOptionsSchema,
          },
          required: ['options'],
        },
      },
      {
        name: 'octane_upload_attachment',
        description: 'Upload an attachment from base64 payload',
        inputSchema: {
          type: 'object',
          properties: {
            ...withSessionId,
            attachmentName: { type: 'string' },
            attachmentDataBase64: { type: 'string' },
            ownerName: { type: 'string' },
            ownerReference: { type: 'object' },
          },
          required: [
            'attachmentName',
            'attachmentDataBase64',
            'ownerName',
            'ownerReference',
          ],
        },
      },
      {
        name: 'octane_custom_request',
        description: 'Execute a custom Octane request directly',
        inputSchema: {
          type: 'object',
          properties: {
            ...withSessionId,
            customUrl: { type: 'string' },
            operation: { type: 'string' },
            body: { type: ['object', 'string'] },
            headers: { type: 'object' },
          },
          required: ['customUrl', 'operation'],
        },
      },
    ];
  }

  async runTool(name: string, input: unknown): Promise<McpToolResponse> {
    switch (name) {
      case 'connect':
        return this.connect(input);
      case 'session_status':
        return this.sessionStatus(input);
      case 'list_sessions':
        return this.listSessions();
      case 'disconnect':
        return this.disconnect(input);
      case 'authenticate':
        return this.authenticate(input);
      case 'sign_out':
        return this.signOut(input);
      case 'octane_get':
        return this.get(input);
      case 'octane_create':
        return this.create(input);
      case 'octane_update':
        return this.update(input);
      case 'octane_update_bulk':
        return this.updateBulk(input);
      case 'octane_delete':
        return this.delete(input);
      case 'octane_get_attachment_content':
        return this.getAttachmentContent(input);
      case 'octane_upload_attachment':
        return this.uploadAttachment(input);
      case 'octane_custom_request':
        return this.customRequest(input);
      default:
        throw new McpValidationError(`Unknown tool "${name}"`);
    }
  }

  private async connect(input: unknown): Promise<McpToolResponse> {
    const args = parseConnectInput(input);
    if (!args.server && args.sharedSpace === 0 && args.workspace === 0) {
      const descriptor = this.sessionStore.getDescriptor(args.sessionId);
      return ok({ connected: true, session: descriptor, reused: true });
    }
    const descriptor = this.sessionStore.connect(args.sessionId, args);
    return ok({ connected: true, session: descriptor });
  }

  private async sessionStatus(input: unknown): Promise<McpToolResponse> {
    const args = parseSessionStatusInput(input);
    const descriptor = this.sessionStore.getDescriptor(args.sessionId);
    return ok({ connected: true, session: descriptor });
  }

  private async listSessions(): Promise<McpToolResponse> {
    return ok({ sessions: this.sessionStore.list() });
  }

  private async disconnect(input: unknown): Promise<McpToolResponse> {
    const args = parseDisconnectInput(input);
    const removed = this.sessionStore.disconnect(args.sessionId);
    return ok({ disconnected: removed, sessionId: args.sessionId });
  }

  private async authenticate(input: unknown): Promise<McpToolResponse> {
    const args = parseSessionStatusInput(input);
    const client = this.sessionStore.getClient(args.sessionId);
    const response = await runClientCall(async () => client.authenticate());
    return ok({ sessionId: args.sessionId, result: response });
  }

  private async signOut(input: unknown): Promise<McpToolResponse> {
    const args = parseSessionStatusInput(input);
    const client = this.sessionStore.getClient(args.sessionId);
    const response = await runClientCall(async () => client.signOut());
    return ok({ sessionId: args.sessionId, result: response });
  }

  private async get(input: unknown): Promise<McpToolResponse> {
    const args = parseGetInput(input);
    const client = this.sessionStore.getClient(args.sessionId);
    applyQueryOptions(client, args.options).get(args.entityName);
    const response = await runClientCall(async () => client.execute());
    return ok(response);
  }

  private async create(input: unknown): Promise<McpToolResponse> {
    const args = parseCreateInput(input);
    const client = this.sessionStore.getClient(args.sessionId);
    applyQueryOptions(client, args.options).create(args.entityName, args.body);
    const response = await runClientCall(async () => client.execute());
    return ok(response);
  }

  private async update(input: unknown): Promise<McpToolResponse> {
    const args = parseUpdateInput(input);
    const client = this.sessionStore.getClient(args.sessionId);
    applyQueryOptions(client, args.options).update(args.entityName, args.body);
    const response = await runClientCall(async () => client.execute());
    return ok(response);
  }

  private async updateBulk(input: unknown): Promise<McpToolResponse> {
    const args = parseUpdateBulkInput(input);
    const client = this.sessionStore.getClient(args.sessionId);
    applyQueryOptions(client, args.options).updateBulk(args.entityName, args.body);
    const response = await runClientCall(async () => client.execute());
    return ok(response);
  }

  private async delete(input: unknown): Promise<McpToolResponse> {
    const args = parseDeleteInput(input);
    const client = this.sessionStore.getClient(args.sessionId);
    applyQueryOptions(client, args.options).delete(args.entityName);
    const response = await runClientCall(async () => client.execute());
    return ok(response);
  }

  private async getAttachmentContent(input: unknown): Promise<McpToolResponse> {
    const args = parseGetAttachmentContentInput(input);
    const client = this.sessionStore.getClient(args.sessionId);
    applyQueryOptions(client, args.options).getAttachmentContent();
    const response = await runClientCall(async () => client.execute());
    const bytes =
      typeof response === 'string'
        ? Buffer.from(response, 'utf8')
        : Buffer.from(response as ArrayBuffer);
    return ok({ attachmentDataBase64: bytes.toString('base64') });
  }

  private async uploadAttachment(input: unknown): Promise<McpToolResponse> {
    const args = parseUploadAttachmentInput(input);
    const client = this.sessionStore.getClient(args.sessionId);
    const data = Buffer.from(args.attachmentDataBase64, 'base64');
    client.uploadAttachment(
      args.attachmentName,
      data,
      args.ownerName,
      args.ownerReference
    );
    const response = await runClientCall(async () => client.execute());
    return ok(response);
  }

  private async customRequest(input: unknown): Promise<McpToolResponse> {
    const args = parseCustomRequestInput(input);
    const client = this.sessionStore.getClient(args.sessionId);
    const response = await runClientCall(async () =>
      client.executeCustomRequest(
        args.customUrl,
        args.operation,
        args.body,
        args.headers
      )
    );
    return ok(response);
  }
}

export function normalizeMcpError(error: unknown): McpToolResponse {
  if (error instanceof McpToolExecutionError) {
    return ok({
      error: error.name,
      message: error.message,
      details: error.details,
    });
  }
  if (error instanceof Error) {
    return ok({ error: error.name, message: error.message });
  }
  return ok({ error: 'Error', message: 'Unknown error' });
}

export function parseConnectHeaders(
  input: unknown,
  path: string
): Record<string, string> | undefined {
  if (input === undefined) {
    return undefined;
  }
  const raw = asObject(input, path);
  const values = Object.entries(raw);
  const result: Record<string, string> = {};
  values.forEach(([key, value]) => {
    if (typeof value !== 'string') {
      throw new McpValidationError(`${path}.${key} must be a string`);
    }
    result[key] = value;
  });
  return result;
}

export function parseFieldNames(input: unknown, path: string): string[] | undefined {
  return asOptionalStringArray(input, path);
}
