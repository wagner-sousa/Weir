# Research: Fix Zeroed Counters for Serena and Postman

## 1. Root Cause: Postman (OAuth HTTP MCP)

**Decision**: The tool count is 0 because `queryTools()` is never called for auth-gated HTTP MCPs during initial connection testing, and the OAuth callback hardcodes `toolCount: 0` optimistically.

**Rationale**: In `backend/src/api/mcp.routes.ts:57-72`, the flow is:
1. `testConnection()` returns `{ success: false, needsAuth: true }` (HTTP 401)
2. Because `connResult.success === false`, the `if (connResult.success)` block at line 58 is skipped
3. `queryTools()` is never called → `toolCount` stays at `0`
4. In `backend/src/api/auth.routes.ts:309-317`, the OAuth callback sets the cache with `toolCount: 0` optimistically
5. Line 339 calls `testSingleMCPAndBroadcast(name)` in the background — if this fails (token race, timeout), the 0 persists

**Alternatives considered**:
- Query tools before the optimistic cache update (chosen — reorder operations in OAuth callback)
- Always query tools even on `needsAuth` (rejected — no auth token available before OAuth)

## 2. Root Cause: Serena (Local HTTP MCP)

**Decision**: The tool count is 0 because Serena is unreachable from inside the Docker container when `host.docker.internal` does not resolve on Linux.

**Rationale**:
- Serena is configured at `http://host.docker.internal:9121/mcp` (from `.mcp.json:204`)
- On Linux Docker hosts, `host.docker.internal` is NOT available by default — it requires `--add-host host.docker.internal:host-gateway` or `extra_hosts` in docker-compose
- When `testConnection()` fails (connection refused / DNS resolution error), `queryTools()` is skipped, leaving `toolCount: 0`
- The error message does not distinguish "DNS resolution failed" from "server is down" from "server has 0 tools"

**Alternatives considered**:
- Add `extra_hosts` to docker-compose and document it (chosen — simplest fix)
- Implement automatic host.docker.internal fallback (rejected — out of scope, Docker platform concern)
- Improve error reporting to distinguish connectivity issues from zero-tool responses (also chosen — FR-003)

## 3. Why MORPH Does Not Have This Problem

**Decision**: MORPH is a separate MCP gateway proxy project that manages tool listing independently, without relying on Weir's status cache or `testSingleMCP` flow.

**Rationale**:
- MORPH (from `MORPH-specs.txt`) is described as "MCP Optimized Response Protocol Handler"
- It sits BETWEEN AI agents and MCP backends — agents connect to MORPH as a single MCP server
- MORPH aggregates tools from all configured backends on each client connection
- It does NOT use Weir's in-memory `StatusCache` or the `testConnection → queryTools` pattern
- Each client connection to MORPH triggers a fresh `tools/list` query to backends
- Therefore, the stale-cache / skipped-query problem that affects Weir's dashboard never occurs in MORPH

**Alternatives considered**:
- Porting MORPH's tool listing approach to Weir's dashboard (rejected — different architecture, different use case)
- Documenting the architectural difference (chosen — SC-004)

## 4. Frontend Display Logic

**Decision**: The frontend (`MCPCard.tsx:61-68`) already correctly handles three states:
- `toolCount: undefined` → badge hidden
- `toolCount: 0` AND `status === 'unknown'|'testing'` → shows "?"
- `toolCount: 0` AND `status === 'connected'` → shows "0" (server legitimately has 0 tools)
- `toolCount: N` (N > 0) → shows N

**Rationale**: The frontend logic is correct. The bug is entirely in the backend not propagating the correct tool count. No frontend changes needed.

## 5. Existing Fix Attempt (007-fix-tools-counter)

**Decision**: The previous 007 spec identified a related but distinct issue — SSE status events sending `toolCount: null` overwriting cached values. That fix ensured SSE events include `toolCount` from the cache.

**Rationale**: The 007 fix addressed the propagation gap (backend → frontend over SSE). The current issue is more fundamental: `queryTools()` is never called for auth-gated MCPs, so there is no correct value to propagate. The OAuth callback must explicitly query tools before broadcasting status.
