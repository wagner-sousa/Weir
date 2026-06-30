# Implementation Plan: Reconnect OAuth Flow

**Branch**: `008-reconnect-oauth-flow` | **Date**: 2026-06-24 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/008-reconnect-oauth-flow/spec.md`

## Summary

When clicking "Reconnect" on an HTTP MCP card that has `needsAuth: true`, the system should open the OAuth2 authorization popup automatically instead of running a connection test and showing an error. For non-HTTP MCPs or HTTP MCPs without needsAuth, the existing reconnect behavior is unchanged.

## Technical Context

**Language/Version**: Node.js 22, TypeScript 5.x (moduleResolution nodenext)

**Primary Dependencies**:
- Backend: Fastify + zod + chokidar (no changes needed)
- Frontend: React 19 + TanStack React Query + Vite + lucide-react
- Test: Vitest + @testing-library/react

**Storage**: .mcp.json (no changes) — tokens already stored by existing OAuth2 flow

**Testing**: Vitest + @testing-library/react for frontend component tests

**Target Platform**: Linux Docker container (existing docker-compose setup)

**Project Type**: Web application — frontend-only change to CardGrid.tsx

**Performance Goals**: Popup opens within 1 second of clicking Reconnect

**Constraints**:
- No backend changes — reuses existing `POST /api/auth/:name/start` and `handleAuth`
- The `POST /api/mcps/test-connection` result already returns `needsAuth` flag
- The `handleAuth` function in CardGrid.tsx already handles the popup flow
- All dev commands via docker-compose
- Lint before every commit
- Docs updated in same commit
- All user-facing text in English

**Current Flow** (broken):
1. User clicks Reconnect on MCP card with needsAuth
2. `handleReconnect` calls `POST /api/mcps/test-connection`
3. Test returns `{ success: false, needsAuth: true }`
4. Toast shows "Connection failed: HTTP 401"
5. User must manually click shield icon to authorize

**Desired Flow** (fixed):
1. User clicks Reconnect on HTTP MCP card with needsAuth
2. `handleReconnect` detects `client.needsAuth && client.transport === 'http'`
3. Calls `handleAuth(client)` directly → OAuth2 popup opens
4. User authorizes → token stored → card updates to connected

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Assessment | Status |
|-----------|-----------|--------|
| I. SDD | No schema changes needed | ✅ Pass |
| II. Test-First | Tests needed for Reconnect→Auth flow | ✅ Pass |
| III. English UI | Existing messages already in English | ✅ Pass |
| IV. .mcp.json Truth | No changes to .mcp.json | ✅ Pass |
| V. Simplicity | Small frontend-only change | ✅ Pass |
| VI. Icon Library | No new icons | ✅ Pass |
| VII. Dependency First | No new deps | ✅ Pass |
| Dev Workflow 7 | No new env vars | ✅ Pass |
| Dev Workflow 8 | Lint before commit | ✅ Pass |
| Dev Workflow 9 | Docs updated in same commit | ✅ Pass |

**No violations found.**

## Project Structure

### Documentation (this feature)

```text
specs/008-reconnect-oauth-flow/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── api.md            # API contract references (no new endpoints)
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
frontend/
├── src/
│   └── components/
│       └── CardGrid.tsx        # CHANGED: handleReconnect redirects to handleAuth when needsAuth
└── tests/
    └── components/
        └── CardGrid.test.tsx   # CHANGED: tests for auth-on-reconnect
```

**Structure Decision**: Web application — only CardGrid.tsx changes.

## Complexity Tracking

> No constitution violations to justify. Section remains empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
