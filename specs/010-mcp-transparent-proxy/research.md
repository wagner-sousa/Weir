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

- **Decision**: Each `weir --mcp <name>` invocation is a standalone process; no shared state between instances
- **Rationale**: Simplifies correctness (no locks, no shared memory) and leverages OS process isolation
- **Alternatives considered**: Shared proxy pool with connection multiplexing (complex, adds failure domains)

### Node.js Built-ins vs External Packages

- **Decision**: Use only `child_process`, `readline`, `stream`, `events` (Node.js 22 built-ins). For the dedicated MCP port server, use Fastify (already a dependency).
- **Rationale**: No existing npm package provides transparent MCP proxy. The needed primitives (process spawning, line-based I/O, stream piping) are built-in. Fastify is already in the project for the main API.
- **Alternatives considered**: `@modelcontextprotocol/sdk` (implements MCP server, not proxy), `mcp-tool-router` (tool aggregation, not transparent forwarding)

### Startup Sequence (CLI)

- **Decision**: `weir --mcp <name>` reads `.mcp.json` → resolves transport type → spawns/connects backend → signals readiness via stdout → begins forwarding loop
- **Rationale**: Matches how agents expect MCP servers to start; the `--mcp` flag appears to the agent as a standard MCP server binary
- **Alternatives considered**: HTTP-based handshake (adds complexity, breaks transparency)

### SSE Session Management (Dedicated Port)

- **Decision**: Each `GET /mcp/<name>` SSE connection creates a dedicated proxy session with its own transport adapter, message buffer, and state machine. The session lives for the duration of the SSE connection.
- **Rationale**: Stateless per-request HTTP would lose the persistent connection needed for bidirectional streaming. SSE provides the long-lived channel, POST `/message` delivers agent requests.
- **Alternatives considered**: WebSocket (heavier, not standard MCP transport), polling (inefficient, no server push)

### MCP Port Server Architecture

- **Decision**: Separate Fastify instance on port 4000 (configurable via `WEIR_MCP_PORT`), isolated from the main API server on port 3000
- **Rationale**: Clear separation of concerns — port 3000 serves API routes and frontend, port 4000 serves only MCP SSE connections. If `WEIR_MCP_PORT=0`, no server starts; main API unaffected.
- **Alternatives considered**: Same Fastify instance on a different route prefix (risk of route conflicts, couples concerns)

## Decisions (Auth Validation)

### Auth Detection Strategy

- **Decision**: After `initialize` succeeds in `testHttpConnection`, the test flow MUST also attempt `tools/list`. If `tools/list` returns HTTP 401 and no `accessToken` is configured, the connection result is `needsAuth: true`.
- **Rationale**: Some MCP servers (e.g., Postman) accept `initialize` without authentication but require a Bearer token for `tools/list`. Testing only `initialize` gives a false `success` for these servers. Calling `tools/list` after `initialize` detects the auth requirement regardless of when the 401 occurs (on initialize or on tools/list).
- **Alternatives considered**:
  - Check `auth` config in `.mcp.json` entry (not all MCPs declare auth upfront — some discover it only on 401)
  - Rely solely on `initialize` 401 detection (misses servers like Postman that allow unauthenticated initialize)
  - Use `.well-known/oauth-authorization-server` discovery during test (already done for 401 handling, but may not exist for servers that allow unauthenticated initialize)

### NeedsAuth Propagation

- **Decision**: When `queryTools` returns a 401 error (caught as exception), the calling code in `mcp.routes.ts` MUST catch the error, inspect it, and if it's an auth error with no `accessToken` available, set `needsAuth: true` on the cached status instead of leaving it as `connected`.
- **Rationale**: The existing code in `mcp.routes.ts` line 57-71 tries `queryTools` but only catches errors generically (line 68-70), leaving `needsAuth: false`. The error handler needs to distinguish auth errors from other failures.
- **Alternatives considered**: Modify `queryTools` to return structured errors (breaking change to its signature). The current try/catch approach is minimal and contained.

### Auth Detection Function Reuse

- **Decision**: Extract the `tools/list` auth check into a shared function `detectAuthRequired(transport, accessToken): Promise<boolean>` that can be called from both `testHttpConnection` and the SSE proxy session initialization.
- **Rationale**: The MCP port (4000) also needs to detect missing auth before establishing a proxy session. A shared function prevents duplication.
- **Alternatives considered**: Inline auth detection in each caller (duplication risk), modify `testConnection` to accept an optional flag (more complex API).

## Open Questions

- None resolved.
- **QUESTION**: Should the MCP port (4000) SSE endpoint reject connections for auth-gated MCPs without tokens, or allow them but send a `needsAuth` event?
  - **Resolution**: Reject with HTTP 401 (consistent with how the backend itself signals auth required). The agent receives a clear error and can retry with a token.

## Integration Points (Auth Validation)

- **`backend/src/services/mcp-client.ts`**: Add `detectAuthRequired()` function called from `testHttpConnection` after `initialize` succeeds. Also add auth detection to `testSseConnection`.
- **`backend/src/api/mcp.routes.ts`**: Update the error handling in `testMCPConnection` (line 57-71) to detect 401 from `queryTools` and set `needsAuth: true`.
- **`backend/src/mcp/mcp.routes.ts` (MCP port)**: Add auth check when an SSE session initializes — reject with HTTP 401 if auth required but no token available.
- **Frontend (`MCPCard.tsx`, `CardGrid.tsx`)**: No changes needed — the existing `needsAuth` status handling already shows warning icon, tooltip, and OAuth button.

## Integration Points

- **Frontend WebSocket**: Proxy health status (CONNECTED, RECONNECTING, ERROR, CLOSED) emitted via existing `broadcast('status', ...)` mechanism
- **Docker**: No changes needed — proxy runs in existing `weir-dev` container. Add `WEIR_MCP_PORT` env var and port mapping to `docker-compose.dev.yml`
- **.mcp.json**: No schema changes — proxy uses existing `command`, `args`, `url` fields to determine transport and connection target
- **Main API**: Unchanged — port 3000 continues serving `/api/*` routes and frontend. The MCP port server is started independently from the main server startup
