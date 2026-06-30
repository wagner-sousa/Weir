# Data Model: OAuth Storage Separate

## Entities

### AuthStorage (New — file `.mcp-auth.json` via `conf` package)

The `conf` package manages the file with atomic writes, auto-creation, and JSON parsing.

```json
{
  "mcpServers": {
    "ClickUp": {
      "accessToken": "eyJhbGciOiJkaXIi...",
      "auth": {
        "clientId": "mcp-client-abc123",
        "clientSecret": "cs_..."
      },
      "pendingCodeVerifier": "E9Melhoa2Ow..."
    }
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `accessToken` | `string` | Yes | OAuth2 access token |
| `auth.clientId` | `string` | Yes | OAuth2 client ID |
| `auth.clientSecret` | `string` | No | OAuth2 client secret |
| `pendingCodeVerifier` | `string` | No | PKCE code verifier |

### MCPEntry (Updated — `.mcp.json`)

Removed fields: `accessToken`, `auth`, `pendingCodeVerifier`.

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| `type` | `string` | `.mcp.json` | Transport type |
| `command` | `string?` | `.mcp.json` | Stdio command |
| `url` | `string?` | `.mcp.json` | HTTP/SSE URL |
| ... | ... | `.mcp.json` | All transport fields |

### Migration Flow

```
loadConfig() → check each MCP for inline OAuth fields
  ├─ found → copy to .mcp-auth.json → save .mcp-auth.json → strip from .mcp.json → save .mcp.json
  └─ not found → use existing .mcp-auth.json data

getAuthConfig(name) → read from .mcp-auth.json
  ├─ file missing → return undefined (no auth)
  └─ file exists → return entry for name

setAuthConfig(name, data) → update .mcp-auth.json
  ├─ file missing → create with 0600 permissions
  └─ file exists → merge entry → write back
```
