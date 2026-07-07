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

Or with API access key/secret (client credentials):

```bash
node dist/mcp-server.js \
  --server-url https://octane.example.com \
  --shared-space-id 1001 \
  --workspace-id 1002 \
  --auth client-credentials \
  --client-id my-client-id \
  --client-secret my-client-secret
```

Optional flag:

- `--session-id <value>`: pre-created session id (defaults to `default`)

When startup args are used, tools can omit `sessionId` and the server uses `default`.
Calling `connect` with empty arguments (`{}`) reuses the already preconfigured default session.

## Environment variables (recommended for ChatBox-style UIs)

If your MCP host has a dedicated environment-variables field, prefer this over long command lines:

- `OCTANE_SERVER_URL`
- `OCTANE_SHARED_SPACE_ID`
- `OCTANE_WORKSPACE_ID`
- `OCTANE_AUTH` = `credentials` | `client-credentials` | `token`
- For `credentials`: `OCTANE_USERNAME`, `OCTANE_PASSWORD`
- For `client-credentials`: `OCTANE_CLIENT_ID`, `OCTANE_CLIENT_SECRET`
- For `token`: `OCTANE_BEARER_TOKEN`
- Optional: `OCTANE_SESSION_ID` (defaults to `default`)

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

1. If startup CLI args were not used, call `connect` with `server`, `sharedSpace`, `workspace`, and one of: `token`, `user` + `password`, or `clientId` + `clientSecret` (`sessionId` optional, defaults to `default`).
2. Optionally call `authenticate` (required for credential mode before first request in most flows).
3. Call data tools (`octane_get`, `octane_create`, `octane_update`, `octane_update_bulk`, `octane_delete`).
4. For attachments, use `octane_get_attachment_content` and `octane_upload_attachment` (base64 payloads).
5. Call `sign_out` and `disconnect` when done.

## Supported tools

- Session/auth: `connect`, `disconnect`, `authenticate`, `sign_out`
- Data operations: `octane_get`, `octane_create`, `octane_update`, `octane_update_bulk`, `octane_delete`
- Convenience: `octane_get_ticket_details` (infers relevant fields from requested detail text)
- Query helper: `octane_generate_query_string` (infers `fields` + `query` from natural language, validates by default with a lightweight `limit=5` request, and retries alternate query candidates)
- Query validator: `octane_validate_query_string` (executes an existing `fields=...&query=...` string with default `limit=5` and returns `valid: true|false` with details)
- Attachments: `octane_get_attachment_content`, `octane_upload_attachment`
- Generic passthrough: `octane_custom_request`

If startup CLI args are used, assistants should directly call data tools; they will use the preconfigured `default` session.
When startup config is present, session setup tools are intentionally hidden from the MCP tool list to reduce connect/session-check loops.

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
