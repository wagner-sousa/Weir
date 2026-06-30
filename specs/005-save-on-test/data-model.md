# Data Model: Save on Test

## Entities

No new entities or fields. The feature reuses the existing data model from [specs/004-oauth2-mcp-auth/data-model.md](../004-oauth2-mcp-auth/data-model.md).

### MCPEntry — No Changes

The `.mcp.json` schema and all MCP entry fields remain unchanged:

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| `type` | `string` | `.mcp.json` | Transport type (stdio/http/sse) |
| `command` | `string` | `.mcp.json` | Stdio command |
| `args` | `string[]` | `.mcp.json` | Stdio arguments |
| `url` | `string` | `.mcp.json` | HTTP/SSE URL |
| `env` | `object` | `.mcp.json` | Environment variables |
| `auth.clientId` | `string` | `.mcp.json` | OAuth2 client ID |
| `auth.clientSecret` | `string` | `.mcp.json` | OAuth2 client secret |
| `accessToken` | `string` | `.mcp.json` | Persisted OAuth2 token |

### Frontend State — Modal-local (not persisted)

| State | Type | Description |
|-------|------|-------------|
| `testResult` | `TestConnectionResult \| null` | Cached test outcome; null means no test run yet |
| `testing` | `boolean` | True while a test is in progress |

The `testResult` is used by the auto-test-on-save logic to determine whether a connection test has already been performed for the current configuration.

### State Transitions

```
modal open → user fills config → clicks "Test Connection"
  ├─ success → auto-save → modal close
  ├─ needsAuth → auto-save → modal close (shield on card)
  └─ error → show error, stay in modal

modal open → user fills config → clicks "Save" (no prior test)
  └─ auto-test triggered:
       ├─ success → save → modal close
       ├─ needsAuth + clientId → save → modal close → open OAuth2 popup
       ├─ needsAuth + no clientId → save → modal close → warning toast
       └─ error → show error, do NOT save, stay in modal
```
