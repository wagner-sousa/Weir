---

description: "Task list for fixing zeroed tool counters for auth-gated and local HTTP MCPs"

---

# Tasks: Fix Zeroed Counters for Auth-Gated and Local HTTP MCPs

**Input**: Design documents from `specs/011-fix-zeroed-counters/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `backend/src/`, `backend/tests/`
- **Frontend**: `frontend/src/` (no changes expected)
- All commands via `docker compose -f docker-compose.dev.yml`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Understand existing code paths before making changes

- [x] T001 Trace the current OAuth callback flow in `backend/src/api/auth.routes.ts` lines 309-339, identifying where `queryTools` must be inserted before the `setCachedStatus` and `broadcast` calls
- [x] T002 [P] Trace the current `testSingleMCP` function in `backend/src/api/mcp.routes.ts` lines 30-85, understanding the conditional skip of `queryTools` when `connResult.success === false`
- [x] T003 [P] Trace the current `testConnection` error handling in `backend/src/services/mcp-client.ts` lines 48-138 to understand what error details are available for unreachable MCPs

**Checkpoint**: Code paths understood — ready to write tests

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Test infrastructure that enables TDD for both user stories

- [x] T004 [P] Create auth route test helper that imports `buildApp`, mocks `simple-oauth2`, and configures a temporary `.mcp.json` with a test HTTP MCP entry (follow pattern from `backend/tests/integration/auth.test.ts`)
- [x] T005 [P] Create HTTP MCP reachability test helper that mocks `testConnection` to simulate DNS failure vs connection refused vs timeout vs success, following the pattern from `backend/tests/integration/real-config.test.ts`

**Checkpoint**: Foundation ready — user story implementation can now begin

---

## Phase 3: User Story 1 — Auth-Gated HTTP MCP OAuth Tool Count (Priority: P1) 🎯 MVP

**Goal**: After OAuth callback completes, the auth-gated HTTP MCP card displays the actual tool count (not 0) within 5 seconds.

**Independent Test**: Mock OAuth callback, inject a `tools/list` response with N tools, verify cache and broadcast contain toolCount=N.

### Tests for User Story 1 (TDD — write first, ensure FAIL before implementation) ⚠️

- [x] T006 [P] [US1] Write failing unit test: mock `queryTools` to return 5 tools, call the OAuth callback endpoint, assert `setCachedStatus` was called with `toolCount: 5` in `backend/tests/unit/auth.routes.test.ts`
- [x] T007 [P] [US1] Write failing integration test: mock OAuth code exchange, inject `tools/list` response, call `GET /api/mcps`, assert the MCP card shows `toolCount` matching the mock tools list in `backend/tests/integration/auth.test.ts`

### Implementation for User Story 1

- [x] T008 [US1] Refactor `backend/src/api/auth.routes.ts` lines 309-317: move `queryTools(name, ...)` call to before `setCachedStatus` and `broadcast`, using the access token from OAuth exchange; update `setCachedStatus` and `broadcast` to use the actual `toolCount` from `queryTools` result
- [x] T008.5 [P] [US1] Update `backend/src/api/mcp.routes.ts` `testSingleMCP` to call `queryTools` using the stored access token when `connResult.success === true`, ensuring the tool count is queried even when the MCP was previously auth-gated
- [x] T009 [US1] Add retry logic: if `queryTools` in the OAuth callback throws or returns empty, retry once after 2 seconds before falling back to `toolCount: 0` in `backend/src/api/auth.routes.ts`
- [x] T010 [US1] Verify tests T006 and T007 pass: `docker compose -f docker-compose.dev.yml exec dev sh -c "cd /app/backend && npx vitest run backend/tests/unit/auth.routes.test.ts backend/tests/integration/auth.test.ts"`

**Checkpoint**: Auth-gated HTTP MCP OAuth flow now propagates correct tool count

---

## Phase 4: User Story 2 — Local HTTP MCP Reachability (Priority: P1)

**Goal**: Local HTTP MCP card displays correct tool count when reachable, and a clear "unreachable" error (not "0 tools") when not.

**Independent Test**: Mock testConnection to return DNS failure vs connection refused vs success with tools; verify error message differs for each case.

### Tests for User Story 2 (TDD — write first, ensure FAIL before implementation) ⚠️

- [x] T011 [P] [US2] Write failing unit test: mock `testConnection` to return `{ success: false, error: 'connection refused' }`, call `testSingleMCP`, assert cached error message contains "Connection refused" (not generic "Connection failed") in `backend/tests/unit/mcp.routes.test.ts`
- [x] T012 [P] [US2] Write failing integration test: stop a test HTTP server (simulate unreachable), call `GET /api/mcps`, assert the unreachable MCP's `error` field contains a distinguishable message vs a "0 tools" state in `backend/tests/integration/real-config.test.ts`

### Implementation for User Story 2

- [x] T013 [US2] Improve error detail in `backend/src/services/mcp-client.ts` `testConnection` function: parse the `FetchError` cause to distinguish DNS resolution failure ("DNS resolution failed"), connection refused ("Connection refused"), and timeout ("Connection timed out") for HTTP transports
- [x] T014 [US2] Propagate the detailed error message through `backend/src/api/mcp.routes.ts` `testSingleMCP` so the cached status includes the specific error string
- [x] T015 [US2] Verify tests T011 and T012 pass: `docker compose -f docker-compose.dev.yml exec dev sh -c "cd /app/backend && npx vitest run backend/tests/unit/mcp.routes.test.ts backend/tests/integration/real-config.test.ts"`

**Checkpoint**: Local HTTP MCP errors are now distinguishable from zero-tool responses

---

## Phase 5: User Story 3 — MORPH Architectural Difference (Priority: P3)

**Goal**: Developers can produce a written explanation of the architectural difference between Weir and MORPH.

**Independent Test**: Read the documentation and verify it explains why MORPH does not depend on Weir's status cache.

- [x] T016 [US3] Write `specs/011-fix-zeroed-counters/morph-comparison.md` documenting: (1) MORPH architecture overview (gateway proxy between agents and MCPs), (2) why MORPH queries tools per-client-connection (no status cache), (3) the key architectural difference that prevents stale/zeroed counters in MORPH

**Checkpoint**: MORPH comparison documented

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validation and cleanup

- [x] T016.5 [P] Verify FR-005: confirm that periodic SSE polling calls `queryTools` (not just `testConnection`) on cache expiry by tracing the SSE handler in `backend/src/api/mcp.routes.ts` — no code change expected, only validation
- [x] T017 Run the full backend test suite: `docker compose -f docker-compose.dev.yml exec dev sh -c "cd /app/backend && npm test"`
- [x] T018 [P] Run backend typecheck: `docker compose -f docker-compose.dev.yml exec dev sh -c "cd /app/backend && npx tsc --noEmit"`
- [x] T019 [P] Run frontend typecheck: `docker compose -f docker-compose.dev.yml exec dev sh -c "cd /app/frontend && npx tsc --noEmit"`
- [x] T020 Update `AGENTS.md` with any new known pitfalls discovered during implementation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — code reading only
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Stories (Phases 3-5)**: All depend on Foundational completion
  - **US1 (Phase 3)** and **US2 (Phase 4)** are independent — can run in parallel
  - **US3 (Phase 5)** depends on understanding from research but has no code dependencies
- **Polish (Phase 6)**: Depends on all user stories complete

### User Story Dependencies

- **US1 (P1)**: Independent — no dependency on US2
- **US2 (P1)**: Independent — no dependency on US1
- **US3 (P3)**: Independent — documentation only

### Parallel Opportunities

- T001, T002, T003 (Phase 1) — can run in parallel
- T004, T005 (Phase 2) — can run in parallel
- T006, T007 (US1 tests) — can run in parallel
- T011, T012 (US2 tests) — can run in parallel
- US1 (Phase 3) and US2 (Phase 4) — fully parallel independent stories
- T018, T019 (Polish) — can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch both tests for US1 together:
# T006 (unit test)
docker compose -f docker-compose.dev.yml exec dev sh -c "cd /app/backend && npx vitest run backend/tests/unit/auth.routes.test.ts"

# T007 (integration test)
docker compose -f docker-compose.dev.yml exec dev sh -c "cd /app/backend && npx vitest run backend/tests/integration/auth.test.ts"
```

---

## Implementation Strategy

### MVP (User Story 1 Only)

1. Phase 1: Code understanding
2. Phase 2: Test helpers (T004 only)
3. Phase 3: US1 complete (auth-gated HTTP MCP OAuth fix)
4. **STOP and VALIDATE**: Test US1 independently
5. Deploy/demo if auth-gated MCP fix is the priority

### Incremental Delivery

1. Setup + Foundational → ready to develop
2. Add US1 (auth-gated HTTP MCP OAuth) → Test independently → Deploy
3. Add US2 (local HTTP MCP reachability) → Test independently → Deploy
4. Add US3 (MORPH docs) → Review
5. Polish → Final validation

### Parallel Team Strategy

With two developers:

1. Both complete Phase 1 + 2 together
2. Developer A: US1 (Phases 3) — auth-gated HTTP MCP OAuth fix
3. Developer B: US2 (Phase 4) — local HTTP MCP reachability fix
4. Both stories integrate without conflicts (different files)
5. Developer A or B: US3 (Phase 5) — documentation
6. Together: Phase 6 polish

---

## Notes

- [P] tasks = different files, no dependencies
- TDD is NON-NEGOTIABLE per Constitution Principle II — tests MUST be written and FAIL before implementation
- `queryTools` already handles auth tokens (line 282-284 of `mcp-client.ts`) — no token-handling changes needed
- Frontend (`MCPCard.tsx`, `useMCPs.ts`) is correct — no frontend changes required
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently

## Post-T020 Fix: queryTools with accessToken regardless of testConnection result

After T020, user reported counters still zeroed. Investigation revealed:

**Root cause**: Both `testSingleMCP` (`backend/src/api/mcp.routes.ts`) and
`testSingleMCPAndBroadcast` (`backend/src/api/auth.routes.ts`) conditionally
skipped `queryTools` when `connResult.success === false`, even when a valid
access token was available. This meant `queryTools` was never called for
auth-gated MCPs if `testConnection` failed for any reason (e.g., JSON-RPC method
not supported, transient error, token propagation delay).

**Fix**: Changed the condition from `if (connResult.success)` to
`if (connResult.success || accessToken)` in both functions. Now `queryTools`
is always attempted when an access token is available, regardless of the
`testConnection` result. This was applied in `backend/src/api/mcp.routes.ts`
and `backend/src/api/auth.routes.ts`.
