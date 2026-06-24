# Quickstart Validation: OAuth Storage Separate

## Prerequisites

- Running Weir instance (dev or production)
- An HTTP MCP configured with OAuth2 auth and stored tokens

## Setup

```bash
docker compose -f docker-compose.dev.yml up -d dev
```

## Validation Scenarios

### 1. No Secrets in .mcp.json

1. Stop the dev service: `docker compose -f docker-compose.dev.yml down`
2. Check `.mcp.json` — it should NOT contain `accessToken`, `auth`, or `pendingCodeVerifier`
3. **Expected**: Only transport config (type, url, command, args, env)
4. Check `.mcp-auth.json` — it should contain the OAuth tokens

### 2. Migration of Existing Data

1. If you had OAuth data in `.mcp.json` before this update:
2. Start the service
3. **Expected**: Data is automatically migrated to `.mcp-auth.json`
4. **Expected**: `.mcp.json` no longer has OAuth fields

### 3. Auth Still Works

1. Open the dashboard (http://localhost:5173)
2. Verify HTTP MCPs with OAuth2 still connect and show tool counts
3. Perform a new OAuth2 authorization
4. **Expected**: Token is stored in `.mcp-auth.json`, not `.mcp.json`

### 4. File Permissions

1. Check `.mcp-auth.json` permissions
2. **Expected**: `-rw-------` (0600)

```bash
ls -la .mcp-auth.json
```

## Expected Outcomes

- `.mcp.json` contains no secrets — safe to share
- `.mcp-auth.json` has restricted permissions (0600)
- All existing auth functionality preserved
- Automatic migration of existing tokens
