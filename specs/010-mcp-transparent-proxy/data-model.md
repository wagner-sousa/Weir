# Data Model: Transparent MCP Proxy

## Entities

### ProxyConfig

Read from `.mcp.json` entry for the given `<name>`.

| Field | Type | Description |
|-------|------|-------------|
| name | string | MCP server name |
| command | string? | For stdio transport: the backend command |
| args | string[]? | For stdio transport: command arguments |
| url | string? | For SSE/HTTP transport: backend URL |
| transport | enum | Determined from config: `stdio`, `sse`, or `http` |
| accessToken | string? | OAuth token for authenticated backends |

### ProxySession

Managed per `weir --mcp <name>` invocation or per SSE session on the dedicated MCP port.

| Field | Type | Description |
|-------|------|-------------|
| state | ProxyState | Current state machine state |
| config | ProxyConfig | Resolved backend config |
| transport | TransportAdapter | Active transport instance |
| buffer | MessageBuffer | FIFO queue during disconnection |
| retryCount | number | Current backoff attempt |
| retryTimer | Timer | Pending reconnect timer |
| startedAt | timestamp | Session creation time |

### ProxyState

State machine with valid transitions.

```
                    ┌──────────────────────────────┐
                    │         CONNECTING            │
                    └─────────────┬────────────────┘
                                  │ connected
                                  ▼
                    ┌──────────────────────────────┐
              ┌────▶│          CONNECTED            │────┐
              │     └─────────────┬────────────────┘    │
              │                   │ disconnect           │ close/error
              │                   ▼                      │
              │     ┌──────────────────────────────┐     │
              │     │        RECONNECTING          │     │
              │     │  (+ BUFFERING implicitly)    │     │
              │     └─────────────┬────────────────┘     │
              │                   │ reconnected           │
              │                   ▼                      ▼
              │     ┌──────────────────────────────┐ ┌──────────┐
              └─────│          DRAINING            │ │  CLOSED  │
                    └─────────────┬────────────────┘ └──────────┘
                                  │ drain complete
                                  ▼
                    ┌──────────────────────────────┐
                    │         CONNECTED             │
                    └──────────────────────────────┘
```

### TransportAdapter (Interface)

Methods implemented by each transport type:

- `connect(): Promise<void>` — establish connection to backend
- `disconnect(): void` — close the connection
- `send(message: JsonRpcMessage): Promise<void>` — send message to backend
- `onMessage(handler: (msg: JsonRpcMessage) => void): void` — register message handler
- `onDisconnect(handler: () => void): void` — register disconnect handler

### JsonRpcMessage

Standard JSON-RPC 2.0 message shape (forwarded unmodified).

### MessageBuffer

| Field | Type | Description |
|-------|------|-------------|
| queue | JsonRpcMessage[] | FIFO queue of pending messages |
| limit | number | Max queue size (configurable via env) |
| push(msg) | void | Append to queue; drop oldest if over limit |
| drain() | JsonRpcMessage[] | Return and clear all pending messages |
| size | number | Current queue length |
| dropped | number | Count of dropped messages (monitoring) |

### BackoffState

| Field | Type | Description |
|-------|------|-------------|
| attempt | number | Current attempt (0-based) |
| baseDelay | number | Initial delay in ms |
| maxDelay | number | Maximum delay in ms |
| maxRetries | number | Max attempts (0 = infinite) |
| nextDelay() | number | Calculate and return next delay with jitter |
| reset() | void | Reset to attempt 0 |

### SSESession

Represents one active SSE connection on the dedicated MCP port.

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique session identifier |
| mcpName | string | MCP server name from `.mcp.json` |
| proxySession | ProxySession | Underlying proxy session with backend |
| connectedAt | timestamp | Session creation time |
| lastActivity | timestamp | Last message received/sent |

### MCPPortServer

Configuration for the dedicated MCP port server.

| Field | Type | Description |
|-------|------|-------------|
| port | number | Listen port (default 4000, 0 = disabled) |
| enabled | boolean | Whether the server should start |
| sessions | Map<string, SSESession> | Active SSE sessions |

### StatusEvent

Emitted via WebSocket `broadcast('status', ...)`:

| Field | Type | Description |
|-------|------|-------------|
| name | string | MCP server name |
| status | 'connected' | 'reconnecting' | 'error' | 'closed' |
| error | string? | Error message if applicable |
| toolCount | number | Current tool count (if connected) |
