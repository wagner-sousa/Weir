# Proxy CLI Contract

## Usage

```bash
weir --proxy <name> [options]
```

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `--proxy <name>` | Yes | MCP server name from `.mcp.json` |

## Environment Variables

See [plan.md](../plan.md) env vars table.

## I/O Contract

- **stdin**: Receives JSON-RPC 2.0 messages (newline-delimited) from agent
- **stdout**: Sends JSON-RPC 2.0 responses (newline-delimited) to agent
- **stderr**: Logging and diagnostics (not parsed by agent)

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Graceful shutdown (SIGTERM/SIGINT, or agent stdin closed) |
| 1 | Backend unreachable or max retries exceeded |
| 2 | MCP `<name>` not found in `.mcp.json` |
| 3 | Invalid transport configuration |

## Startup Sequence

1. Read `.mcp.json` and resolve config for `<name>`
2. Determine transport type from config (`command` → stdio, `url` with SSE features → SSE, `url` without → HTTP)
3. Call `transport.connect()`
4. On success: begin forwarding loop (stdin → transport, transport → stdout)
5. On failure: print error to stderr, exit with code 1

## Transparency Requirement

The proxy MUST NOT add, remove, or modify any JSON-RPC fields. The agent MUST receive exactly the same responses it would receive from a direct connection.
