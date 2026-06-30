# Implementation Plan: Fix Zeroed Counters for Serena and Postman

**Branch**: `fix-zeroed-counters` | **Date**: 2026-06-30 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/011-fix-zeroed-counters/spec.md`

## Summary

Postman (OAuth HTTP) and Serena (local HTTP) MCPs show zero tool counts due to two distinct root causes: (1) Postman's `testConnection` returns 401 (`needsAuth`), causing `queryTools` to be skipped entirely; even after OAuth, the callback hardcodes `toolCount: 0`. (2) Serena at `host.docker.internal:9121` may be unreachable from inside the Docker container on Linux. MORPH doesn't have this problem because it's a separate proxy that manages tools independently. Fix involves reordering the OAuth callback to query tools before broadcasting status, and improving error reporting for unreachable local MCPs.

## Technical Context

**Language/Version**: Node.js 22 (ESM), TypeScript 5.7+

**Primary Dependencies**: Existing Weir stack — Fastify 5, Zod 3.24; no new dependencies expected

**Storage**: In-memory status cache (60s TTL) in `CachedStatus` — extend `toolCount` handling, no schema changes

**Testing**: Vitest 3 (`tests/unit/` + `tests/integration/`), Docker Compose dev stack

**Target Platform**: Linux (Docker container), both browser (frontend) and CLI

**Project Type**: Web application (backend API + frontend dashboard) — fix touches both layers

**Performance Goals**: Tool count must display within 5 seconds of OAuth completion; no regression in dashboard load time

**Constraints**:
- Backward-compatible: existing MCPs without auth must continue working
- No new environment variables: reuse the existing `MCP_CACHE_TTL` (default 60s)
- The frontend display logic (`MCPCard.tsx`) already handles "?", "0", and numeric counts — fix only needs backend propagation
- MORPH is NOT part of Weir and must not be changed

**Scale/Scope**: ~5 backend functions modified, ~1 frontend component unchanged (display logic already correct)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Assessment |
|-----------|------------|
| I. Schema-Driven Development (SDD) | ✅ No new schemas needed — `CachedStatus` and `StatusUpdate` types already include `toolCount` |
| II. Test-First (NON-NEGOTIABLE) | ✅ Unit tests for OAuth callback tool query, integration tests for Serena reachability |
| III. English for User-Facing Messages | ✅ Error messages and tooltips in English |
| IV. .mcp.json as Source of Truth | ✅ No config changes — MCPs already defined in `.mcp.json` |
| V. Simplicity and Unified Gateway | ✅ Fix is minimal: reorder operations in existing code paths |
| VI. Consistent Icon Library | ✅ N/A — backend-only change (tooltip on frontend uses existing pattern) |
| VII. Dependency First | ✅ No new dependencies needed — fixes use existing `queryTools` and `testConnection` |
| VIII. Icon-First Buttons (Non-Form) | ✅ N/A — no new UI controls |

**Status**: PASS — all principles satisfied without violations.

## Project Structure

### Documentation (this feature)

```text
specs/011-fix-zeroed-counters/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (interface contracts)
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Created by /speckit.tasks
```

### Source Code (repository root)

```text
backend/src/
├── api/
│   ├── mcp.routes.ts     # ALTERADO: testSingleMCP — ensure queryTools runs after OAuth
│   └── auth.routes.ts    # ALTERADO: OAuth callback — query tools before broadcast
├── services/
│   ├── mcp-client.ts     # REVISADO: ensure queryTools/queryStdioTools handle auth tokens
│   └── status-cache.ts   # INALTERADO: already correct

backend/tests/
├── unit/
│   ├── auth.routes.test.ts       # NOVO: OAuth callback tool count propagation
│   └── mcp.routes.test.ts        # NOVO: testSingleMCP tool query tests
└── integration/
    └── real-config.test.ts       # ALTERADO: Serena reachability tests

frontend/src/
├── components/MCPCard.tsx        # INALTERADO: display logic already correct
└── hooks/useMCPs.ts              # INALTERADO: merge logic already correct
```

**Structure Decision**: Follows existing Weir backend pattern. All changes are in-place modifications to existing files — no new modules needed.

## Env Vars

No new environment variables. Existing `MCP_CACHE_TTL` (default 60000) controls cache expiry.

## Complexity Tracking

> **No violations — all principles satisfied.**
