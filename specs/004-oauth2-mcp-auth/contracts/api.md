# API Contracts: OAuth2 MCP Auth

## Base URL

Auth endpoints are prefixed with `/api/auth/:name`.

All existing endpoints from [specs/003-edit-mcp-config/contracts/api.md](../../003-edit-mcp-config/contracts/api.md) remain unchanged.

---

### POST /api/auth/:name/start

Generate the OAuth2 authorization URL with proper query parameters. Returns a URL that the frontend should open in a popup.

**Response** `200`:

```json
{
  "url": "https://mcp.clickup.com/oauth/authorize?client_id=...&redirect_uri=...&response_type=code&scope=read+write"
}
```

**Response** `404` (MCP not found):

```json
{ "success": false, "error": "MCP 'ClickUp' not found." }
```

**Response** `400` (no auth config discovered):

```json
{ "success": false, "error": "No OAuth2 configuration available for this MCP." }
```

---

### GET /api/auth/:name/callback

OAuth2 provider redirect URI. Receives the authorization code from the query string and exchanges it for a token.

**Query Parameters**: `?code=<authorization_code>` or `?error=<error_description>`

**Response** `200` (success — renders "Authorization successful" page that auto-closes):

```html
<html><body><script>window.close()</script><p>Authorization successful. You may close this window.</p></body></html>
```

**Response** `200` (error — renders error page):

```html
<html><body><p>Authorization failed: <error></p></body></html>
```

**Response** `404` (MCP not found):

```json
{ "success": false, "error": "MCP 'ClickUp' not found." }
```

---

### Updated: GET /api/mcps (existing endpoint, new fields)

The existing GET /api/mcps response now includes `needsAuth` and `authUrl` fields on MCP clients when the connection returns 401 and OAuth2 discovery succeeds.

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
  "timestamp": "2026-06-22T20:00:00.000Z"
}
```
