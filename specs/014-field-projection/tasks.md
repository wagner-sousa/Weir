# Tasks: Field Projection

**Input**: Design documents from `/specs/014-field-projection/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: Tests are included for US1 (Projection) — 11 test cases per the spec, written TDD-style before implementation.

**Organization**: Tasks grouped by user story — each story is independently implementable and testable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create directory structure for the field projection module.

**⚠️ Completion before any other phase**

- [ ] T001 Create `backend/src/projection/` directory and stub module files (`project.ts`, `index.ts`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema definitions, types, and normalization function — all user stories depend on these.

- [ ] T002 [P] Define `FieldSelectionSchema` and `FieldProjectionConfig` Zod schemas in `backend/src/config/schema.ts`
- [ ] T003 [P] Add `FieldSelection`, `FieldProjectionConfig`, `ProjectionMap` type exports in `backend/src/config/types.ts`
- [ ] T004 Implement `normalizeJsonPath(path: string): string` in `backend/src/projection/project.ts` — strips `$.` and `$[*].` prefixes; normalizes bracket index `items[0]` → `items.0` for dot-splitting; validates balanced brackets; rejects empty/bare `$`/bare `$[*]` paths

**Checkpoint**: Foundation ready — user story implementation can begin.

---

## Phase 3: User Story 1 — Projection Applied in Pipeline (Priority: P1) 🎯 MVP

**Goal**: Core projection logic (include/exclude) on parsed JSON values, without any Weir integration. Pure TypeScript functions.

**Independent Test**: Can test in isolation via `npx vitest run backend/tests/unit/projection.test.ts` without any running services. All 11 test cases must pass.

### Tests for User Story 1 (TDD — write first, ensure FAIL before implementation) ⚠️

- [ ] T005 [P] [US1] Write include-mode tests in `backend/tests/unit/projection.test.ts`: keeps top-level fields, nested paths, traverses arrays, keeps subtree when parent selected, omits non-existent paths
- [ ] T006 [P] [US1] Write exclude-mode tests in `backend/tests/unit/projection.test.ts`: removes top-level fields, nested paths, array element fields, non-existent paths are no-op, does not mutate input
- [ ] T007 [P] [US1] Write edge-case tests in `backend/tests/unit/projection.test.ts`: empty fields returns input unchanged

### Implementation for User Story 1

- [ ] T008 [US1] Implement `applyFieldSelection(input, sel)`, `includeNode(node, paths)`, and `removePath(node, segments)` in `backend/src/projection/project.ts` — applies normalization, short-circuits on empty fields, include builds new object, exclude clones + deletes in-place; uses `moduleResolution nodenext` (`.js` extensions on imports)

**Checkpoint**: US1 is independently testable — `npx vitest run backend/tests/unit/projection.test.ts` passes all 11 tests.

---

## Phase 4: User Story 2 — Config Loading & Proxy Integration (Priority: P2)

**Goal**: Load `field-projection.json` from the same directory as `.mcp.json`, validate against Zod schema, apply projection in `sendOneMessage` before resolving the response.

**Independent Test**: Create a `field-projection.json` and `.mcp.json` with a stdio MCP backend, send a `tools/call` request via `POST /mcp/:name`, verify projected response. Also test with no config file (proxy starts normally).

**Note**: Config is stored in a **separate** `field-projection.json` file alongside `.mcp.json`, never in `.mcp.json` itself (per spec clarification: "Em arquivo separado, nunca no .mcp.json").

### Implementation for User Story 2

- [ ] T009 [US2] Implement `loadFieldProjections(configDir: string)` in `backend/src/projection/index.ts` — reads `field-projection.json` from `dirname(MCP_CONFIG_PATH)`, validates against `FieldProjectionConfig` schema; returns `ProjectionMap | null` if file missing, throws on validation error with pino.warn logging
- [ ] T010 [US2] Wire `loadFieldProjections` into proxy startup — call in `backend/src/proxy/index.ts` at module level using `dirname(resolveMcpConfigPath())`, store `ProjectionMap` in module-level variable so `sendOneMessage` closure can access it
- [ ] T011 [US2] Integrate projection into `sendOneMessage` in `backend/src/proxy/index.ts` — inside the `transport.onMessage` callback, after receiving response but before `resolve(msg)`: check `msg.result` exists and method is `tools/call`, look up `toolName` from `message.params?.name` (fallback to `message.method` for non-standard methods), apply `applyFieldSelection` if configured
- [ ] T012 [US2] Add pino logging and error handling — `pino.info` when projection is applied, `pino.warn` on projection error with `try/catch` to fall back to original result; log at `pino.info` when `field-projection.json` is loaded

**Checkpoint**: US2 complete — proxy applies field projection to configured tools; unconfigured tools pass through unchanged; missing `field-projection.json` is a silent no-op.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Quality checks, type safety, lint pass.

- [ ] T013 [P] Run typecheck via docker-compose: `docker compose -f docker-compose.dev.yml exec dev npx tsc --noEmit` — fix any type errors across all modified files
- [ ] T014 Run full test suite via docker-compose: `docker compose -f docker-compose.dev.yml exec dev sh -c "cd /app/backend && npx vitest run"` — ensure all tests pass including `projection.test.ts`
- [ ] T015 [P] Run lint via docker-compose: `docker compose -f docker-compose.dev.yml exec dev npx eslint backend/src/` — fix any lint issues

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all user stories
- **US1 Projection (Phase 3)**: Depends on Phase 2 — no dependencies on other stories
- **US2 Config & Integration (Phase 4)**: Depends on Phase 2 + Phase 3 (US1 projection functions needed for integration in proxy)
- **Polish (Phase 5)**: Depends on Phase 3 and Phase 4

### User Story Dependencies

- **US1 (P1)**: Can start after Foundational — fully independent, projection is pure functions with no Weir integration
- **US2 (P2)**: Depends on US1 (uses `applyFieldSelection`) + Foundational (uses schema/types/`normalizeJsonPath`)

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Implementation after tests pass
- Story complete before moving to next priority

### Parallel Opportunities

- T002 and T003: Can run in parallel (different files — `schema.ts` vs `types.ts`)
- T005, T006, T007: Can run in parallel (all write to same file but distinct test blocks — use separate `describe` blocks)
- T013, T015: Can run in parallel (typecheck vs lint)
- Within US2: T009 is independent (config loader), T010 depends on T009, T011 depends on T009+T010 (uses ProjectionMap), T012 depends on T011

---

## Parallel Example: User Story 1

```bash
# Write tests in parallel:
Task: "T005 Write include-mode tests"
Task: "T006 Write exclude-mode tests"
Task: "T007 Write edge-case tests"

# After all tests fail as expected, implement:
Task: "T008 Implement applyFieldSelection, includeNode, removePath"
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks everything)
3. Complete Phase 3: US1 (pure projection logic + tests)
4. **STOP and VALIDATE**: Run `npx vitest run backend/tests/unit/projection.test.ts`
5. Deploy/demo if ready — projection logic is independently usable

### Full Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add US1 → Test independently → MVP!
3. Add US2 → Test independently → Full feature
4. Polish → Quality gate

---

## Notes

- All tasks use `moduleResolution nodenext` — imports MUST include `.js` extension
- Zero new external dependencies — projection logic is pure TypeScript (exemption per Principle VII: < 80 lines)
- Config file is `field-projection.json`, NOT in `.mcp.json` (per spec clarification)
- Reference implementation: `/home/desenvolvimento/Documentos/morph/src/projection/project.ts` (82 lines)
- All paths assume project root as working directory

---

## Phase 6: Convergence

- [x] T016 Validate all JSONPath field paths in `loadFieldProjections` at config load time, not deferred to `applyFieldSelection`, per FR-010 and SC-003 (partial — FR-010)
- [x] T017 Write unit tests for `loadFieldProjections` covering: missing file returns null, invalid JSON throws, validation error throws, valid config returns ProjectionMap (missing — test coverage)
- [x] T018 Update `specs/014-field-projection/contracts/project.ts` with actual implementations instead of TODO stubs (partial — documentation)
- [x] T019 Remove or implement `resolveProjection` in `specs/014-field-projection/data-model.md` (function referenced in docs but doesn't exist in code) (partial — documentation)
- [x] T020 Fix `specs/014-field-projection/quickstart.md` log message to match actual code: `'Field projection config loaded'` (partial — documentation)

---

## Phase 7: Convergence (US3 — Auto-Creation)

- [x] T021 Implement `saveFieldProjection(serverName, toolName, selection)` in `backend/src/projection/index.ts` — writes to `field-projection.json`, creates file if missing, merges with existing entries per FR-011 and FR-012 (missing — FR-011, FR-012)
- [x] T022 Implement `removeFieldProjection(serverName, toolName)` in `backend/src/projection/index.ts` — removes projection entry, does NOT create file if it doesn't exist per FR-013 (missing — FR-013)
- [x] T023 Add API endpoint `GET /api/mcps/:name/projections` in `backend/src/api/mcp.routes.ts` — returns current field projections for a specific MCP server (missing — US3)
- [x] T024 Add API endpoint `POST /api/mcps/:name/projections` in `backend/src/api/mcp.routes.ts` — creates/updates field projection for a tool, auto-creates `field-projection.json` if missing per FR-011 (missing — US3/AC1)
- [x] T025 Add API endpoint `DELETE /api/mcps/:name/projections/:toolName` in `backend/src/api/mcp.routes.ts` — removes field projection for a tool per FR-013 (missing — US3/AC3)
- [x] T026 Write tests for auto-creation behavior in `backend/tests/unit/projection.test.ts` — verify file is created when missing, existing entries are preserved, file is not created on read operations per US3/AC1-3 (missing — US3)
- [x] T027 Write integration tests for projection API endpoints in `backend/tests/integration/projection-api.test.ts` — verify POST creates file, GET returns projections, DELETE removes entries, merge behavior per US3 (missing — US3)

---

## Phase 8: Convergence

- [x] T028 Resolve `jsonpath-rfc9535` dependency contradiction: either replace with pure-TS validation to match plan's "zero new external dependencies" mandate, OR update plan.md / contracts to acknowledge the external dep (plan.md: dependency decision — contradicts)
- [x] T029 Compile and start the application via docker-compose for manual testing per Constitution Dev Workflow Rule 10 (Constitution Rule 10 — missing)
