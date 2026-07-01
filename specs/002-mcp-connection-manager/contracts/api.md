# API Contracts: MCP Connection Manager

## Base URL

All endpoints are prefixed with `/api/mcps`.

## Endpoints

### GET /api/mcps (existing)

Returns all configured MCPs with current connection state.

**Response** `200`:
```json
{
  "clients": [
    {
      "name": "filesystem",
      "transport": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"],
      "status": "connected",
      "toolCount": 0,
      "error": null
    }
  ]
}
```

---

### POST /api/mcps/test-connection

Test if an MCP connection is reachable.

**Request**:
```json
{
  "name": "my-server",
  "transport": {
    "type": "stdio",
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"],
    "env": {
      "MY_VAR": "value",
      "ANOTHER_VAR": "123"
    }
  }
}
```

Also accepts **flat format**:
```json
{
  "name": "my-server",
  "type": "stdio",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"],
  "env": {
    "MY_VAR": "value",
    "ANOTHER_VAR": "123"
  }
}
```

**Response** `200` (success):
```json
{ "success": true }
```

**Response** `200` (failure):
```json
{ "success": false, "error": "Command not found: npx" }
```

**Response** `200` (Docker host unreachable):
```json
{ "success": false, "error": "Docker host unavailable. Check if the service is accessible." }
```

---

### POST /api/mcps

Add a new MCP to .mcp.json.

**Request** (flat or nested format, same schema as .mcp.json):
```json
{
  "name": "my-server",
  "transport": {
    "type": "stdio",
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"]
  }
}
```

**Response** `201`:
```json
{ "success": true, "name": "my-server" }
```

**Response** `409` (duplicate name):
```json
{ "success": false, "error": "An MCP with the name 'my-server' already exists." }
```

**Response** `400` (validation error):
```json
{ "success": false, "error": "Command is required for stdio transport." }
```

**Response** `403` (permission error):
```json
{ "success": false, "error": "Could not read/write the file." }
```

**Response** `503` (backend unreachable):
```json
{ "success": false, "error": "Error saving: backend unavailable." }
```

---

### DELETE /api/mcps/:name

Remove an MCP from .mcp.json.

**Response** `200`:
```json
{ "success": true }
```

**Response** `404`:
```json
{ "success": false, "error": "MCP 'my-server' not found." }
```

**Response** `403` (permission error):
```json
{ "success": false, "error": "Could not read/write the file." }
```

**Response** `503` (backend unreachable):
```json
{ "success": false, "error": "Error removing: backend unavailable." }
```

---

### GET /api/mcps/:name/tools

Query tools exposed by a specific MCP.

**Response** `200`:
```json
{
  "tools": [
    { "name": "read_file", "description": "Read file contents" },
    { "name": "write_file", "description": "Write file contents" },
    { "name": "list_directory", "description": "List directory contents" }
  ],
  "count": 3
}
```

**Response** `503` (connection failed):
```json
{ "success": false, "error": "Could not connect to MCP 'my-server'." }
```

---

### GET /api/mcps/events

SSE stream for real-time connection status updates.

**Response** `200` (SSE stream):

```
event: status
data: {"name": "filesystem", "status": "connected", "toolCount": null, "error": null}

event: status
data: {"name": "my-server", "status": "error", "toolCount": null, "error": "Connection refused"}

event: done
data: null
```

Event types: `testing` (test in progress, no data payload), `"connected"` (testConnection OK), or `"error"` (testConnection failed).

Keepalive comments sent every 15s (`: keepalive`). Full batch re-evaluated every 30s.
