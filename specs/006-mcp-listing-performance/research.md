# Research: MCP Listing Performance

## 1. In-Memory Connection Status Cache

**Decision**: Use a `Map<string, CachedStatus>` in a singleton module within `backend/src/services/status-cache.ts`. TTL defaults to 60s, configurable via `MCP_CACHE_TTL` env var.

**Rationale**:
- Single-user dashboard — no need for Redis or distributed cache
- Map is fast, simple, and automatically garbage-collected
- TTL prevents stale status from persisting indefinitely
- Standalone service can be imported by both `mcp.routes.ts` and the SSE handler

**Alternatives considered**:
- WeakRef-based cache — unnecessary complexity for this use case
- File-based cache — adds I/O overhead, contradicts "fast listing" goal
- Module-level closure — essentially the same as Map singleton

## 2. Listing Endpoint Split

**Decision**: `GET /api/mcps` returns config-only data (name, transport, url, command) with cached status if available. Remove all `testConnection` and `queryTools` calls from this handler. Status updates arrive via SSE.

**Rationale**:
- Config read from `.mcp.json` is extremely fast (< 50ms)
- Connection tests are the bottleneck — removing them makes listing instant
- Frontend already has SSE support for streaming updates
- Cached status provides immediate feedback until fresh tests complete

**New endpoint behavior**:
```typescript
// GET /api/mcps — returns config + cached status, NO connection tests
{
  clients: [{
    name: "ClickUp",
    transport: "http",
    url: "https://mcp.clickup.com/mcp",
    status: statusCache.get("ClickUp")?.status ?? "unknown",
    error: statusCache.get("ClickUp")?.error ?? null,
    toolCount: statusCache.get("ClickUp")?.toolCount ?? 0,
  }],
  timestamp: "..."
}
```

**Alternatives considered**:
- Separate `/api/mcps/config` and `/api/mcps/status` endpoints — unnecessary, one endpoint with cached status is simpler
- GraphQL-style selective fields — overkill for this project

## 3. Per-MCP Independent Testing

**Decision**: In the SSE handler and after config changes, schedule per-MCP connection tests with `Promise.allSettled`, broadcasting each result individually.

**Rationale**:
- `Promise.allSettled` runs all tests in parallel and reports individual results
- Each result is broadcast immediately via SSE `status` event
- A single timeout (default 5s) affects only that MCP's result

**Flow**:
1. After `GET /api/mcps` returns cached listing, the SSE handler starts background tests
2. All MCPs tested concurrently via `Promise.allSettled`
3. Each completed test → cache update → SSE broadcast to frontend
4. Frontend `connectSSE` handler updates individual card status

**Alternatives considered**:
- Sequential testing with early return — slower for many MCPs
- Batch testing in groups of 3 — unnecessary complexity, allSettled handles all

## 4. Selective Testing on Config Change

**Decision**: When a config change event fires (create/edit/delete), test ONLY the affected MCP and broadcast its status. Do NOT re-test all MCPs.

**Rationale**:
- Only the changed MCP's connection status is unknown
- Other MCPs maintain their cached status until the next periodic cycle
- Dramatically reduces the time to show the new card
- The SSE periodic cycle (every 30s) eventually refreshes all statuses

**Alternatives considered**:
- Testing all MCPs on every change — negates the performance benefit
- Not testing the new MCP at all — user would not see if connection works

## 5. SSE Status Stream

**Decision**: Keep the existing `GET /api/mcps/events` SSE endpoint but optimize it to broadcast per-MCP results as they arrive, rather than sending all results in a single `done` event.

**Rationale**:
- Frontend can update cards incrementally as each test completes
- No need for the `done` event — each MCP's status is independent
- Frontend's `connectSSE` already handles individual `status` events
- Remove the 30s polling interval and replace with event-driven updates triggered by config changes and periodic refresh

**Event format** (unchanged from existing):
```json
event: status
data: { "name": "ClickUp", "status": "error", "toolCount": null, "error": "HTTP 401" }
```

**Alternatives considered**:
- Dedicated WebSocket messages — existing SSE is sufficient
- Polling from frontend — SSE is more efficient
