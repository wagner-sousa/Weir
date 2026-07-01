# Tasks: Fix Tools Counter

**Input**: Design documents from `/specs/007-fix-tools-counter/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Included per Constitution II (Test-First).

**Organization**: Tasks are grouped by user story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/`, `frontend/src/` as established by existing project
- All paths relative to repository root

---

## Phase 1: Setup

**Purpose**: No new project initialization needed.

No tasks in this phase.

---

## Phase 2: Foundational

**Purpose**: Most of the tool count fix was already implemented in 006. Minor remaining edge cases.

### Tests (TDD — write first, verify they fail)

- [X] T001 [P] Add integration tests for toolCount in SSE events in `backend/tests/integration/performance.test.ts` (cover: SSE status event includes toolCount, toolCount is not null, toolCount persists across SSE cycles)

### Implementation

- [X] T002 [P] Verify and ensure `GET /api/mcps` returns `toolCount` from cache (already done in 006 — verify in `backend/src/api/mcp.routes.ts`)
- [X] T003 [P] Verify and ensure SSE handler sends `toolCount` from `testSingleMCP` result (already done in 006 — verify in `backend/src/api/mcp.routes.ts`)
- [X] T004 [P] Verify and ensure `broadcastStatusUpdate` passes `status.toolCount` (already done in 006 — verify in `backend/src/api/mcp.routes.ts`)

**Checkpoint**: Tool count fix verified.

---

## Phase 3: User Story 1 + 2 — Tool Count Display + SSE (Priority: P1)

**Goal**: Tool count shows actual tools on the card and survives SSE cycles.

**Independent Test**: Add an MCP with tools, verify card shows correct count, wait for SSE cycle, verify count unchanged.

### Tests (TDD — write first, verify they fail)

- [X] T005 [US1] Add integration test for toolCount on card after create in `backend/tests/integration/performance.test.ts` (cover: after POST /api/mcps, listing returns cached toolCount > 0)
- [X] T006 [US2] Add integration test for toolCount surviving SSE cycle in `backend/tests/integration/performance.test.ts` (cover: set cached status with toolCount, simulate SSE, verify toolCount unchanged)

### Implementation

- [X] T007 [US1] In `frontend/src/components/MCPCard.tsx`, differentiate "0 tools" (server reported 0) from "unknown" (not yet tested). When `toolCount === 0` and `status === 'unknown'`, show "?" instead of "0".
- [X] T008 [US1] In `frontend/src/components/MCPCard.tsx`, ensure toolCount displays correctly when `status === 'error'` but `toolCount > 0` (e.g., needsAuth with tools).

**Checkpoint**: Tool count displays correctly in all states.

---

## Phase 4: User Story 3 — Tool Count After Reconnect (Priority: P2)

**Goal**: After reconnection, the card shows the correct tool count.

**Independent Test**: Disconnect an MCP, reconnect, verify tool count appears.

- [X] T009 [US3] Verify reconnect flow: `handleReconnect` in `CardGrid.tsx` calls `testMutation` which calls `POST /api/mcps/test-connection`. After success, the card should show tool count. This is already handled by the SSE cycle — verify end-to-end.

**Checkpoint**: Reconnect updates tool count.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Validation and cleanup.

- [X] T010 Run `quickstart.md` validation scenarios
- [X] T011 Run lint and typecheck across backend and frontend

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: No dependencies
- **User Story 1+2 (Phase 3)**: Depends on Phase 2
- **User Story 3 (Phase 4)**: Depends on Phase 3
- **Polish (Phase 5)**: Depends on all

### Parallel Opportunities

- T001, T002, T003, T004: all Phase 2 tasks can run in parallel

---

## Implementation Strategy

### MVP

1. Phase 2: Verify existing 006 fixes are correct
2. Phase 3: Fix frontend display edge cases
3. Phase 4: Verify reconnect flow
4. Run lint + typecheck

---

## Notes

- The core fix was already implemented in 006 (`testSingleMCP` queries tools, SSE sends `status.toolCount`)
- This spec primarily adds tests and fixes frontend display edge cases
- "?" vs "0" differentiation in MCPCard.tsx is the main remaining fix
