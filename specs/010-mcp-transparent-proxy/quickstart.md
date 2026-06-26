# Quickstart: Transparent MCP Proxy

## Prerequisites

- Docker + Docker Compose
- A test MCP server (e.g., the example stdio echo server)
- Agent configured with MCP pointing to `weir --proxy <name>`

## Setup

```bash
# Ensure dev environment is running
docker compose -f docker-compose.dev.yml up -d dev

# If dependencies changed
docker compose -f docker-compose.dev.yml run --rm setup
```

## Validation Scenarios

### Scenario 1: Stdio→Stdio Proxy

Given a test MCP backend that runs as a child process:

```bash
# Inside the dev container
cd /app/backend
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | npx tsx src/index.ts --proxy test-mcp
```

**Expected**: JSON-RPC response with the backend's tool list printed to stdout.

### Scenario 2: Auto-Reconnect

1. Start a test MCP backend that crashes after processing one message
2. Connect via `weir --proxy crash-test`
3. Send a `tools/list` request → receives response
4. Send a second request → backend crashes
5. Proxy logs "Reconnecting..." with increasing delays
6. Restart the test backend
7. Proxy reconnects and forwards buffered/delayed messages

**Expected**: Second request eventually completes after backend restart. No error message to agent.

### Scenario 3: Multiple Concurrent Proxies

1. Open two terminal sessions in the dev container
2. In each: `echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | npx tsx src/index.ts --proxy test-mcp`
3. Both sessions print identical tool lists
4. Both sessions remain independent (SIGINT on one does not affect the other)

**Expected**: Both proxies function independently.

### Scenario 4: All Transport Types

Using the example OAuth server as an SSE backend:

```bash
# Start OAuth example backend
npx tsx src/examples/oauth-server.ts &

# Proxy through Weir
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | npx tsx src/index.ts --proxy oauth-backend
```

**Expected**: Successful tool list response for each transport type.

## Full Test Suite

```bash
docker compose -f docker-compose.dev.yml exec dev sh -c "cd /app/backend && npm test"
```

Expected: All proxy-related tests pass (unit + integration).

## Type Checking

```bash
docker compose -f docker-compose.dev.yml exec dev sh -c "cd /app/backend && npx tsc --noEmit"
docker compose -f docker-compose.dev.yml exec dev sh -c "cd /app/frontend && npx tsc --noEmit"
```

Expected: Zero type errors.
