# Implementation Plan: Transparent MCP Proxy

**Branch**: `010-mcp-transparent-proxy` | **Date**: 2026-06-26 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/010-mcp-transparent-proxy/spec.md`

## Summary

Weir becomes a transparent MCP proxy accessible via both CLI (`weir --mcp <name>`) and HTTP SSE (`http://<host>:4000/mcp/<name>`). Agents use `weir --mcp <name>` for subprocess-based integration (like a standard MCP server binary), or connect via SSE on a dedicated port (4000) for URL-based MCP connections. Weir forwards JSON-RPC messages bidirectionally, manages auto-reconnect with exponential backoff, buffers messages during disconnection, and supports three backend transports (stdio, SSE, HTTP). Multiple agents can proxy the same backend simultaneously. The dedicated MCP port is isolated from the main API (port 3000).

**Auth Validation (added 2026-07-01)**: The connection test flow now detects auth-gated MCPs where `initialize` succeeds but `tools/list` requires a token. Auth-gated MCPs without a token show `needsAuth` status instead of `connected`. The MCP port (4000) also validates auth before establishing SSE sessions for auth-gated backends.

## Technical Context

**Language/Version**: Node.js 22 (ESM), TypeScript 5.7+

**Primary Dependencies**: Node.js built-ins only: `child_process`, `readline`, `stream`, `events`

**Storage**: N/A — no persistence needed for proxy (stateless sessions)

**Testing**: Vitest 3 (`tests/unit/` + `tests/integration/`)

**Target Platform**: Linux (Docker container)

**Project Type**: CLI tool (`weir --mcp <name>`) + dedicated SSE HTTP server (port 4000, `/mcp/<name>` endpoint)

**Performance Goals**: < 100ms overhead per forwarded message (agent must not perceive proxy latency)

**Constraints**: 
- No external packages for proxy core (Node.js built-ins only)
- `@modelcontextprotocol/sdk` and `mcp-tool-router` must be removed from dependencies
- Agent stdio interface must be identical to direct MCP connection (FR-010)
- Dedicated MCP port server (port 4000) must be isolated from main API (port 3000) — separate Fastify instance
- SSE proxy sessions are stateful — each session has its own backend transport, buffer, and state machine
- `WEIR_MCP_PORT=0` or unset disables the dedicated server (main API only)

**Scale/Scope**: Single backend process per proxy instance; multiple concurrent instances allowed

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Assessment |
|-----------|------------|
| I. Schema-Driven Development (SDD) | ✅ Proxy config from `.mcp.json` schema; no new schemas needed |
| II. Test-First (NON-NEGOTIABLE) | ✅ TDD per component: test written before each implementation task (T017→T005, T019→T010, T018→T011); unit + integration |
| III. English for User-Facing Messages | ✅ All messages in English |
| IV. .mcp.json as Source of Truth | ✅ `--mcp <name>` reads from `.mcp.json` |
| V. Simplicity and Unified Gateway | ✅ Dedicated MCP port server is a separate Fastify instance but reuses the same proxy core (`proxy.ts`, `transport.ts`), transport adapters, and config — no duplication |
| VI. Consistent Icon Library | ✅ N/A — backend-only feature |
| VII. Dependency First | ✅ **JUSTIFIED VIOLATION (x2)**: (1) Proxy uses Node built-ins only. Rationale: no suitable npm package provides transparent MCP proxy with custom transport support. Built-in modules provide the exact primitives needed (child_process for stdio, fetch for SSE/HTTP) without overhead. (2) `@modelcontextprotocol/sdk` added for `StreamableHTTPClientTransport` (HTTP transport adapter). Rationale: the SDK provides the official, spec-compliant streamable HTTP transport implementation; building it from scratch would duplicate significant protocol logic (session management, MCP-Session-ID headers, SSE response parsing). |
| VIII. Icon-First Buttons (Non-Form) | ✅ N/A — backend-only feature |
| IX. Spec Naming Convention | ✅ User stories use "auth-gated HTTP MCP", "non-auth HTTP MCP" — no real service names in FRs or stories |

**Status**: PASS with two justified violations (Principle VII). (1) Proxy core intentionally avoids npm dependencies because no existing package satisfies the transparent proxy + multi-transport + auto-reconnect requirements, and the needed abstractions (streams, processes, fetch) are built into Node.js 22. (2) `@modelcontextprotocol/sdk` is a justified addition for the streamable HTTP transport — building it from scratch would duplicate protocol-level logic better handled by the official SDK. Auth validation scope does not introduce new violations.

## Project Structure

### Documentation (this feature)

```text
specs/010-mcp-transparent-proxy/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Created by /speckit.tasks
```

### Source Code (repository root)

```text
backend/src/
├── index.ts                     # ALTERADO: add --mcp <name> flag + optional MCP port server
├── mcp/
│   └── mcp.server.ts            # NOVO: dedicated Fastify instance on port 4000 (configurable)
│   └── mcp.routes.ts            # NOVO: GET /mcp/<name> (SSE) + POST /mcp/<name>/message
├── proxy/
│   ├── index.ts                 # --mcp <name> entry point (CLI) + createProxySession()
│   ├── proxy.ts                 # Core: connect, forward, state machine, backoff, buffer
│   ├── transport.ts             # TransportAdapter: stdio, SSE, HTTP
│   └── types.ts                 # ProxyConfig, ProxyState, ProxyOptions, SSESession
├── services/
│   └── mcp-client.ts            # ALTERADO: add detectAuthRequired() after initialize + tools/list auth check
├── api/
│   └── mcp.routes.ts            # ALTERADO: catch 401 from queryTools -> set needsAuth:true

backend/tests/
├── unit/
│   ├── proxy.test.ts            # State machine, buffer, backoff
│   ├── mcp-server.test.ts       # NOVO: MCP port server unit tests
│   └── mcp-client.test.ts       # NOVO: detectAuthRequired() unit tests
└── integration/
    ├── proxy.test.ts            # stdio→stdio forwarding, auto-reconnect
    ├── mcp-server.test.ts       # NOVO: SSE stream + message round-trip integration tests
    └── mcp-routes.test.ts       # ALTERADO: auth detection scenarios in test-connection flow
```

**Structure Decision**: Following the existing Weir backend monorepo pattern. New `proxy/` module under `backend/src/` with its own tests mirroring the existing test structure.

## Complexity Tracking

> **No violations beyond the justified Principle VII exception above.**
>
> **Auth Validation Scope**: Minimal complexity addition. Core changes are in `mcp-client.ts` (new `detectAuthRequired` function) and `mcp.routes.ts` (error handling for 401 on tools/list). No new dependencies, no schema changes, no UI changes needed (existing `needsAuth` UI handling reused).

## Env Vars

| Variable | Default | Description |
|----------|---------|-------------|
| WEIR_MCP_PORT | 4000 | Dedicated MCP server port (0 = disabled) |
| WEIR_PROXY_RECONNECT_BASE_DELAY | 1000 | Initial backoff delay in ms |
| WEIR_PROXY_RECONNECT_MAX_DELAY | 30000 | Max backoff delay in ms |
| WEIR_PROXY_RECONNECT_MAX_RETRIES | 10 | Max retries (0 = infinite) |
| WEIR_PROXY_BUFFER_LIMIT | 100 | Max buffered messages |
| WEIR_PROXY_BACKEND_TIMEOUT | 5000 | Backend connection timeout in ms |
| WEIR_PROXY_KEEPALIVE_MS | 15000 | Ping interval during idle in ms |
