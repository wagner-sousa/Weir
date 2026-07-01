# API Contracts: Reconnect OAuth Flow

## No New Endpoints

All existing contracts from specs/004-oauth2-mcp-auth/contracts/api.md remain unchanged.

### Consumed Endpoints

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/api/auth/:name/start` | POST | Get OAuth2 authorization URL (called by handleAuth) | Existing |
| `/api/mcps/test-connection` | POST | Test connection for non-auth reconnect | Existing |

### Decision Logic

The choice between endpoints happens in the frontend:

```
reconnect → client needsAuth && http?
  ├─ true  → POST /api/auth/:name/start  (handleAuth)
  └─ false → POST /api/mcps/test-connection (existing reconnect)
```
