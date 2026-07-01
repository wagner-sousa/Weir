# Implementation Plan: MCP Card Status Enhancement

**Branch**: `012-mcp-card-status` | **Date**: 2026-07-01 | **Spec**: specs/012-mcp-card-status/spec.md

**Input**: Feature specification from `/specs/012-mcp-card-status/spec.md`

## Summary

Add a `needsAuth` status icon (ShieldAlert + warning color) to MCP cards, move error details from the card body to the status icon tooltip, and assign distinct non-system colors to transport-type badges (http, stdio, sse).

## Technical Context

**Language/Version**: TypeScript 5.7+, React 19

**Primary Dependencies**: lucide-react (icons), Tailwind CSS 4 (styling)

**Storage**: N/A — UI-only change; status and transport data are passed via props from the existing API

**Testing**: Vitest 3 + @testing-library/react (unit); integration tests in CardGrid

**Target Platform**: Web (modern browsers)

**Project Type**: Frontend React application (single-page app)

**Performance Goals**: Tooltip renders within 300ms of hover (CSS tooltip with `group-hover:opacity-100` satisfies this; no new dependencies needed)

**Constraints**: No new npm dependencies unless justified (Dependency First principle); all icons from lucide-react (Principle VI)

**Scale/Scope**: ~4 MCP status states, 3 transport types, 1 card component, 1 badge component

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|-----------|------|--------|
| I. SDD | Schema defined before implementation? | ✅ PASS — no new schemas needed; UI-only change consuming existing types |
| II. Test-First | Tests written and approved? | ⏳ PENDING — tests will be written in Phase 2 |
| III. English | UI/UX language verified? | ✅ PASS — all tooltips and labels in English per existing convention |
| IV. .mcp.json SOT | Config derives from schema? | ✅ PASS — no config changes; status/transport come from existing API |
| V. Simplicity | No unnecessary duplication? | ✅ PASS — extends existing statusIcons map and transportVariant map |
| VI. Icon Library | Icons from consistent package? | ✅ PASS — ShieldAlert already in use from lucide-react |
| VII. Dependency First | npm package preferred over custom code? | ✅ PASS — native HTML `title` attribute used for tooltips; no new library needed |
| VIII. Icon-First Buttons | Non-form controls prioritise icons? | ✅ PASS — no new buttons introduced |
| IX. Spec Naming Convention | User stories/FRs use generic roles, not real service names? | ✅ PASS — spec uses "auth-gated HTTP MCP", "local HTTP MCP", "stdio MCP" patterns |

## Project Structure

### Documentation (this feature)

```text
specs/012-mcp-card-status/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── components/
│   │   ├── MCPCard.tsx       # Status icons, transport badge, tooltips
│   │   └── Badge.tsx         # Badge variant colors for transport types
│   └── services/
│       └── api.ts            # MCPClient interface (transport, status types)
└── tests/
    └── components/
        └── MCPCard.test.tsx  # Card unit tests
```

**Structure Decision**: Single frontend project. All changes are in existing files. No new files beyond spec artifacts.

## Complexity Tracking

No Constitution violations — all principles satisfied.
