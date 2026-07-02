import { startStdioServer } from './lib/mcp/server';
import { createStartupConfiguration } from './lib/mcp/startup';

const startup = createStartupConfiguration(process.argv.slice(2));
if (startup.showHelp) {
  process.stdout.write(`${startup.helpText}\n`);
  process.exit(0);
}

startStdioServer(startup.handlers).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown startup error';
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
