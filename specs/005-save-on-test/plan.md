# Implementation Plan: Save on Test

**Branch**: `005-save-on-test` | **Date**: 2026-06-23 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-save-on-test/spec.md`

## Summary

When users add or edit an MCP in the modal, clicking "Test Connection" should auto-save the MCP on success (or needsAuth). Clicking "Save" without testing first should auto-trigger a connection test. For HTTP MCPs requiring OAuth2 with a configured clientId, the authorization popup opens automatically after save.

## Technical Context

**Language/Version**: Node.js 22, TypeScript 5.x (moduleResolution nodenext)

**Primary Dependencies**:
- Backend: Fastify + zod + chokidar (no new npm deps — reuses existing endpoints)
- Frontend: React 19 + TanStack React Query + Vite + lucide-react
- Test: Vitest + @testing-library/react

**Storage**: .mcp.json (filesystem JSON — no data model changes needed)

**Testing**: Vitest (unit + integration), supertest for API, @testing-library/react for frontend

**Target Platform**: Linux Docker container (existing docker-compose setup)

**Project Type**: Web application (backend API + React SPA) — same structure as 004-oauth2-mcp-auth

**Performance Goals**:
- Auto-test completes within existing MCP_CONNECTION_TIMEOUT (default 5s)
- Modal response to "Test Connection" / "Save" clicks < 100ms (before test starts)

**Constraints**:
- No new backend endpoints — only frontend modal logic changes (FR-001 through FR-010)
- All dev commands via docker-compose (Dev Workflow 6)
- Lint before every commit (Dev Workflow 8)
- Docs updated in same commit (Dev Workflow 9)
- All user-facing text in English (Constitution III, FR-010)
- All icons from lucide-react (Constitution VI)
- No new npm dependencies — reuses existing API calls
- The .mcp.json schema remains unchanged (Out of Scope)

**Scale/Scope**: Single-user dashboard, file-based config, one MCP at a time

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Assessment | Status |
|-----------|-----------|--------|
| I. SDD | No schema changes needed — .mcp.json unchanged. Existing schemas cover the feature. | ✅ Pass |
| II. Test-First | All new frontend logic needs tests before implementation | ✅ Pass |
| III. English UI | All toasts, errors, button labels specified in English (FR-010) | ✅ Pass |
| IV. .mcp.json Truth | Feature reuses existing .mcp.json save flow — no parallel config | ✅ Pass |
| V. Simplicity | Pure frontend changes; reuses existing testConnection API and modal | ✅ Pass |
| VI. Icon Library | No new icons needed (reuses existing shield icon from 004) | ✅ Pass |
| Dev Workflow 7 | No new env vars needed | ✅ Pass |
| Dev Workflow 8 | Lint before commit | ✅ Pass |
| Dev Workflow 9 | Docs updated in same commit | ✅ Pass |

**No violations found.**

## Project Structure

### Documentation (this feature)

```text
specs/005-save-on-test/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── api.md            # API contract references (no new endpoints)
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── components/
│   │   └── AddMCPModal.tsx     # CHANGED: auto-save on test, auto-test on save, OAuth2 popup
│   └── hooks/
│       └── useMCPs.ts          # No changes needed
└── tests/
    └── components/
        └── AddMCPModal.test.tsx # NEW: tests for auto-save/auto-test behavior
```

**Structure Decision**: Web application structure (Option 2) as established by the existing project. Only the frontend AddMCPModal component changes — no backend modifications needed.

## Complexity Tracking

> No constitution violations to justify. Section remains empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
