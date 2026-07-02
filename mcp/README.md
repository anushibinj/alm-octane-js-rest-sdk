# ALM Octane MCP Server

This repository now includes an MCP server that exposes the SDK as MCP tools over stdio.

## Start the server

```bash
npm install
npm run mcp:start
```

The server starts on stdio and can be connected by an MCP client.

## Convenience startup arguments

You can preconfigure a default session from CLI args so clients do not need an initial `connect` call:

```bash
node dist/mcp-server.js \
  --server-url https://octane.example.com \
  --shared-space-id 1001 \
  --workspace-id 1002 \
  --auth credentials \
  --username my.user \
  --password my.password
```

Or with bearer token:

```bash
node dist/mcp-server.js \
  --server-url https://octane.example.com \
  --shared-space-id 1001 \
  --workspace-id 1002 \
  --auth token \
  --bearer-token my-token
```

Optional flag:

- `--session-id <value>`: pre-created session id (defaults to `default`)

## MCP client configuration

Example configuration:

```json
{
  "mcpServers": {
    "alm-octane": {
      "command": "node",
      "args": ["C:/path/to/alm-octane-js-rest-sdk/dist/mcp-server.js"]
    }
  }
}
```

## Usage flow

1. Call `connect` with `sessionId`, `server`, `sharedSpace`, `workspace`, and either `token` or `user` + `password`.
2. Optionally call `authenticate` (required for credential mode before first request in most flows).
3. Call data tools (`octane_get`, `octane_create`, `octane_update`, `octane_update_bulk`, `octane_delete`).
4. For attachments, use `octane_get_attachment_content` and `octane_upload_attachment` (base64 payloads).
5. Call `sign_out` and `disconnect` when done.

## Supported tools

- Session/auth: `connect`, `session_status`, `disconnect`, `authenticate`, `sign_out`
- Data operations: `octane_get`, `octane_create`, `octane_update`, `octane_update_bulk`, `octane_delete`
- Attachments: `octane_get_attachment_content`, `octane_upload_attachment`
- Generic passthrough: `octane_custom_request`

## Query options

For tools that support query shaping, pass:

```json
{
  "options": {
    "at": 1234,
    "limit": 100,
    "offset": 0,
    "fields": ["id", "name"],
    "orderBy": ["id", "-creation_time"],
    "query": "name EQ ^my-value^",
    "script": false
  }
}
```

## Testing

Run MCP-specific tests:

```bash
npm run test:mcp
```
