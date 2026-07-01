# Tasks: MCP Card Status Enhancement

**Input**: Design documents from `/specs/012-mcp-card-status/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Tests are included (TDD — see Constitution Principle II).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- `frontend/src/components/` — React components
- `frontend/tests/components/` — Component tests

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify environment and dependencies are ready

- [x] T001 Verify frontend dev environment works: `docker compose -f docker-compose.dev.yml run --rm setup`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Add transport badge variants to Badge component — required by User Story 3

- [x] T002 [P] Add `http`, `stdio`, `sse` variants to `variantClasses` in `frontend/src/components/Badge.tsx` (blue-800/blue-200 for http, purple-800/purple-200 for stdio, cyan-800/cyan-200 for sse)
- [x] T003 [P] Update Badge tests if they exist or add test for new variants in `frontend/tests/components/Badge.test.tsx`

**Checkpoint**: Foundation ready — Badge component supports the three transport-specific color variants

---

## Phase 3: User Story 1 - View MCP connection status with clear indicators (Priority: P1) 🎯 MVP

**Goal**: Users see three distinct status icons (success/needs-auth/error) with tooltips

**Independent Test**: Open MCP listing page; each MCP card shows one of `CircleCheck` (green), `ShieldAlert` (amber), or `CircleX` (red). Hover over each shows a tooltip with the status label.

### Tests for User Story 1 ⚠️

- [x] T004 [P] [US1] Write test verifying needsAuth status renders ShieldAlert icon with amber color in `frontend/tests/components/MCPCard.test.tsx`
- [x] T005 [P] [US1] Write test verifying needsAuth status icon tooltip shows "Authentication required" in `frontend/tests/components/MCPCard.test.tsx`
- [x] T006 [US1] Run tests — expect T004 and T005 to FAIL (red phase)

### Implementation for User Story 1

- [x] T006.1 [P] [US1] Add `'needsAuth'` to `MCPClient.status` union type in `frontend/src/services/api.ts`
- [x] T006.2 [P] [US1] Add `'needsAuth'` to `StatusEvent.status` union type in `frontend/src/services/api.ts`
- [x] T007 [US1] Add `needsAuth` entry to `statusIcons` map in `frontend/src/components/MCPCard.tsx`: icon `ShieldAlert`, color `text-amber-500`, label `'Authentication required'`
- [x] T008 [US1] Run tests — expect T004 and T005 to PASS (green phase)

**Checkpoint**: MCP cards show `needsAuth` status icon with amber ShieldAlert and tooltip on hover

---

## Phase 4: User Story 2 - See error details on hover (Priority: P2)

**Goal**: Error details appear only on hover via tooltip, removed from card body

**Independent Test**: Find an MCP in error state; verify no red error text appears on the card body; hover over the error icon to see the error message in the tooltip.

### Tests for User Story 2 ⚠️

- [x] T009 [P] [US2] Write test verifying error-status card has no inline error text element (`client.error` not rendered as visible text) in `frontend/tests/components/MCPCard.test.tsx`
- [x] T010 [P] [US2] Write test verifying error icon tooltip includes `client.error` message in `frontend/tests/components/MCPCard.test.tsx`
- [x] T011 [US2] Run tests — expect T009 and T010 to FAIL (red phase)

### Implementation for User Story 2

- [x] T012 [US2] Remove the conditional error row (`{client.error && ...}`) from the card body in `frontend/src/components/MCPCard.tsx` (lines 81-85)
- [x] T013 [US2] Update the status icon `title` attribute logic in `frontend/src/components/MCPCard.tsx` (line 53) to always include `client.error` in the tooltip when status is `'error'`
- [x] T014 [US2] Run tests — expect T009 and T010 to PASS (green phase)

**Checkpoint**: Error information is only visible on hover via the status icon tooltip

---

## Phase 5: User Story 3 - Identify connection type by badge color (Priority: P2)

**Goal**: Each transport type badge displays a distinct, non-system color

**Independent Test**: View MCP cards with different transport types; HTTP badge is blue, STDIO badge is purple, SSE badge is cyan. All three colors are distinct from system UI colors (green/red/amber/gray).

### Tests for User Story 3 ⚠️

- [x] T015 [P] [US3] Write test verifying HTTP transport badge uses `http` Badge variant in `frontend/tests/components/MCPCard.test.tsx`
- [x] T016 [P] [US3] Write test verifying STDIO transport badge uses `stdio` Badge variant in `frontend/tests/components/MCPCard.test.tsx`
- [x] T017 [P] [US3] Write test verifying SSE transport badge uses `sse` Badge variant in `frontend/tests/components/MCPCard.test.tsx`
- [x] T018 [US3] Run tests — expect T015, T016, T017 to FAIL (red phase)

### Implementation for User Story 3

- [x] T019 [US3] Update `transportVariant` map in `frontend/src/components/MCPCard.tsx`: `http` → `'http'`, `stdio` → `'stdio'`, `sse` → `'sse'`
- [x] T020 [US3] Run tests — expect T015, T016, T017 to PASS (green phase)

**Checkpoint**: All three transport types show distinct colored badges

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final quality and verification

- [x] T021 [P] Run all tests to ensure no regressions: `docker compose -f docker-compose.dev.yml exec dev sh -c "cd /app/frontend && npm test -- --run"`
- [x] T022 [P] Add test verifying FR-008: transport badge color classes do not overlap with status icon color classes in `frontend/tests/components/MCPCard.test.tsx`
- [x] T023 Run quickstart.md validation scenarios manually
- [ ] T024 [P] [US2] Add test for unknown/undefined transport type falling back to 'outline' badge variant in MCPCard.test.tsx
- [ ] T025 [P] [US2] Add test for long error messages (>200 chars) being truncated in tooltip display

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: No dependencies on user stories
- **US1 (Phase 3)**: No dependencies — can start after Setup
- **US2 (Phase 4)**: No dependencies — independent of US1 and US3
- **US3 (Phase 5)**: Depends on Foundational (Phase 2) badge variants
- **Polish (Phase 6)**: Depends on all user stories

### User Story Dependencies

- **US1 (P1)**: Independent — can be implemented and tested alone
- **US2 (P2)**: Independent — MCPCard tooltip changes don't conflict with US1 icon changes
- **US3 (P2)**: Needs Badge.tsx variants from Phase 2

### Parallel Opportunities

- T004, T005 can run in parallel
- T006.1, T006.2 can run in parallel
- T009, T010 can run in parallel
- T015, T016, T017 can run in parallel
- T002, T003 can run in parallel
- T022 can run in parallel with T021
- US1 and US2 could be implemented in parallel (different concerns in same file — merge carefully)

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Implementation changes are single-file edits (MCPCard.tsx) — no complex ordering

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup (verify env)
2. Phase 3: User Story 1 (types + needsAuth status icon) 🎯
3. **STOP and VALIDATE**: Test US1 independently
4. Deploy/demo if ready

### Incremental Delivery

1. Setup → Foundation (badge variants)
2. Add US1 (types + needsAuth icon) → Test → MVP!
3. Add US2 (error in tooltip) → Test independently
4. Add US3 (transport colors) → Test independently
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

- Developer A: US1 (types + needsAuth icon) — T004–T008
- Developer B: US2 (error in tooltip) — T009–T014
- Developer C: Phase 2 + US3 (badge variants + transport colors) — T002, T003, T015–T020

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Verify tests fail before implementing (red phase)
- Commit after each logical group
- All changes are in existing files — no new files created beyond spec artifacts
