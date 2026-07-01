# Data Model: OAuth2 MCP Auth

## Entities

The same entities from [specs/003-edit-mcp-config/data-model.md](../003-edit-mcp-config/data-model.md) apply here. This document only describes additions for OAuth2.

### MCPEntry — OAuth2 Extensions

The MCP entry gains two new optional runtime/persisted fields:

| Field | Type | Persisted | Description |
|-------|------|-----------|-------------|
| `accessToken` | `string` | Yes (in `.mcp-auth.json`) | OAuth2 access token obtained via authorization code exchange — stored separately from user-editable `.mcp.json` to avoid conflicts on config edits |
| `needsAuth` | `boolean` | No (runtime) | Indicates the MCP server returned 401 and OAuth2 metadata was found |
| `authUrl` | `string` | No (runtime) | The discovered OAuth2 authorization endpoint URL |

The `auth` sub-object can be added to the MCP entry in `.mcp.json` for manual configuration:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `clientId` | `string` | Yes | OAuth2 client ID registered with the provider |
| `clientSecret` | `string` | No | OAuth2 client secret (only if provider requires it — Stripe uses `none` auth method) |
| `redirectUri` | `string` | No | Custom redirect URI (if omitted, backend auto-derives it from request host) |

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
