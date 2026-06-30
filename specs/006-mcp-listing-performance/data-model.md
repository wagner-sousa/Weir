# Data Model: MCP Listing Performance

## Entities

### CachedStatus (New — in-memory only, not persisted)

| Field | Type | Description |
|-------|------|-------------|
| `status` | `'connected' \| 'error' \| 'needsAuth' \| 'unknown'` | Last-known connection status |
| `error` | `string \| null` | Error message from last test (if any) |
| `toolCount` | `number` | Number of tools from last successful query |
| `lastTestedAt` | `number` | Unix timestamp of last test |
| `ttl` | `number` | Time-to-live in ms (default 60000) |

### StatusUpdate (New — SSE event payload)

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | MCP name |
| `status` | `'connected' \| 'error' \| 'needsAuth' \| 'testing'` | Current status |
| `error` | `string \| null` | Error message (if status is error) |
| `toolCount` | `number \| null` | Tool count (null if status is not connected) |

### MCPClient (Updated — response shape)

The `GET /api/mcps` response now uses cached status instead of testing connections:

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| `name` | `string` | `.mcp.json` | MCP name |
| `transport` | `string` | `.mcp.json` | Transport type |
| `command` | `string?` | `.mcp.json` | Stdio command |
| `args` | `string[]?` | `.mcp.json` | Stdio arguments |
| `url` | `string?` | `.mcp.json` | HTTP/SSE URL |
| `env` | `object?` | `.mcp.json` | Environment variables |
| `status` | `string` | **Cache** | Cached status (falls back to "unknown") |
| `error` | `string?` | **Cache** | Cached error (null if none) |
| `toolCount` | `number` | **Cache** | Cached tool count (0 if uncached) |
| `needsAuth` | `boolean` | **Cache** | From cached result |
| `authUrl` | `string?` | **Cache** | From cached result |

### State Transitions

```
initial load:
  GET /api/mcps → returns config + cached status (or "unknown")
  SSE stream starts → background tests per-MCP in parallel
  status: "testing" → status: "connected" | "error" | "needsAuth"

config change (create/edit/delete):
  Only affected MCP tested
  Cache updated for that MCP
  SSE broadcasts single status update
  Frontend refreshes listing (config-only, fast)

periodic refresh (every 60s or MCP_CACHE_TTL):
  All MCPs tested in parallel
  Each result broadcast individually via SSE
  Cache updated per-MCP as results arrive
```
