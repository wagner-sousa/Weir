# API Contracts: OAuth Storage Separate

## No New Endpoints — Backend Internal Change Only

All existing API endpoints remain unchanged. The change is in how the backend reads and writes OAuth2 data internally.

### Changed Behavior

| Aspect | Before | After |
|--------|--------|-------|
| Token storage | `.mcp.json` | `.mcp-auth.json` |
| Config path | `MCP_CONFIG_PATH` | `MCP_AUTH_CONFIG_PATH` (default: derived from `MCP_CONFIG_PATH`) |
| File perms | default (umask) | `0600` for `.mcp-auth.json` |
| GET /api/mcps | returned accessToken (implicitly) | __never__ returns accessToken ✅ |

### Response Shapes (unchanged)

All API responses remain exactly as defined in specs/004 and 005. The frontend is not affected.
