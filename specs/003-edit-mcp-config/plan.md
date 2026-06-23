# Implementation Plan: Edit MCP Config

**Branch**: `003-edit-mcp-config` | **Date**: 2026-06-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-edit-mcp-config/spec.md`

## Summary

Allow users to edit existing MCP configurations directly from the Weir dashboard
via a pre-populated modal. The edit modal reuses the "Add MCP" form pattern but
with pre-filled fields, transport-type-change confirmation, name-uniqueness
validation (excluding self), and a `PUT /api/mcps/:name` backend endpoint that
updates the entry in .mcp.json (handling key renames). Connection status resets
to "disconnected" if name or transport type changes. All UX patterns (toasts,
validation, beforeunload, lucide-react icons) follow the established conventions
from the Connection Manager feature.

## Technical Context

**Language/Version**: Node.js 22, TypeScript 5.x (moduleResolution nodenext)

**Primary Dependencies**:
- Backend: Fastify + chokidar + zod (SSE via native Fastify reply.raw)
- Frontend: React 18 + TanStack React Query + Vite
- Test: Vitest + supertest

**Storage**: .mcp.json (filesystem JSON, read/write via existing loader + writer)

**Testing**: Vitest (unit + integration), supertest for API

**Target Platform**: Linux Docker container (existing docker-compose setup)

**Project Type**: Web application (backend API + React SPA)

**Performance Goals**:
- Edit modal loads with pre-populated values in under 2 seconds (CS-001)
- Changes reflected in .mcp.json and dashboard card within 2 seconds of Save (CS-002)
- Toast notification appears within 1s of edit completing

**Constraints**:
- No parallel config — .mcp.json is the single source of truth (Constitution IV)
- All dev commands via docker-compose (Dev Workflow 6)
- Lint before every commit (Dev Workflow 8)
- Docs updated in same commit (Dev Workflow 9)
- All user-facing text in English (Constitution III)
- All icons from lucide-react (Constitution VI)

**Reuse Pattern**:
- Edit modal is a variant of AddMCPModal — extract shared form into a base
  component or reuse AddMCPModal with an "existing MCP" prop for pre-population
- Backend writer.ts extends `writeMCPConfig` with an `updateEntry` operation
- `PUT /api/mcps/:name` follows the same validation, error response, and
  WebSocket broadcast patterns as POST /api/mcps

**Key Nuance — Name Change**:
- Changing the name means the entry key in .mcp.json changes
- Backend must delete old key + write new key in one atomic operation
- Frontend refetch after save to get updated card list
- SSE status for old name is invalidated; card for new name starts as "disconnected"

**Key Nuance — Transport Type Change**:
- Changing transport type clears type-specific fields (FR-003)
- Confirmation dialog before clearing: "Changing transport type will clear type-specific fields. Continue?"
- Same confirmation flow used in the add modal does not exist — this is specific to edit

**Scale/Scope**: Single-user dashboard, file-based config, local network MCPs

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Assessment | Status |
|-----------|-----------|--------|
| I. SDD | PUT endpoint needs Zod schema for update request (extends existing schema) | ✅ Pass |
| II. Test-First | All new code needs tests before implementation | ✅ Pass |
| III. English UI | All toasts, labels, tooltips must be English (per Constitution III) | ✅ Pass |
| IV. .mcp.json Truth | Update writes directly to .mcp.json — no parallel config | ✅ Pass |
| V. Simplicity | Reuse existing AddMCPModal pattern, no duplication | ✅ Pass |
| VI. Icon Library | Edit icon (Pencil) from lucide-react | ✅ Pass |
| Dev Workflow 7 | No new config env vars needed | ✅ Pass |
| Dev Workflow 8 | Lint before commit | ✅ Pass |
| Dev Workflow 9 | Docs updated in same commit | ✅ Pass |

**No violations found. Complexity Tracking section may remain empty.**

## Project Structure

### Documentation (this feature)

```text
specs/003-edit-mcp-config/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── api.md            # API contracts (PUT endpoint added)
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── api/
│   │   └── mcp.routes.ts       # NEW: PUT /api/mcps/:name endpoint
│   ├── config/
│   │   └── writer.ts           # EXTENDED: add updateEntry(name, data) function
│   └── services/
│       └── mcp-client.ts       # No changes expected
├── tests/
│   ├── unit/
│   │   └── writer.test.ts      # EXTENDED: add updateEntry tests
│   └── integration/
│       └── mcp-api.test.ts     # EXTENDED: add PUT endpoint tests

frontend/
├── src/
   │   ├── components/
   │   │   ├── AddMCPModal.tsx     # REFACTORED: accept optional existing MCP prop
   │   │   └── MCPCard.tsx         # EXTENDED: add Edit button (Pencil icon)
│   ├── services/
│   │   └── api.ts              # EXTENDED: add updateMCP mutation
│   └── hooks/
│       └── useMCPs.ts          # EXTENDED: add useUpdateMCP mutation
```

**Structure Decision**: Web application structure (Option 2) as established by the
existing project. The exact component architecture (dedicated EditMCPModal vs.
AddMCPModal with edit prop) will be resolved in Phase 0 research.

## Complexity Tracking

> No constitution violations to justify. Section remains empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
