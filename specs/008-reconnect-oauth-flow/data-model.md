# Data Model: Reconnect OAuth Flow

## Entities

No new entities. The existing data model from specs/004-oauth2-mcp-auth applies.

### Key Decision Points in handleReconnect

| State | Condition | Action |
|-------|-----------|--------|
| HTTP + needsAuth | `client.transport === 'http' && client.needsAuth` | Open OAuth popup (call handleAuth) |
| Non-HTTP | `client.transport !== 'http'` | Run connection test (existing flow) |
| HTTP without needsAuth | `client.needsAuth === false` | Run connection test (existing flow) |

### State Transitions

```
reconnect clicked → check needsAuth + http?
  ├─ yes → handleAuth(client) → popup opens → user authorizes → status updates
  └─ no  → testConnection → success? → toast
                                └─ error → toast with error
```
