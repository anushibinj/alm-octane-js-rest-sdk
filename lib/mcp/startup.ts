import { ParsedCliArgs, getCliHelpText, parseCliArgs } from './cliArgs';
import { OctaneSessionStore } from './sessionStore';
import { McpToolHandlers } from './toolHandlers';

export interface StartupConfiguration {
  handlers?: McpToolHandlers;
  showHelp: boolean;
  helpText?: string;
}

export function createStartupConfiguration(
  argv: string[],
  sessionStore?: OctaneSessionStore
): StartupConfiguration {
  const parsed: ParsedCliArgs = parseCliArgs(argv);
  if (parsed.showHelp) {
    return {
      showHelp: true,
      helpText: getCliHelpText(),
    };
  }

  const store = sessionStore ?? new OctaneSessionStore();
  if (parsed.startupConnection) {
    const { sessionId, ...params } = parsed.startupConnection;
    store.connect(sessionId, params);
  }

  return {
    showHelp: false,
    handlers: new McpToolHandlers(store),
  };
}
