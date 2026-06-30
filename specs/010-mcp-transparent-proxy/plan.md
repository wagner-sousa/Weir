# Implementation Plan: Transparent MCP Proxy

**Branch**: `010-mcp-transparent-proxy` | **Date**: 2026-06-26 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/010-mcp-transparent-proxy/spec.md`

## Summary

Weir becomes a transparent MCP proxy accessible via both stdio and HTTP. AI agents configure `weir --proxy <name>` in their `.mcp.json` for CLI integration, or send HTTP requests to `POST /api/proxy/<name>` for REST integration. Weir forwards JSON-RPC messages bidirectionally, manages auto-reconnect with exponential backoff, buffers messages during disconnection, and supports three backend transports (stdio, SSE, HTTP). Multiple agents can proxy the same backend simultaneously.

## Technical Context

**Language/Version**: Node.js 22 (ESM), TypeScript 5.7+

**Primary Dependencies**: Node.js built-ins only: `child_process`, `readline`, `stream`, `events`

**Storage**: N/A — no persistence needed for proxy (stateless sessions)

**Testing**: Vitest 3 (`tests/unit/` + `tests/integration/`)

**Target Platform**: Linux (Docker container)

**Project Type**: CLI tool + HTTP REST endpoint (proxy subcommand and API route of existing web service)

**Performance Goals**: < 100ms overhead per forwarded message (agent must not perceive proxy latency)

**Constraints**: 
- No external packages for proxy core (Node.js built-ins only)
- `@modelcontextprotocol/sdk` and `mcp-tool-router` must be removed from dependencies
- Agent stdio interface must be identical to direct MCP connection (FR-010)
- HTTP proxy routes must coexist with existing Fastify API routes
- HTTP proxy is stateless per request — no session persistence across requests

**Scale/Scope**: Single backend process per proxy instance; multiple concurrent instances allowed

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Assessment |
|-----------|------------|
| I. Schema-Driven Development (SDD) | ✅ Proxy config from `.mcp.json` schema; no new schemas needed |
| II. Test-First (NON-NEGOTIABLE) | ✅ TDD per component: test written before each implementation task (T017→T005, T019→T010, T018→T011); unit + integration |
| III. English for User-Facing Messages | ✅ All messages in English |
| IV. .mcp.json as Source of Truth | ✅ `--proxy <name>` reads from `.mcp.json` |
| V. Simplicity and Unified Gateway | ✅ Proxy reuses existing Fastify server for WebSocket, same Docker |
| VI. Consistent Icon Library | ✅ N/A — backend-only feature |
| VII. Dependency First | ✅ **JUSTIFIED VIOLATION**: Proxy uses Node built-ins only. Rationale: no suitable npm package provides transparent MCP proxy with custom transport support. Built-in modules provide the exact primitives needed (child_process for stdio, fetch for SSE/HTTP) without overhead. |
| VIII. Icon-First Buttons (Non-Form) | ✅ N/A — backend-only feature |

**Status**: PASS with one justified violation (Principle VII). Proxy core intentionally avoids npm dependencies because no existing package satisfies the transparent proxy + multi-transport + auto-reconnect requirements, and the needed abstractions (streams, processes, fetch) are built into Node.js 22.

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
├── index.ts                     # ALTERADO: add --proxy <name> flag + register HTTP proxy routes
├── api/
│   └── proxy.routes.ts          # NOVO: POST /api/proxy/:name HTTP endpoint
├── proxy/
│   ├── index.ts                 # --proxy <name> entry point
│   ├── proxy.ts                 # Core: connect, forward, state machine, backoff, buffer
│   ├── transport.ts             # TransportAdapter: stdio, SSE, HTTP
│   └── types.ts                 # ProxyConfig, ProxyState, ProxyOptions

backend/tests/
├── unit/
│   ├── proxy.test.ts            # State machine, buffer, backoff
│   └── proxy-http.test.ts       # NOVO: HTTP proxy route unit tests
└── integration/
    ├── proxy.test.ts            # stdio→stdio forwarding, auto-reconnect
    └── proxy-http.test.ts       # NOVO: HTTP endpoint integration tests
```

**Structure Decision**: Following the existing Weir backend monorepo pattern. New `proxy/` module under `backend/src/` with its own tests mirroring the existing test structure.

## Complexity Tracking

> **No violations beyond the justified Principle VII exception above.**

## Env Vars

| Variable | Default | Description |
|----------|---------|-------------|
| WEIR_PROXY_RECONNECT_BASE_DELAY | 1000 | Initial backoff delay in ms |
| WEIR_PROXY_RECONNECT_MAX_DELAY | 30000 | Max backoff delay in ms |
| WEIR_PROXY_RECONNECT_MAX_RETRIES | 10 | Max retries (0 = infinite) |
| WEIR_PROXY_BUFFER_LIMIT | 100 | Max buffered messages |
| WEIR_PROXY_BACKEND_TIMEOUT | 5000 | Backend connection timeout in ms |
| WEIR_PROXY_KEEPALIVE_MS | 15000 | Ping interval during idle in ms |
| WEIR_PROXY_HTTP_TIMEOUT | 30000 | HTTP endpoint backend request timeout in ms |
| WEIR_PROXY_MAX_BODY_SIZE | 1048576 | HTTP endpoint max request body size in bytes |
