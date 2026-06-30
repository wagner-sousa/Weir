# Data Model: Fix Zeroed Counters for Serena and Postman

## Existing Types (Affected)

### CachedStatus

Stored in `StatusCache` (in-memory, 60s TTL). No new fields needed — `toolCount` already exists.

| Field | Type | Description |
|-------|------|-------------|
| status | `'unknown' \| 'connected' \| 'error' \| 'needsAuth'` | Connection state |
| error | `string \| null` | Error message if status is error |
| toolCount | `number` | Number of tools from last successful `tools/list` query |
| needsAuth | `boolean` | Whether the MCP requires OAuth authentication |
| authUrl | `string \| null` | OAuth authorization URL if needsAuth |
| lastTestedAt | `number` | Timestamp of last test (for TTL expiry) |

### StatusUpdate

Broadcast via WebSocket and SSE.

| Field | Type | Description |
|-------|------|-------------|
| name | `string` | MCP server name |
| status | `string` | Connection status |
| error | `string \| null` | Error message |
| toolCount | `number \| null` | Tool count (`null` = unknown/unqueried) |

## State Transitions

### Postman (OAuth HTTP MCP) — Current (Buggy)

```
testConnection → 401 (needsAuth)
                    ↓
              toolCount = 0 (queryTools SKIPPED)
                    ↓
              OAuth callback → toolCount = 0 (hardcoded optimistic)
                    ↓
              testSingleMCPAndBroadcast (background, may fail silently)
```

### Postman (OAuth HTTP MCP) — Fixed

```
testConnection → 401 (needsAuth)
                    ↓
              OAuth callback → queryTools (with token) → toolCount = tools.length
                    ↓
              Status broadcast with correct toolCount
```

### Serena (Local HTTP MCP) — Current (Buggy)

```
testConnection → unreachable (host.docker.internal not resolved)
                    ↓
              toolCount = 0 (queryTools SKIPPED)
                    ↓
              Error: generic "connection failed" (does not distinguish DNS vs tool count)
```

### Serena (Local HTTP MCP) — Fixed

```
testConnection → unreachable
                    ↓
              Error message: "Server unreachable: host.docker.internal:9121 (DNS resolution failed)"
                    ↓
              Frontend shows distinct "unreachable" state (not "0 tools")
```
