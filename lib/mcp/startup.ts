import { ParsedCliArgs, getCliHelpText, parseCliArgs } from './cliArgs';
import { OctaneSessionStore } from './sessionStore';
import { McpToolHandlers } from './toolHandlers';
import { McpValidationError } from './errors';
import { StartupConnectionOptions } from './cliArgs';

export interface StartupConfiguration {
  handlers?: McpToolHandlers;
  showHelp: boolean;
  helpText?: string;
}

type StartupEnv = NodeJS.ProcessEnv;

function parseFromEnv(env: StartupEnv): StartupConnectionOptions | undefined {
  const server = env.OCTANE_SERVER_URL;
  const sharedSpaceRaw = env.OCTANE_SHARED_SPACE_ID;
  const workspaceRaw = env.OCTANE_WORKSPACE_ID;
  const auth = env.OCTANE_AUTH;

  if (!server && !sharedSpaceRaw && !workspaceRaw && !auth) {
    return undefined;
  }

  if (!server || !sharedSpaceRaw || !workspaceRaw || !auth) {
    throw new McpValidationError(
      'For env startup, set OCTANE_SERVER_URL, OCTANE_SHARED_SPACE_ID, OCTANE_WORKSPACE_ID, and OCTANE_AUTH'
    );
  }

  const sharedSpace = Number(sharedSpaceRaw);
  const workspace = Number(workspaceRaw);
  if (!Number.isFinite(sharedSpace) || !Number.isFinite(workspace)) {
    throw new McpValidationError(
      'OCTANE_SHARED_SPACE_ID and OCTANE_WORKSPACE_ID must be numbers'
    );
  }

  const sessionId = env.OCTANE_SESSION_ID ?? 'default';
  if (auth === 'token') {
    const token = env.OCTANE_BEARER_TOKEN;
    if (!token) {
      throw new McpValidationError('Set OCTANE_BEARER_TOKEN when OCTANE_AUTH=token');
    }
    return { sessionId, server, sharedSpace, workspace, token };
  }

  if (auth === 'credentials') {
    const user = env.OCTANE_USERNAME;
    const password = env.OCTANE_PASSWORD;
    if (!user || !password) {
      throw new McpValidationError(
        'Set OCTANE_USERNAME and OCTANE_PASSWORD when OCTANE_AUTH=credentials'
      );
    }
    return { sessionId, server, sharedSpace, workspace, user, password };
  }

  if (auth === 'client-credentials') {
    const clientId = env.OCTANE_CLIENT_ID;
    const clientSecret = env.OCTANE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new McpValidationError(
        'Set OCTANE_CLIENT_ID and OCTANE_CLIENT_SECRET when OCTANE_AUTH=client-credentials'
      );
    }
    return {
      sessionId,
      server,
      sharedSpace,
      workspace,
      user: clientId,
      password: clientSecret,
    };
  }

  throw new McpValidationError(
    'OCTANE_AUTH must be one of credentials, client-credentials, token'
  );
}

export function createStartupConfiguration(
  argv: string[],
  sessionStore?: OctaneSessionStore,
  env: StartupEnv = process.env
): StartupConfiguration {
  const parsed: ParsedCliArgs = parseCliArgs(argv);
  if (parsed.showHelp) {
    return {
      showHelp: true,
      helpText: getCliHelpText(),
    };
  }

  const store = sessionStore ?? new OctaneSessionStore();
  const startupConnection = parsed.startupConnection ?? parseFromEnv(env);
  if (startupConnection) {
    const { sessionId, ...params } = startupConnection;
    store.connect(sessionId, params);
  }

  return {
    showHelp: false,
    handlers: new McpToolHandlers(store),
  };
}
