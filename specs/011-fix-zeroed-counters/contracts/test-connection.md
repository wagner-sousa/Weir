# Test Connection Contract

## Endpoint: `POST /api/mcps/test-connection`

**Purpose**: Test connectivity and query tools for a specific MCP.

### Current Behavior

```
POST /api/mcps/test-connection { transport, name }
  ↓
testConnection()
  ↓
if (success) → queryTools() → toolCount = tools.length
if (!success) → toolCount = 0  ← queryTools NEVER called
  ↓
setCachedStatus(name, { toolCount })
broadcast('status', { toolCount })
```

### Required Change: Improve Error Detail

When `testConnection` fails for a local HTTP MCP (like Serena), the error message
must distinguish between:
1. **DNS resolution failure** — `host.docker.internal` not found
2. **Connection refused** — server is down
3. **Timeout** — server is slow or unreachable
4. **Server responded but has 0 tools** — valid response

### Error Contract

| Condition | Current Error | Fixed Error |
|-----------|---------------|-------------|
| DNS failure | `Connection failed` | `Server unreachable: DNS resolution failed for {url}` |
| Connection refused | `Connection failed` | `Server unreachable: Connection refused at {url}` |
| Timeout | `Connection failed` | `Server unreachable: Connection timed out at {url}` |
| 0 tools from server | `Connected (0 tools)` | `Connected — server reports 0 tools` |
