# API Contract: Tool Visibility

**Feature**: 015-tools-visibility-toggle
**Base URL**: `/api`

## GET /api/mcps/:name/tools/visibility

Returns the visibility state for all tools of a specific MCP.

**Request**:
- Method: `GET`
- Path params: `name` (string, required) — MCP server name

**Response 200**:
```json
{
  "visibility": {
    "getPullRequests": true,
    "getPullRequest": false,
    "createPullRequest": true
  },
  "totalCount": 3,
  "enabledCount": 2
}
```

**Response 404**:
```json
{
  "success": false,
  "error": "MCP 'nonexistent' not found."
}
```

---

## PUT /api/mcps/:name/tools/visibility/:toolName

Set the visibility state for a single tool.

**Request**:
- Method: `PUT`
- Path params: `name` (string), `toolName` (string)
- Body:
```json
{
  "enabled": false
}
```

**Response 200**:
```json
{
  "success": true,
  "tool": "getPullRequest",
  "enabled": false
}
```

**Response 404**:
```json
{
  "success": false,
  "error": "MCP 'nonexistent' not found."
}
```

---

## PUT /api/mcps/:name/tools/visibility

Set visibility for all tools of an MCP (bulk operation).

**Request**:
- Method: `PUT`
- Path params: `name` (string)
- Body:
```json
{
  "enabled": false
}
```

**Response 200**:
```json
{
  "success": true,
  "enabled": false,
  "affectedTools": 15
}
```

---

## GET /api/mcps/:name/tools

Modified to support `includeDisabled` query parameter.

**Request**:
- Method: `GET`
- Path params: `name` (string)
- Query: `includeDisabled` (boolean, optional, default `false`)

**Response 200** (default, `includeDisabled=false`):
```json
{
  "tools": [
    { "name": "getPullRequests", "description": "..." }
  ],
  "count": 2
}
```

**Response 200** (`includeDisabled=true`):
```json
{
  "tools": [
    { "name": "getPullRequests", "description": "...", "enabled": true },
    { "name": "getPullRequest", "description": "...", "enabled": false }
  ],
  "count": 3
}
```

When `includeDisabled=true`, each tool object includes an `enabled` boolean field.
