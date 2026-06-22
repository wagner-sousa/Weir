# API Contracts: Editar Configuração de MCP

## Base URL

All endpoints are prefixed with `/api/mcps`.

All existing endpoints from [specs/002-mcp-connection-manager/contracts/api.md](../../002-mcp-connection-manager/contracts/api.md)
remain unchanged. This document only specifies **new** endpoints and modifications.

---

### PUT /api/mcps/:name

Update an existing MCP entry. The `:name` param is the **original** name (used to
locate the entry in .mcp.json). The body's `name` field may differ from `:name`
to indicate a rename.

**Request** (flat or nested format, same schema as POST /api/mcps):

```json
{
  "name": "my-server",
  "transport": {
    "type": "stdio",
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"],
    "env": {
      "MY_VAR": "value"
    }
  }
}
```

**Response** `200` (success, name unchanged):

```json
{ "success": true, "name": "my-server" }
```

**Response** `200` (success, name changed — renamed from "old-server" to "new-server"):

```json
{ "success": true, "name": "new-server" }
```

**Response** `404` (original name not found):

```json
{ "success": false, "error": "MCP 'old-server' not found." }
```

**Response** `409` (duplicate name — new name conflicts with existing MCP):

```json
{ "success": false, "error": "An MCP with the name 'new-server' already exists." }
```

**Response** `400` (validation error — e.g., missing required field for transport type):

```json
{ "success": false, "error": "Command is required for stdio transport." }
```

**Response** `403` (file permission error):

```json
{ "success": false, "error": "File could not be written: permission denied." }
```

**Response** `503` (backend unreachable):

```json
{ "success": false, "error": "Error saving: backend unavailable." }
```
