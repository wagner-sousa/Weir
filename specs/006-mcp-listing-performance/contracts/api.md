# API Contracts: MCP Listing Performance

## Updated: GET /api/mcps

The listing endpoint no longer tests connections. It returns config data with cached status.

**Response** `200`:

```json
{
  "clients": [
    {
      "name": "ClickUp",
      "transport": "http",
      "url": "https://mcp.clickup.com/mcp",
      "status": "error",
      "error": "HTTP 401",
      "toolCount": 0,
      "needsAuth": true,
      "authUrl": "https://mcp.clickup.com/oauth/authorize"
    }
  ],
  "error": null,
  "timestamp": "2026-06-23T12:00:00.000Z"
}
```

`status` values: `"connected"`, `"error"`, `"needsAuth"`, `"unknown"` (never tested or cache expired).

## Updated: GET /api/mcps/events (SSE)

Status events are now emitted per-MCP as each test completes, without waiting for all tests.

**Event format** (unchanged — existing frontend handler already supports this):

```
event: status
data: {"name":"ClickUp","status":"error","toolCount":null,"error":"HTTP 401"}

event: status
data: {"name":"Filesystem","status":"connected","toolCount":5,"error":null}

event: testing
data: {"name":"ClickUp","status":"testing","toolCount":null,"error":null}
```

**New event types**:

| Event | When | Purpose |
|-------|------|---------|
| `status` | After a test completes | Update card with result |
| `testing` | When a test starts | Show "testing..." indicator on card |

## Unchanged Endpoints

The following endpoints remain exactly as defined in [specs/004-oauth2-mcp-auth/contracts/api.md](../../004-oauth2-mcp-auth/contracts/api.md):

- `POST /api/mcps/test-connection`
- `POST /api/mcps`
- `PUT /api/mcps/:name`
- `DELETE /api/mcps/:name`
- `POST /api/auth/:name/start`
- `GET /api/auth/:name/callback`
- `GET /api/mcps/:name/tools`
