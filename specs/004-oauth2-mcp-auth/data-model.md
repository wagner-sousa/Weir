# Data Model: OAuth2 MCP Auth

## Entities

The same entities from [specs/003-edit-mcp-config/data-model.md](../003-edit-mcp-config/data-model.md) apply here. This document only describes additions for OAuth2.

### MCPEntry — OAuth2 Extensions

The MCP entry gains two new optional runtime/persisted fields:

| Field | Type | Persisted | Description |
|-------|------|-----------|-------------|
| `accessToken` | `string` | Yes (in `.mcp.json`) | OAuth2 access token obtained via authorization code exchange |
| `needsAuth` | `boolean` | No (runtime) | Indicates the MCP server returned 401 and OAuth2 metadata was found |
| `authUrl` | `string` | No (runtime) | The discovered OAuth2 authorization endpoint URL |

The `auth` sub-object can be added to the MCP entry in `.mcp.json` for manual configuration:

```json
{
  "mcpServers": {
    "ClickUp": {
      "type": "http",
      "url": "https://mcp.clickup.com/mcp",
      "auth": {
        "clientId": "your-registered-client-id",
        "redirectUri": "http://localhost:3000/api/auth/ClickUp/callback"
      }
    }
  }
}
```

### OAuth2AuthConfig (Runtime — not persisted)

Discovered from the MCP server's `/.well-known/oauth-authorization-server`:

| Field | Type | Description |
|-------|------|-------------|
| `authorizationEndpoint` | `string` | URL to redirect user for authorization |
| `tokenEndpoint` | `string` | URL to exchange code for token |
| `registrationEndpoint` | `string` | (Optional) URL for dynamic client registration |
| `scopesSupported` | `string[]` | (Optional) Supported OAuth2 scopes |

### State Transitions

```
connected → [token expires] → 401 received → needsAuth=true → shield visible
                                                                      ↓
                                                              user clicks shield
                                                                      ↓
                                                              popup opens to authUrl
                                                                      ↓
                                                              user authorizes
                                                                      ↓
                                                              callback receives code
                                                                      ↓
                                                              backend exchanges code
                                                                      ↓
                                                              token stored in .mcp.json
                                                                      ↓
                                                              Reconnect → connected
```
