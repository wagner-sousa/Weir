# MORPH Architectural Comparison

## Why MORPH Does Not Have Zeroed Tool Counters

### 1. MORPH Architecture Overview

MORPH is a standalone MCP gateway proxy that sits between AI agents and MCP backends:

```
AI Agent → MorphMCPServer → Hub → Router → MCPClientRegistry → backend
                                         → ToonConverter (JSON → TOON)
```

Agents connect to MORPH as a **single MCP server**. MORPH aggregates tools from all
configured backends and converts JSON responses to TOON (Token-Oriented Object Notation).

### 2. Per-Client-Connection Tool Listing

The key architectural difference: MORPH queries tools **per-client-connection**.

Each time an AI agent connects to MORPH, the gateway:
1. Reads the config (`.mcp.json`) to discover backends
2. Connects to each backend (stdio/HTTP/SSE)
3. Calls `tools/list` on each backend
4. Aggregates the results for that specific client session

There is **no status cache**. Every connection triggers a fresh `tools/list` query
to every backend. This means:
- Tool counts are always current
- There's no stale cache to worry about
- Auth-gated backends are queried when the client connects (the token lives in the
  per-connection session, not a shared cache)

### 3. The Root Architectural Difference

| Aspect | Weir Dashboard | MORPH |
|--------|---------------|-------|
| Role | Monitoring dashboard | Gateway proxy |
| Tool listing | Polled periodically + cached | Per-client-connection on demand |
| Status tracking | `CachedStatus` + `setCachedStatus` + `broadcast` | None |
| Cache TTL | 60s (`MCP_CACHE_TTL`) | No cache |
| Auth token handling | Global per-MCP in `mcp-auth.json` | Per-connection session |
| Error if backend down | Shows "0 tools" or cached stale result | Connection fails per-client |

**Weir's dashboard** uses a shared status cache (`CachedStatus`) that is populated
by `testSingleMCP`. When `testConnection` returns `success: false` (401 for Postman,
connection refused for Serena), `queryTools` is skipped and the cache stores
`toolCount: 0`. This stale zero propagates to all WebSocket clients until the
next poll cycle (60s later) — or indefinitely if the error persists.

**MORPH** never stores tool counts. Each agent-client connection triggers a fresh
`tools/list` to every backend. If a backend is down, that specific agent session
sees the error, but no stale state lingers. There is no "0 tools" to display because
tools are not counted — they are aggregated on demand.

### 4. Why Porting MORPH's Approach Would Not Work in Weir

Weir's dashboard serves a different purpose: it monitors MCP health and tool counts
from a management UI. This inherently requires:
- **Status cache**: The UI needs to show tool counts without connecting to every MCP
  on every render
- **Periodic polling**: Background re-testing catches transient failures
- **Broadcast**: All WebSocket clients share the same view of MCP status

MORPH's per-connection pattern is correct for its role as a gateway proxy, but
would be wasteful and architecturally inappropriate for a monitoring dashboard.

### 5. Summary

The bug exists in Weir because of the shared caching layer (`CachedStatus`) and the
conditional skip of `queryTools` when `testConnection` fails. MORPH avoids this
entire class of bug by design: it has no cache, no periodic polling, and no shared
state between clients. Each connection is independent and fresh.
