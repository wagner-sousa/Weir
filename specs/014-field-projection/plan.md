# Implementation Plan: Field Projection

**Branch**: `014-field-projection` | **Date**: 2026-07-06 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/014-field-projection/spec.md`

## Summary

Inject field projection into the Weir proxy pipeline to reduce MCP tool response payloads. Operators define per-tool include/exclude rules in a separate `field-projection.json` file (never touching `.mcp.json`). The proxy applies projection synchronously inside `sendOneMessage()` before resolving the response — before any future TOON conversion. Core logic is a pure-TypeScript port of MORPH's `applyFieldSelection` with JSONPath normalization.

## Technical Context

**Language/Version**: TypeScript 5.7+ (Node.js 22, ESM)

**Primary Dependencies**: None new — Zod 3.24 (already in project) for config schema; projection logic is pure TS (no suitable npm package exists per research.md — Principle VII exemption documented)

**Storage**: `field-projection.json` on disk, same directory as `.mcp.json` (resolved via `dirname(MCP_CONFIG_PATH)`). No dedicated env var — derives from `MCP_CONFIG_PATH` directory.

**Testing**: Vitest 3 — unit tests in `backend/tests/unit/projection.test.ts`

**Target Platform**: Node.js 22 (backend proxy, both web and proxy modes)

**Project Type**: Library module within web-service backend (`backend/src/projection/`)

**Performance Goals**: <1ms overhead per message; synchronous, no allocations beyond projected result

**Constraints**: No mutation of original response (FR-006); zero overhead for unconfigured tools; JSON-RPC envelope preserved (FR-007)

**Scale/Scope**: Per-message synchronous projection on `tools/call` responses; supports stdio, HTTP, SSE transports

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate |
|-----------|------|
| I. SDD | Schema defined before implementation? YES — FieldProjectionSchema defined in spec FR-009 |
| II. Test-First | Tests written and approved? YES — user stories define test scenarios |
| III. English | UI/UX language verified? N/A — no UI changes |
| IV. .mcp.json SOT | Config derives from schema? **VIOLATION** — see Complexity Tracking |
| V. Simplicity | No unnecessary duplication? YES |
| VI. Icon Library | N/A — no UI |
| VII. Dependency First | npm package preferred over custom code? **N/A** — no suitable package exists per research (none cover include+exclude+arrays); see Complexity Tracking |
| VIII. Icon-First Buttons | N/A |
| IX. Spec Naming Convention | User stories/FRs use generic roles? YES — "MCP backend", "tool", "agent" |

## Project Structure

```
specs/014-field-projection/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── contracts/
    └── project.ts       # Phase 1 output — pure-function contracts

backend/src/
├── projection/
│   ├── project.ts       # IMPL: applyFieldSelection + helpers
│   └── index.ts         # IMPL: load + resolve pipeline integration
├── config/
│   ├── schema.ts        # SPEC FieldProjectionSchema (+)
│   └── types.ts         # SPEC FieldProjection types (+)
└── proxy/
    └── index.ts         # IMPL: injection in sendOneMessage (+)

backend/tests/
└── unit/
    └── projection.test.ts  # SPEC: projection unit tests
```

**Structure Decision**: Single module `backend/src/projection/` — no external deps, pure functions. Config schema/types added to existing `backend/src/config/`. Pipeline injection is a small addition to `backend/src/proxy/index.ts`.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| IV. .mcp.json SOT — separate config file | `.mcp.json` follows the standard Claude/MCP format; adding Weir-specific keys would break compatibility with upstream tools and confuse operators. Field projection is an orthogonal concern (response transformation) that doesn't belong in connection config. | Inline fieldSelection in `.mcp.json` key rejected because it pollutes the standard MCP format, breaks schema compatibility with Claude Desktop and other MCP hosts, and violates separation of concerns. |
| VII. Dependency First — no suitable package exists | All npm packages evaluated (jsonpath-rfc9535, deep-pick-omit, jsonpath-object-transform, jsonpath-plus) lack include+exclude+array traversal+object reconstruction in one package. See research.md §6. | Combining packages still needs custom code for array traversal and object reconstruction — more complex than 80-line pure TS implementation. |
