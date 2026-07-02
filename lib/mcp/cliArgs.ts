import { Params } from '../root/octane';
import { McpValidationError } from './errors';

export interface StartupConnectionOptions extends Params {
  sessionId: string;
}

export interface ParsedCliArgs {
  startupConnection?: StartupConnectionOptions;
  showHelp: boolean;
}

type StringMap = Record<string, string>;

function parseRawArgs(argv: string[]): StringMap {
  const parsed: StringMap = {};
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (!item.startsWith('--')) {
      continue;
    }
    const key = item.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      throw new McpValidationError(`Missing value for --${key}`);
    }
    parsed[key] = next;
    i += 1;
  }
  return parsed;
}

function hasStartupArgs(args: StringMap): boolean {
  return (
    args['server-url'] !== undefined ||
    args['shared-space-id'] !== undefined ||
    args['workspace-id'] !== undefined ||
    args['auth'] !== undefined ||
    args['username'] !== undefined ||
    args['password'] !== undefined ||
    args['client-id'] !== undefined ||
    args['client-secret'] !== undefined ||
    args['bearer-token'] !== undefined
  );
}

export function parseCliArgs(argv: string[]): ParsedCliArgs {
  const showHelp = argv.includes('--help');
  if (showHelp) {
    return { showHelp };
  }
  const args = parseRawArgs(argv);

  if (!hasStartupArgs(args)) {
    return { showHelp: false };
  }

  const server = args['server-url'];
  const sharedSpaceRaw = args['shared-space-id'];
  const workspaceRaw = args['workspace-id'];
  const authMode = args.auth;

  if (!server) {
    throw new McpValidationError('Missing required --server-url');
  }
  if (!sharedSpaceRaw) {
    throw new McpValidationError('Missing required --shared-space-id');
  }
  if (!workspaceRaw) {
    throw new McpValidationError('Missing required --workspace-id');
  }
  if (!authMode) {
    throw new McpValidationError(
      'Missing required --auth (credentials|client-credentials|token)'
    );
  }

  const sharedSpace = Number(sharedSpaceRaw);
  const workspace = Number(workspaceRaw);
  if (!Number.isFinite(sharedSpace)) {
    throw new McpValidationError('--shared-space-id must be a number');
  }
  if (!Number.isFinite(workspace)) {
    throw new McpValidationError('--workspace-id must be a number');
  }

  const sessionId = args['session-id'] ?? 'default';
  if (authMode === 'credentials') {
    const user = args.username;
    const password = args.password;
    if (!user || !password) {
      throw new McpValidationError(
        'For --auth credentials, provide both --username and --password'
      );
    }

    return {
      showHelp: false,
      startupConnection: {
        sessionId,
        server,
        sharedSpace,
        workspace,
        user,
        password,
      },
    };
  }

  if (authMode === 'token') {
    const token = args['bearer-token'];
    if (!token) {
      throw new McpValidationError(
        'For --auth token, provide --bearer-token'
      );
    }

    return {
      showHelp: false,
      startupConnection: {
        sessionId,
        server,
        sharedSpace,
        workspace,
        token,
      },
    };
  }

  if (authMode === 'client-credentials') {
    const clientId = args['client-id'];
    const clientSecret = args['client-secret'];
    if (!clientId || !clientSecret) {
      throw new McpValidationError(
        'For --auth client-credentials, provide both --client-id and --client-secret'
      );
    }

    return {
      showHelp: false,
      startupConnection: {
        sessionId,
        server,
        sharedSpace,
        workspace,
        user: clientId,
        password: clientSecret,
      },
    };
  }

  throw new McpValidationError(
    '--auth must be one of "credentials", "client-credentials", or "token"'
  );
}

export function getCliHelpText(): string {
  return [
    'ALM Octane MCP server',
    '',
    'Optional startup connection arguments:',
    '  --server-url <url>            Server URL (for example https://octane.example.com)',
    '  --shared-space-id <number>    Shared space ID',
    '  --workspace-id <number>       Workspace ID',
    '  --auth <credentials|client-credentials|token>  Authentication mode',
    '',
    'Credentials mode:',
    '  --username <value>            Octane username',
    '  --password <value>            Octane password',
    '',
    'Client credentials mode:',
    '  --client-id <value>           API access client id',
    '  --client-secret <value>       API access client secret',
    '',
    'Token mode:',
    '  --bearer-token <value>        Octane bearer token',
    '',
    'Optional:',
    '  --session-id <value>          Session id to pre-create (default: default)',
    '  --help                        Show this help message',
  ].join('\n');
}
