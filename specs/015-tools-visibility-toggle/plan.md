# Implementation Plan: Tools Visibility Toggle

**Branch**: `015-tools-visibility-toggle` | **Date**: 2026-07-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/015-tools-visibility-toggle/spec.md`

## Summary

Add per-tool visibility control to the MCP dashboard. Users can enable/disable individual tools from a new Tools Modal, with settings persisted to `tool-visibility.json`. Disabled tools are filtered from the tools API and from MCP port proxy responses.

## Technical Context

**Language/Version**: TypeScript 5.7, Node.js 22 (ESM)

**Primary Dependencies**:
- Backend: Fastify v5, Zod v3, Pino v9
- Frontend: React 19, Vite 6, TanStack React Query v5, Radix UI Dialog, Lucide React, Tailwind CSS v4

**Storage**: JSON file on disk (`tool-visibility.json` in config directory)

**Testing**: Vitest 3 (backend: node environment, frontend: jsdom + Testing Library)

**Target Platform**: Linux (Docker), modern browsers

**Project Type**: Web application (frontend + backend)

**Performance Goals**: <100ms API response for visibility reads, <200ms for writes

**Constraints**: Must not break existing tools API or proxy behavior; must handle corrupted config gracefully

**Scale/Scope**: Single-user dashboard, ~10-50 MCPs, ~5-20 tools per MCP

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate |
|-----------|------|
| I. SDD | Schema defined before implementation? ✅ Zod schema in data-model.md |
| II. Test-First | Tests written and approved? ✅ Will be defined in tasks.md |
| III. English | UI/UX language verified? ✅ All UI text in English |
| IV. .mcp.json SOT | Config derives from schema? ✅ Tool visibility is separate from .mcp.json, follows same pattern as field-projection.json |
| V. Simplicity | No unnecessary duplication? ✅ Single module for visibility logic, reused across API and proxy |
| VI. Icon Library | Icons from consistent package? ✅ Using Lucide React (existing) |
| VII. Dependency First | npm package preferred over custom code? ✅ No new dependencies needed |
| VIII. Icon-First Buttons | Non-form controls prioritise icons? ✅ Wrench icon for tools modal button |
| IX. Spec Naming Convention | User stories/FRs use generic roles? ✅ "user" not specific service names |

## Project Structure

### Documentation (this feature)

```text
specs/015-tools-visibility-toggle/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── api.md
│   └── frontend.md
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── api/
│   │   └── mcp.routes.ts          # Add visibility endpoints + modify tools endpoint
│   ├── config/
│   │   ├── schema.ts               # Add ToolVisibilityConfig Zod schema
│   │   └── types.ts                # Add ToolVisibilityMap type
│   ├── mcp/
│   │   └── mcp.routes.ts           # Add tools/list filtering in SSE sessions
│   ├── proxy/
│   │   └── index.ts                # Add tools/list filtering in sendOneMessage
│   └── tool-visibility/
│       └── index.ts                # NEW: load, save, get, set, bulk operations
└── tests/
    ├── unit/
    │   └── tool-visibility.test.ts  # NEW: unit tests for visibility module
    └── integration/
        └── tool-visibility.routes.test.ts  # NEW: API endpoint tests

frontend/
├── src/
│   ├── components/
│   │   ├── MCPCard.tsx              # Add wrench icon button
│   │   └── ToolsModal.tsx          # NEW: tools visibility modal
│   ├── hooks/
│   │   └── useToolVisibility.ts    # NEW: React Query hook
│   └── services/
│       └── api.ts                  # Add visibility API functions
└── tests/
    └── unit/
        └── ToolsModal.test.tsx     # NEW: component tests
```

**Structure Decision**: Web application (Option 2) — frontend + backend monorepo. New module `tool-visibility/` created under `backend/src/` following the same pattern as existing service modules.

## Complexity Tracking

No constitution violations to justify — all principles pass.
