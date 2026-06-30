# Quickstart Validation: MCP Listing Performance

## Prerequisites

- Running Weir instance (dev or production)
- 5+ MCPs configured in `.mcp.json` (mix of stdio, HTTP, including at least one that times out)
- `curl` or browser with developer tools

## Setup

```bash
# Ensure dev environment is running
docker compose -f docker-compose.dev.yml up -d dev
```

## Validation Scenarios

### 1. Listing Loads Under 1 Second

1. Open the Weir dashboard (http://localhost:5173) with browser dev tools open (Network tab)
2. Observe the `GET /api/mcps` request timing
3. **Expected**: Response arrives in under 1 second regardless of MCP count or status
4. **Expected**: All card names, transport badges, and URLs visible immediately
5. **Expected**: Status icons may show "unknown" briefly, then update as results arrive

### 2. New MCP Appears Immediately After Create

1. Click "Add MCP"
2. Fill: Name = "fast-test", Type = stdio, Command = "echo", Args = "hello"
3. Click "Test Connection" → modal closes
4. **Expected**: "fast-test" card appears in the grid within 1 second
5. **Expected**: Other MCP cards are not disrupted during the update

### 3. Per-MCP Status Updates via SSE

1. Open the dashboard
2. Watch the MCP cards as they load
3. **Expected**: Cards appear with last-known status immediately
4. **Expected**: Status updates arrive individually as each MCP test completes
5. **Expected**: A timing-out MCP does not delay status updates for other MCPs

### 4. Slow MCP Does Not Block Others

1. Configure an MCP that times out: HTTP, URL = `http://192.0.2.1:1` (non-routable)
2. Configure 3 other working MCPs (e.g., stdio echo servers)
3. Load/reload the dashboard
4. **Expected**: The 3 working MCPs show their status within 5 seconds
5. **Expected**: The timing-out MCP shows "testing..." and eventually "error"
6. **Expected**: The working MCPs are not delayed by the timing-out MCP

### 5. Config Change Only Tests Affected MCP

1. Open the dashboard with 5+ MCPs configured
2. Open browser dev tools, watch SSE events
3. Create a new MCP
4. **Expected**: Only the new MCP receives a `testing` event, then a `status` event
5. **Expected**: No status events for existing, unchanged MCPs

## Expected Outcomes

- All MCP cards visible within 1 second of page load (SC-001)
- New MCP card appears within 1 second of create (SC-002)
- Single slow MCP does not delay status of other MCPs (SC-004)
- Status updates arrive incrementally as each test completes (SC-005)
- No .mcp.json schema changes required
