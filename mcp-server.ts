import { startStdioServer } from './lib/mcp/server';

startStdioServer().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown startup error';
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
