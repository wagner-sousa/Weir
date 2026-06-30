# TransportAdapter Contract

## Interface

```typescript
interface TransportAdapter {
  connect(): Promise<void>;
  disconnect(): void;
  send(message: JsonRpcMessage): Promise<void>;
  onMessage(handler: (msg: JsonRpcMessage) => void): void;
  onDisconnect(handler: () => void): void;
  onError(handler: (err: Error) => void): void;
}
```

## Implementations

### StdioTransport

- `command` + `args` from `.mcp.json`
- Spawn via `child_process.spawn()`
- Readline on stdout for incoming messages
- stdin.write() for outgoing messages
- Detect disconnect via `close` event on child process

### SSETransport

- `url` from `.mcp.json`
- GET `url` for SSE stream (incoming)
- POST `url`/message for outgoing JSON-RPC
- Detect disconnect via SSE stream end or HTTP error

### HttpTransport

- `url` from `.mcp.json`
- POST `url` for each JSON-RPC message
- Response body contains JSON-RPC response
- Streaming response for long-running operations
- Connection pool for concurrent requests

## Contracts

### Connection Contract

1. `connect()` MUST resolve when the backend is ready to receive messages
2. `connect()` MUST reject if the backend cannot be reached within `PROXY_BACKEND_TIMEOUT`
3. After `connect()` resolves, `onMessage` MUST be called for each incoming JSON-RPC message
4. After `connect()` resolves, `send()` MUST deliver messages to the backend

### Disconnection Contract

1. When the backend disconnects, `onDisconnect` MUST be called exactly once
2. If the backend errors before connecting, `onError` MUST be called and `connect()` MUST reject
3. After `disconnect()` is called, no further `onMessage` or `onDisconnect` callbacks MUST fire

### Message Contract

1. `send(message)` MUST accept any valid JSON-RPC 2.0 message
2. `send(message)` MUST reject if the transport is disconnected
3. Incoming messages via `onMessage` MUST be complete, parsed JSON-RPC objects
4. Message ordering MUST be preserved (FIFO)
