# Research: MCP Connection Manager

## 1. Writing to .mcp.json

**Decision**: Reuse existing `loadMCPConfig` + new `writeMCPConfig` module.

**Rationale**:
- Existing `loader.ts` already reads and validates .mcp.json
- New `writer.ts` will handle append (add MCP) and remove (delete by key) operations
- Both operations trigger the file watcher, which broadcasts `config:changed` via WebSocket
- No file locking needed (single-user, low-contention scenario)

**Alternatives considered**:
- Direct `fs.writeFile` — simpler but would bypass existing loading/validation flow
- In-memory-only config — violates Constitution IV (.mcp.json as source of truth)

## 2. Testing MCP Connections

**Decision**: Two strategies based on transport type.

**stdio**:
- Check if `command` is resolvable via `which`/`where` or is an absolute path
- Optionally spawn with `--version` or `--help` to verify the command executes
- No persistent connection for test (transient verification only)

**http/sse**:
- Perform HTTP GET/OPTIONS to the provided URL with a timeout (default 5s)
- Success = 2xx or valid SSE endpoint response
- Failure = timeout, connection refused, non-2xx status

**Rationale**: Matches industry MCP client behavior; minimal overhead for test.
The modal's "Test Connection" is a pre-save validation, not a persistent session.

**Alternatives considered**:
- Full MCP handshake (initialize + tools/list) — too heavy for a pre-save test
- TCP port check only — insufficient to verify MCP protocol compliance

## 3. Querying MCP Tools

**Decision**: After connection, perform MCP `initialize` + `tools/list` handshake.

**Rationale**:
- MCP protocol defines `tools/list` as the standard method to discover available tools
- The result populates the badge counter on the card footer
- Connection state is cached per MCP and refreshed on reconnect or page load

**Considerations**:
- stdio: spawn process, pipe JSON-RPC messages, parse response
- http/sse: send JSON-RPC over HTTP
- Timeout for tool query: 10s (matching SC-006)

## 4. Default Connection Timeout

**Decision**: 10 seconds for all transport types.

**Rationale**:
- Matches SC-006 (connection test returns result within 10s)
- Aligns with user expectation of "a few seconds" for network operations
- Configurable via constant in source (no env var needed per Dev Workflow 7 — not a user-facing config)

## 5. API Contract Design

**Decision**: REST endpoints for test-connection, add, remove; tool count returned inline with MCP list.

**Rationale**:
- REST is the existing pattern in `mcp.routes.ts` (GET /api/mcps)
- New endpoints follow the same Fastify route registration pattern
- Tool count queried asynchronously and cached per connection session

**Endpoints**:
- `POST /api/mcps/test-connection` — body: transport config, returns success/error
- `POST /api/mcps` — body: new MCP entry, writes to .mcp.json
- `DELETE /api/mcps/:name` — removes entry from .mcp.json
- `GET /api/mcps/:name/tools` — returns tool list for a specific MCP
