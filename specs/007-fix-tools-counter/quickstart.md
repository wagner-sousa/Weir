# Quickstart Validation: Fix Tools Counter

## Prerequisites

- Running Weir instance (dev or production)
- An MCP server that exposes tools (e.g., `@modelcontextprotocol/server-filesystem`)

## Setup

```bash
docker compose -f docker-compose.dev.yml up -d dev
```

## Validation Scenarios

### 1. Tool Count Shows Correctly on Add

1. Open the Weir dashboard (http://localhost:5173)
2. Add an MCP that provides tools (e.g., stdio filesystem server)
3. **Expected**: After the modal closes, the card shows the correct tool count
4. **Expected**: The count is a number (not "?" or "0" for a server with tools)

### 2. Tool Count Survives SSE Cycle

1. Open the dashboard with an MCP that has tools
2. Wait for the SSE status update cycle (every 60s or MCP_CACHE_TTL)
3. **Expected**: The tool count remains the same before and after the SSE cycle
4. **Expected**: The count does not reset to 0 or "?"

### 3. Tool Count After Reconnect

1. Click "Reconnect" on an MCP card
2. **Expected**: After reconnection succeeds, the card shows the correct tool count

## Expected Outcomes

- Tool count displays actual number of tools from the MCP server
- Tool count is preserved across SSE status updates
- No backend performance regression (tool query is part of existing async test cycle)
