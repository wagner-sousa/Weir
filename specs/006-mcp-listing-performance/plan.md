# Implementation Plan: MCP Listing Performance

**Branch**: `006-mcp-listing-performance` | **Date**: 2026-06-23 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-mcp-listing-performance/spec.md`

## Summary

The MCP listing (`GET /api/mcps`) currently tests every connection sequentially before returning, causing multi-second delays with 5+ MCPs. This feature splits the listing into a fast config-only endpoint and an async status stream, adds an in-memory cache for last-known status, and runs per-MCP connection tests independently so one slow MCP never blocks others.

## Technical Context

**Language/Version**: Node.js 22, TypeScript 5.x (moduleResolution nodenext)

**Primary Dependencies**:
- Backend: Fastify + chokidar + zod (native fetch for SSE polling)
- Frontend: React 19 + TanStack React Query + Vite
- Test: Vitest + supertest + @testing-library/react

**Storage**: .mcp.json (filesystem — no schema changes). In-memory `Map<string, CachedStatus>` for connection status.

**Testing**: Vitest (unit + integration), supertest for API

**Target Platform**: Linux Docker container (existing docker-compose setup)

**Project Type**: Web application (backend API + React SPA)

**Performance Goals**:
- Listing with 10 MCPs loads in < 1s (SC-001)
- New MCP card appears in < 1s after create/edit (SC-002)
- Single timing-out MCP delays no other MCP by > 100ms (SC-004)
- All 10 MCPs background-tested in < 30s total, results streamed incrementally (SC-005)

**Constraints**:
- No new npm dependencies — reuses native fetch, existing Fastify SSE
- No .mcp.json schema changes — cache is in-memory only
- In-memory cache is acceptable for single-user Docker deployment
- All dev commands via docker-compose (Dev Workflow 6)
- Lint before every commit (Dev Workflow 8)
- Docs updated in same commit (Dev Workflow 9)
- All user-facing text in English (Constitution III)

**Discovered Architecture**:
- `GET /api/mcps` currently calls `testConnection` for every MCP sequentially, then `queryTools` for each connected MCP
- The SSE endpoint (`GET /api/mcps/events`) already polls every 30s but also tests all MCPs in sequence
- `POST /api/mcps/test-connection` already supports per-MCP testing with `name` parameter
- Frontend fetches full listing via `fetchMCPs()` and re-fetches on every config change

**Performance Bottleneck**: Sequential connection tests in `GET /api/mcps` — each MCP can take up to 5s (timeout), so 5 slow MCPs = 25s before any card renders.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Assessment | Status |
|-----------|-----------|--------|
| I. SDD | New cache schema needed for `CachedStatus` entity; endpoint contracts updated for split listing/status | ✅ Pass |
| II. Test-First | All new services need tests before implementation | ✅ Pass |
| III. English UI | Status labels ("connected", "testing...") already in English | ✅ Pass |
| IV. .mcp.json Truth | .mcp.json unchanged — cache is in-memory, not persisted | ✅ Pass |
| V. Simplicity | Reuses existing SSE endpoint; no new transport mechanism | ✅ Pass |
| VI. Icon Library | No new icons needed | ✅ Pass |
| Dev Workflow 7 | Cache TTL env var needed (`MCP_CACHE_TTL`) | ✅ Pass |
| Dev Workflow 8 | Lint before commit | ✅ Pass |
| Dev Workflow 9 | Docs updated in same commit | ✅ Pass |

**No violations found.**

## Project Structure

### Documentation (this feature)

```text
specs/006-mcp-listing-performance/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── api.md            # Updated API contracts
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── api/
│   │   ├── mcp.routes.ts        # CHANGED: split listing, status SSE
│   │   └── ws.ts                # CHANGED: broadcast status updates
│   ├── services/
│   │   └── mcp-client.ts        # CHANGED: testConnection per-MCP, auth handling
│   └── config/
│       └── types.ts             # NEW: CachedStatus type, StatusUpdate type
├── tests/
│   ├── unit/
│   │   └── mcp-client.test.ts   # CHANGED: tests for cache service
│   └── integration/
│       └── performance.test.ts  # NEW: integration tests for listing speed

frontend/
├── src/
│   ├── services/
│   │   └── api.ts              # CHANGED: SSE status events handler
│   └── components/
│       └── CardGrid.tsx        # CHANGED: status updates from stream
```

**Structure Decision**: Web application structure (Option 2) as established by the project.

## Complexity Tracking

> No constitution violations to justify. Section remains empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
