# API Contracts: MCP Gateway Web

## GET /api/mcps

Returns the list of configured MCP servers with their connection status.

**Response 200:**

```json
{
  "clients": [
    {
      "name": "my-server",
      "transport": "stdio",
      "command": "npx",
      "args": ["-y", "server-fs"],
      "status": "unknown",
      "error": null,
      "toolCount": 0,
      "needsAuth": false,
      "authUrl": null
    },
    {
      "name": "api-server",
      "transport": "http",
      "url": "https://api.example.com/mcp",
      "status": "connected",
      "error": null,
      "toolCount": 5,
      "needsAuth": false,
      "authUrl": null
    }
  ],
  "error": null,
  "timestamp": "2026-06-19T12:00:00.000Z",
  "mcpPort": 4000
}
```

**Response 200 (empty):**

```json
{
  "clients": [],
  "error": null,
  "timestamp": "2026-06-19T12:00:00.000Z",
  "mcpPort": 4000
}
```

**Response 200 (parse error — clients empty, error populated):**

```json
{
  "clients": [],
  "error": "Failed to read .mcp.json file: [error detail]",
  "timestamp": "2026-06-19T12:00:00.000Z"
}
```

## GET /api/health

Server healthcheck.

**Response 200:**

```json
{
  "status": "ok",
  "hasConfig": true,
  "mcpCount": 2
}
```

**Response 200 (no config):**

```json
{
  "status": "ok",
  "hasConfig": false,
  "mcpCount": 0
}
```

## WebSocket /ws

Broadcast of .mcp.json change events.

**Event `config:changed`:**

```json
{
  "type": "config:changed",
  "timestamp": "2026-06-19T12:00:00.000Z"
}
```

**Event `config:error`:**

```json
{
  "type": "config:error",
  "error": "Failed to parse .mcp.json",
  "timestamp": "2026-06-19T12:00:00.000Z"
}
```

## Frontend → Backend Data Flow

```
Browser                     Fastify                      chokidar
  │                           │                            │
  │  GET /api/mcps            │                            │
  ├──────────────────────────►│                            │
  │  ◄────────────────────────┤                            │
  │    200 { clients: [] }    │                            │
  │                           │                            │
  │  WebSocket connect /ws    │                            │
  ├──────────────────────────►│                            │
  │                           │                            │
  │                           │                  .mcp.json modified
  │                           │◄───────────────────────────┤
  │                           │                            │
  │  ─── config:changed ───►  │                            │
  │                           │                            │
  │  GET /api/mcps (refetch)  │                            │
  ├──────────────────────────►│                            │
  │  ◄────────────────────────┤                            │
  │    200 { clients: [] }    │                            │
```
