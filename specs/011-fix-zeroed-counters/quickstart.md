# Quickstart: Fix Zeroed Counters for Auth-Gated and Local HTTP MCPs

## Prerequisites

- Docker + Docker Compose (dev environment)
- Running Weir dev stack: `docker compose -f docker-compose.dev.yml up -d dev`
- Access to Postman MCP (requires OAuth configuration) or Serena MCP (local HTTP)
- Test MCP server with known tool count

## Setup

```bash
# Ensure dev environment is running
docker compose -f docker-compose.dev.yml up -d dev

# If dependencies changed
docker compose -f docker-compose.dev.yml run --rm setup

# Verify existing state shows zeroed counters
docker compose -f docker-compose.dev.yml exec dev sh -c "curl -s http://localhost:3001/api/mcps | jq '.clients[] | {name, toolCount, status}'"
```

Expected before fix: auth-gated HTTP MCPs (e.g., Postman) show `toolCount: 0`
and `status: "needsAuth"` (or `"connected"` if OAuth already completed but count
still 0). Local HTTP MCPs (e.g., Serena) may show `toolCount: 0` and
`status: "error"` if unreachable.

## Validation Scenarios

### Scenario 1: Auth-Gated HTTP MCP Tool Count After OAuth

1. Configure Postman MCP in `.mcp.json` (already configured in production config)
2. Open Weir dashboard in browser
3. Click "Connect" on Postman card → OAuth flow opens
4. Complete OAuth authorization
5. After redirect back to Weir, observe the Postman card

**Expected**: Postman card displays the actual tool count (not 0) within 5
seconds of OAuth completion.

### Scenario 2: Local HTTP MCP Reachability Check

1. Ensure Serena is running at `http://localhost:9121/mcp` (or wherever
   configured)
2. If on Linux Docker, ensure `host.docker.internal` resolves:
   ```bash
   # Add to docker-compose.dev.yml under 'dev' service:
   # extra_hosts:
   #   - "host.docker.internal:host-gateway"
   docker compose -f docker-compose.dev.yml up -d dev
   ```
3. Open Weir dashboard
4. Observe Serena card

**Expected**: Serena displays correct tool count when reachable, or a clear
"unreachable" error message (not "0 tools") when unreachable.

### Scenario 3: Error Message Clarity

1. Stop a local HTTP MCP server (e.g., `docker compose stop` or kill the serena
   process)
2. Open Weir dashboard
3. Observe the MCP card error message

**Expected**: Error message says "Server unreachable: Connection refused" (or
similar), not just "Connection failed".

### Scenario 4: OAuth Token Refresh

1. After Postman OAuth is complete, wait for token expiry (or manually revoke)
2. System should automatically refresh token
3. After refresh, tool count should remain correct

**Expected**: Tool count persists correctly across token refresh cycles.

## Full Test Suite

```bash
docker compose -f docker-compose.dev.yml exec dev sh -c "cd /app/backend && npm test"
```

Expected: All tests pass, including new unit tests for OAuth callback tool count
propagation and new integration tests for error message clarity.

## Type Checking

```bash
docker compose -f docker-compose.dev.yml exec dev sh -c "cd /app/backend && npx tsc --noEmit"
docker compose -f docker-compose.dev.yml exec dev sh -c "cd /app/frontend && npx tsc --noEmit"
```

Expected: Zero type errors.

## Manual Verification Checklist

- [ ] Auth-gated HTTP MCP OAuth → correct tool count
- [ ] Local HTTP MCP reachable → correct tool count
- [ ] Local HTTP MCP unreachable → clear error, not "0"
- [ ] Token refresh → tool count persists
- [ ] Non-auth HTTP MCP (e.g., a test echo server) → correct tool count (no
      regression)
- [ ] Stdio MCP → correct tool count (no regression)
