# Implementation Plan: Fix Tools Counter

**Branch**: `007-fix-tools-counter` | **Date**: 2026-06-23 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-fix-tools-counter/spec.md`

## Summary

The tool count on MCP cards always shows 0 (or "?") because `queryTools` was never called in the listing endpoint — and after the 006 refactor, the cache stores `toolCount: 0` by default. This feature ensures `queryTools` is called during the background SSE test cycle and the result is cached, and that the SSE `status` event preserves the tool count.

## Technical Context

**Language/Version**: Node.js 22, TypeScript 5.x (moduleResolution nodenext)

**Primary Dependencies**:
- Backend: Fastify + zod + chokidar
- Frontend: React 19 + TanStack React Query + Vite + lucide-react
- Test: Vitest + @testing-library/react

**Storage**: StatusCache (in-memory) + .mcp.json (config only)

**Testing**: Vitest (unit + integration), supertest for API

**Target Platform**: Linux Docker container (existing docker-compose setup)

**Project Type**: Web application (backend API + React SPA)

**Performance Goals**: Tool count query must not increase listing time — already async via SSE (from 006).

**Constraints**:
- No new npm dependencies
- No .mcp.json schema changes
- All dev commands via docker-compose
- Lint before every commit (Dev Workflow 8)
- Docs updated in same commit (Dev Workflow 9)
- All user-facing text in English (Constitution III)

**Current Root Cause**:
- `GET /api/mcps` (after 006 refactor) returns `toolCount` from `StatusCache`, which is `0` for uncached MCPs.
- `testSingleMCP` in `mcp.routes.ts` DOES call `queryTools` and stores `toolCount` in the cache — but this only runs when an MCP is created/edited or during the SSE cycle.
- The SSE handler's `status` event does NOT include `toolCount` — it sets `toolCount: null`.
- The frontend's `handleStatusEvent` does `toolCount: statusEvent.toolCount ?? client.toolCount`, but the SSE event sends `toolCount: null`, which overwrites the cached count with `null` → display shows "?".

**Fix**:
1. Include `toolCount` in SSE `status` events (read from cache after test).
2. Fix SSE handler to send toolCount from `testSingleMCP` result.
3. Verify frontend correctly displays toolCount from SSE updates.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Assessment | Status |
|-----------|-----------|--------|
| I. SDD | No schema changes needed | ✅ Pass |
| II. Test-First | Tests needed for toolCount in SSE events | ✅ Pass |
| III. English UI | No new messages needed | ✅ Pass |
| IV. .mcp.json Truth | No changes to .mcp.json | ✅ Pass |
| V. Simplicity | Small fix — reuse existing testSingleMCP | ✅ Pass |
| VI. Icon Library | No new icons | ✅ Pass |
| Dev Workflow 7 | No new env vars | ✅ Pass |
| Dev Workflow 8 | Lint before commit | ✅ Pass |
| Dev Workflow 9 | Docs updated in same commit | ✅ Pass |

**No violations found.**

## Project Structure

### Documentation (this feature)

```text
specs/007-fix-tools-counter/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── api.md            # API contract notes
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
backend/
├── src/
│   └── api/
│       └── mcp.routes.ts     # CHANGED: SSE handler includes toolCount
└── tests/
    └── integration/
        └── performance.test.ts  # CHANGED: tests for toolCount in SSE

frontend/
├── src/
│   ├── services/
│   │   └── api.ts              # No changes needed
│   └── components/
│       └── MCPCard.tsx         # No changes needed
```

**Structure Decision**: Web application — only backend SSE handler changes.

## Complexity Tracking

> No constitution violations to justify. Section remains empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
