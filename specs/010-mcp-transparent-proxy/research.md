# Research: Transparent MCP Proxy

**Phase**: 0 — Research
**Date**: 2026-06-26
**Input**: Feature specification + technical plan

## Decisions

### Proxy Core Architecture

- **Decision**: State machine with 5 states (CONNECTING → CONNECTED → RECONNECTING → DRAINING → CLOSED)
- **Rationale**: Explicit state transitions enable testable, deterministic behavior for all proxy lifecycle paths
- **Alternatives considered**: Simple error/callback approach (lacks observability), event emitter only (harder to test)

### Backoff Strategy

- **Decision**: Exponential backoff with jitter: `min(base * 2^attempt, max) + random(0, 200)ms`
- **Rationale**: Standard pattern proven in distributed systems; jitter prevents thundering herd if multiple proxies reconnect simultaneously
- **Alternatives considered**: Linear backoff (too aggressive at high attempts), fixed delay (wasteful for short outages)

### Transport Separation

- **Decision**: Each transport type (stdio, SSE, HTTP) is an independent implementation of `TransportAdapter` interface
- **Rationale**: Clean separation enables independent testing and future transport additions without touching existing code
- **Alternatives considered**: Single monolithic transport handler (harder to test and extend)

### Message Buffering

- **Decision**: In-memory FIFO queue with configurable limit, drained atomically on reconnect
- **Rationale**: Simplest correct approach; persistence would add complexity without benefit since proxy sessions are ephemeral
- **Alternatives considered**: Disk-backed buffer (unnecessary I/O overhead for ephemeral sessions), no buffer (message loss)

### Multi-Agent Concurrency

- **Decision**: Each `weir --proxy <name>` invocation is a standalone process; no shared state between instances
- **Rationale**: Simplifies correctness (no locks, no shared memory) and leverages OS process isolation
- **Alternatives considered**: Shared proxy pool with connection multiplexing (complex, adds failure domains)

### Node.js Built-ins vs External Packages

- **Decision**: Use only `child_process`, `readline`, `stream`, `events` (Node.js 22 built-ins)
- **Rationale**: No existing npm package provides transparent MCP proxy. The needed primitives (process spawning, line-based I/O, stream piping) are built-in. Avoiding external deps reduces supply-chain risk and simplifies deployment.
- **Alternatives considered**: `@modelcontextprotocol/sdk` (implements MCP server, not proxy), `mcp-tool-router` (tool aggregation, not transparent forwarding)

### Startup Sequence

- **Decision**: `weir --proxy <name>` reads `.mcp.json` → resolves transport type → spawns/connects backend → signals readiness via stdout → begins forwarding loop
- **Rationale**: Matches how agents expect MCP servers to start; the `--proxy` flag appears to the agent as a standard MCP server binary
- **Alternatives considered**: HTTP-based handshake (adds complexity, breaks transparency)

## Open Questions

- None — all technical decisions resolved in speckit.plan.args.md

## Integration Points

- **Frontend WebSocket**: Proxy health status (CONNECTED, RECONNECTING, ERROR, CLOSED) emitted via existing `broadcast('status', ...)` mechanism
- **Docker**: No changes needed — proxy runs in existing `weir-dev` container
- **.mcp.json**: No schema changes — proxy uses existing `command`, `args`, `url` fields to determine transport and connection target
