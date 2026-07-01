# Tasks: Reconnect OAuth Flow

**Input**: Design documents from `/specs/008-reconnect-oauth-flow/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Included per Constitution II (Test-First).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/`, `frontend/src/` as established by existing project
- All paths relative to repository root

---

## Phase 1: Setup

**Purpose**: No new project initialization needed.

No tasks in this phase.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: No blocking prerequisites — all endpoints exist, handleAuth exists.

No tasks in this phase.

---

## Phase 3: User Story 1 — Reconnect Triggers OAuth Popup (Priority: P1) 🎯 MVP

**Goal**: Clicking "Reconnect" on an HTTP MCP with `needsAuth: true` opens the OAuth2 authorization popup instead of running a connection test.

**Independent Test**: Click Reconnect on an HTTP MCP with needsAuth, verify OAuth2 popup opens.

### Tests (TDD — write first, verify they fail)

- [X] T001 [US1] Write unit tests for reconnect-auth in `frontend/tests/components/CardGrid.test.tsx` (cover: HTTP+needsAuth calls handleAuth, non-HTTP runs testConnection, HTTP without needsAuth runs testConnection)

### Implementation

- [X] T002 [US1] Modify `handleReconnect` in `frontend/src/components/CardGrid.tsx` to check `client.needsAuth && client.transport === 'http'`. If true, call `handleAuth(client)` instead of `testConnection`.

**Checkpoint**: User Story 1 complete — Reconnect opens OAuth popup for HTTP MCPs with needsAuth.

---

## Phase 4: User Story 2 — Non-Auth Reconnect Shows Error (Priority: P2)

**Goal**: Non-HTTP MCPs and HTTP without needsAuth use the existing test-connection flow.

**Independent Test**: Reconnect on a stdio MCP, verify only error toast (no popup).

### Tests (TDD — write first, verify they fail)

- [X] T003 [US2] Add tests for non-auth reconnect in `frontend/tests/components/CardGrid.test.tsx` (cover: non-HTTP reconnect shows error toast, HTTP without needsAuth shows error toast)

### Implementation

- [X] T004 [US2] Verify `handleReconnect` already handles non-auth cases via the else branch (falls through to existing testConnection flow). Add explicit early return after `handleAuth` call.

**Checkpoint**: User Story 2 complete — non-auth reconnects show errors as before.

---

## Phase 5: User Story 3 — Reconnect Button State During OAuth (Priority: P2)

**Goal**: Reconnect button shows loading indicator and is disabled during OAuth flow.

**Independent Test**: Click Reconnect on needsAuth MCP, verify button shows spinner.

- [X] T005 [US3] Ensure `handleReconnect` sets `reconnectingName` before calling `handleAuth` and resets it after popup opens or on error (already partially implemented in existing code).

**Checkpoint**: User Story 3 complete — button shows loading state during auth.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validation and cleanup.

- [X] T006 Run `quickstart.md` validation scenarios
- [X] T007 Run lint and typecheck across frontend

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: No dependencies
- **User Story 1 (Phase 3)**: No blocking prerequisites
- **User Story 2 (Phase 4)**: Same file as US1 — sequential
- **User Story 3 (Phase 5)**: Same file as US1 — sequential
- **Polish (Phase 6)**: Depends on all

### Parallel Opportunities

- T001 can run standalone (test file)
- T003 can run standalone (test file)

---

## Implementation Strategy

### MVP

1. Phase 3: US1 — Reconnect triggers OAuth popup (T001-T002)
2. Phase 4: US2 — Non-auth reconnect (T003-T004)
3. Phase 5: US3 — Button states (T005)
4. Run lint + typecheck + quickstart

---

## Notes

- Only `CardGrid.tsx` changes — small frontend-only feature
- See `research.md` for decision logic on when to open popup vs test
- The `handleAuth` function already handles all popup logic — reuse it
