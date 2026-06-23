# API Contracts: Save on Test

## No New Endpoints

This feature introduces zero new backend endpoints. All API contracts from [specs/004-oauth2-mcp-auth/contracts/api.md](../../004-oauth2-mcp-auth/contracts/api.md) remain unchanged.

### Consumed Endpoints

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/api/mcps/test-connection` | POST | Test connection and get result (success/needsAuth/error) | Existing |
| `/api/mcps` | POST | Save new MCP configuration | Existing |
| `/api/mcps/:name` | PUT | Update existing MCP configuration | Existing |
| `/api/auth/:name/start` | POST | Get OAuth2 authorization URL | Existing |

### Response Shapes (unchanged)

**POST /api/mcps/test-connection** (used for auto-test):
```json
// Success
{ "success": true }

// Needs OAuth2
{ "success": false, "needsAuth": true, "authUrl": "https://..." }

// Error
{ "success": false, "error": "Connection refused" }
```

**POST /api/auth/:name/start** (used for auto-popup):
```json
// Success
{ "success": true, "url": "https://oauth-provider/authorize?..." }

// Missing clientId
{ "success": false, "url": null, "error": "No client_id configured..." }
```
