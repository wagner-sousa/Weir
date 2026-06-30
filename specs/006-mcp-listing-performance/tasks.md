# Tasks: MCP Listing Performance

**Input**: Design documents from `/specs/006-mcp-listing-performance/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Included per Constitution II (Test-First). Tasks follow TDD order.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/`, `frontend/src/` as established by existing project
- All paths relative to repository root

---

## Phase 1: Setup

**Purpose**: No new project initialization needed — infrastructure inherited from 004-005.

No tasks in this phase.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: StatusCache service that blocks all user stories. Must be complete before any story begins.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Tests (TDD — write first, verify they fail)

- [X] T001 [P] Add unit tests for `StatusCache` in `backend/tests/unit/status-cache.test.ts` (cover: get/set/delete, TTL expiry, stale status detection, concurrent access)

### Implementation

- [X] T002 [P] Create `StatusCache` class in `backend/src/services/status-cache.ts` — in-memory `Map<string, CachedStatus>` with configurable TTL (default 60s via `MCP_CACHE_TTL` env var), methods: `get(name)`, `set(name, status, error, toolCount, needsAuth, authUrl)`, `delete(name)`, `getAll()`
- [X] T003 [P] Add `CachedStatus` and `StatusUpdate` types to `backend/src/config/types.ts`

**Checkpoint**: StatusCache ready — all user stories can use it.

---

## Phase 3: User Story 1 — Fast Listing After Create (Priority: P1) 🎯 MVP

**Goal**: After creating/editing/deleting an MCP, the listing updates in under 1 second by only testing the affected MCP.

**Independent Test**: Configure 5+ MCPs, create a new one, measure time until the new card appears.

### Tests (TDD — write first, verify they fail)

- [X] T004 [US1] Add integration tests for `GET /api/mcps` returning cached status in `backend/tests/integration/performance.test.ts` (cover: listing returns instantly with cached status, listing does NOT call testConnection, new MCP appears immediately)
- [X] T005 [US1] Add integration tests for config change triggering selective test in `backend/tests/integration/performance.test.ts` (cover: creating MCP only tests that MCP, editing MCP only tests that MCP, deleting MCP triggers no test)
- [X] T006 [US1] Add integration tests for SSE `testing` and `status` events in `backend/tests/integration/performance.test.ts` (cover: `testing` event emitted when test starts, `status` event emitted when test completes, events are per-MCP independent)

### Implementation

- [X] T007 [US1] Split `GET /api/mcps` in `backend/src/api/mcp.routes.ts` — remove all `testConnection` and `queryTools` calls. Return config data with cached status from `StatusCache`. Remove `broadcast` call from this handler (status updates go through SSE).
- [X] T008 [US1] After MCP create/edit/delete operations in `backend/src/api/mcp.routes.ts`, trigger a targeted connection test for ONLY the affected MCP, update its cache entry, and broadcast the result via SSE (reuse existing `broadcast` or SSE handler).
- [X] T009 [US1] Update SSE handler `GET /api/mcps/events` in `backend/src/api/mcp.routes.ts` — test all MCPs concurrently with `Promise.allSettled`, broadcast each individual result as it arrives (not batched in `done` event). Emit `testing` event when each MCP test begins.

**Checkpoint**: User Story 1 complete — listing is fast, new MCP appears immediately.

---

## Phase 4: User Story 2 — Fast Listing After OAuth Authorization (Priority: P1)

**Goal**: After completing OAuth2 authorization, the affected card updates within 1 second without re-testing other MCPs.

**Independent Test**: Complete OAuth2 for one MCP, measure time until card shows authorized status.

### Tests (TDD — write first, verify they fail)

- [X] T010 [US2] Add integration tests for OAuth callback triggering targeted status update in `backend/tests/integration/performance.test.ts` (cover: after callback stores token, only that MCP is tested, listing returns updated status without testing all MCPs)

### Implementation

- [X] T011 [US2] In `GET /api/auth/:name/callback` handler in `backend/src/api/auth.routes.ts`, after storing the token, trigger a connection test for that MCP, update its cache entry, and broadcast the updated status.

**Checkpoint**: User Story 2 complete — OAuth auth updates the card instantly.

---

## Phase 5: User Story 4 — Dashboard Resists Slow MCPs (Priority: P2)

**Goal**: A single timing-out MCP does not delay status display of any other MCP.

**Independent Test**: Configure a timing-out MCP + 3 working MCPs, reload, verify working MCPs show status before the timeout.

### Tests (TDD — write first, verify they fail)

- [X] T012 [US4] Add unit tests for parallel test execution in `backend/tests/unit/mcp-client.test.ts` (cover: `Promise.allSettled` does not reject on individual timeout, results are independent per MCP)

### Implementation

- [X] T013 [US4] In `backend/src/api/mcp.routes.ts` SSE handler, ensure each MCP's test has its own timeout (read from `MCP_CONNECTION_TIMEOUT` env var) and is independent — a timeout on one MCP does not cancel or delay others.

**Checkpoint**: User Story 4 complete — slow MCPs are isolated.

---

## Phase 6: User Story 3 — Page Load Shows Content Instantly (Priority: P2)

**Goal**: Initial page load shows MCP cards immediately with last-known status, background tests update incrementally.

**Independent Test**: Load dashboard with 10 MCPs, verify all card content visible within 1 second, statuses update incrementally.

### Tests (TDD — write first, verify they fail)

- [X] T014 [US3] Add integration tests for initial page load behavior in `backend/tests/integration/performance.test.ts` (cover: GET /api/mcps returns cached status, unknown status shows "unknown", cleared cache returns "unknown" for all)

### Implementation

- [X] T015 [US3] Ensure `GET /api/mcps` returns `"unknown"` status + `null` error for MCPs without cache entries (first load). The frontend shows "testing..." when status is "unknown" and the SSE `testing` event fires.
- [X] T016 [US3] In `frontend/src/services/api.ts`, update the SSE `status` and `testing` event handlers to update individual card status without full re-fetch. Add `StatusEvent` with `status: 'testing'` support.

**Checkpoint**: User Story 3 complete — page loads instantly, statuses update incrementally.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Validation and cleanup.

- [X] T017 Run `quickstart.md` validation scenarios to verify all acceptance criteria pass
- [X] T018 Run lint and typecheck across backend and frontend

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — empty phase
- **Foundational (Phase 2)**: No dependencies — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational (Phase 2)
- **User Story 2 (Phase 4)**: Depends on Foundational (Phase 2) — independent from US1
- **User Story 4 (Phase 5)**: Depends on US1 (SSE handler refactored in T009)
- **User Story 3 (Phase 6)**: Depends on US4 (parallel testing) + US1 (listing split)
- **Polish (Final Phase)**: Depends on US1 + US2

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) — No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) — independent from US1
- **User Story 4 (P2)**: Depends on US1 — SSE handler must be refactored first
- **User Story 3 (P2)**: Depends on US1 + US4 — needs split listing + parallel tests

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Models before services
- Services before endpoints

### Parallel Opportunities

- T001, T002, T003: all Phase 2 tasks can run in parallel (different files)
- Phase 3 (US1) and Phase 4 (US2) can run in parallel after Phase 2
- T004, T005, T006: US1 tests can run in parallel
- T012 and T013: US4 tests and implementation can run together

---

## Parallel Example

```bash
# Phase 2 — Backend in parallel:
Task: "Create StatusCache service"
Task: "Add CachedStatus types"

# Phase 3 + 4 — US1 and US2 in parallel:
Task: "Split GET /api/mcps and add selective testing (US1)"
Task: "Update OAuth callback to trigger targeted test (US2)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 2: Foundational (StatusCache)
2. Complete Phase 3: User Story 1 (Fast listing + selective testing)
3. **STOP and VALIDATE**: Create 5+ MCPs, verify listing is instant
4. Add Phase 4: User Story 2 (OAuth targeted update)
5. Add Phase 5 + 6: User Stories 4 + 3 (parallel testing + page load)

### Incremental Delivery

1. Phase 2 → Cache ready
2. Phase 3 → Listing instantly after create (MVP!)
3. Phase 4 → Listing instantly after OAuth
4. Phase 5 → Slow MCP isolation
5. Phase 6 → Page load with incremental updates
6. Run lint + typecheck + quickstart

**MVP Scope**: Phase 2 + Phase 3 — StatusCache + fast listing after create.

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- US1 and US2 can be parallelized (different API routes)
- MCP_CACHE_TTL env var must be documented in .env.example and docker-compose files
