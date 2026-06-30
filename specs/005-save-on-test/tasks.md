# Tasks: Save on Test

**Input**: Design documents from `/specs/005-save-on-test/`

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

**Purpose**: No new project initialization needed — all infrastructure inherited from 004-oauth2-mcp-auth. No setup tasks.

No tasks in this phase.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: No blocking prerequisites — all endpoints exist, the modal component exists. US1 and US2 are purely frontend logic changes to the same file.

No tasks in this phase.

---

## Phase 3: User Story 1 — Test Then Auto-Save (Priority: P1) 🎯 MVP

**Goal**: When user clicks "Test Connection" with a success (or `needsAuth: true`) result, the MCP is automatically saved and the modal closes. On non-auth error, the MCP is NOT saved.

**Independent Test**: Fill valid stdio config, click "Test Connection", confirm modal closes and card appears on dashboard.

### Tests (TDD — write first, verify they fail)

- [X] T001 [US1] Write unit tests for auto-save on test success in `frontend/tests/components/AddMCPModal.test.tsx` (cover: success triggers save + modal close, needsAuth triggers save + modal close, error does NOT save)

### Implementation

- [X] T002 [US1] Modify `handleTest` in `frontend/src/components/AddMCPModal.tsx` to accept an `autoSave` parameter (default true). On test success or `needsAuth`, call the save flow and close modal. On non-auth error, keep modal open.
- [X] T003 [US1] Modify `handleSave` in `frontend/src/components/AddMCPModal.tsx` to close modal after successful save, showing a success toast.

**Checkpoint**: User Story 1 complete — Test auto-saves on success/needsAuth, modal closes.

---

## Phase 4: User Story 2 — Save Triggers Auto-Test (Priority: P1)

**Goal**: When user clicks "Save" without testing first, the system runs the connection test automatically. On success/needsAuth, saves and closes. For HTTP MCPs with OAuth2 and clientId, opens auth popup automatically. On error, shows error and does NOT save.

**Independent Test**: Fill valid HTTP config that returns needsAuth, click "Save" directly (no test first), confirm OAuth2 popup opens automatically.

### Tests (TDD — write first, verify they fail)

- [X] T004 [P] [US2] Write unit tests for auto-test on save in `frontend/tests/components/AddMCPModal.test.tsx` (cover: auto-test runs when no prior test, auto-test skips when prior test exists, auto-test on needsAuth opens OAuth2 popup, auto-test on error shows error + does not save, button text changes to "Testing...")
- [X] T005 [P] [US2] Write unit tests for OAuth2 popup trigger after save in `frontend/tests/components/AddMCPModal.test.tsx` (cover: popup opens when needsAuth + clientId, warning toast when needsAuth + no clientId, no popup on success without needsAuth)

### Implementation

- [X] T006 [US2] Modify `handleSave` in `frontend/src/components/AddMCPModal.tsx` to detect whether a test was already run (check `testResult` non-null). If no prior test, call `handleTest` with `autoSave: false` first, then proceed with save logic on success/needsAuth.
- [X] T007 [US2] After auto-test on save with `needsAuth: true`, add logic to open OAuth2 popup automatically (call `POST /api/auth/:name/start`, open `window.open`). If `clientId` is missing, show warning toast instead.
- [X] T008 [US2] Update button states in `frontend/src/components/AddMCPModal.tsx`: during auto-test, change Save button text to "Testing..." and disable both Save and Test Connection buttons.

**Checkpoint**: User Story 2 complete — Save triggers auto-test, OAuth2 popup opens automatically when applicable.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Validation and cleanup.

- [X] T009 Run `quickstart.md` validation scenarios to verify all acceptance criteria pass
- [X] T010 [P] Add timeout handling in `frontend/src/components/AddMCPModal.tsx` — if auto-test times out, show "Connection timed out." error and do NOT save (covers SC-004)
- [X] T011 [P] Add English message verification to `frontend/tests/components/AddMCPModal.test.tsx` — verify all toasts, errors, and button labels are in English (covers FR-010)
- [X] T012 [P] Add manual test scenario to `quickstart.md` verifying click-count reduction: add MCP in exactly 2 clicks (fill + test) instead of 3 (fill + test + save) (covers SC-001)
- [X] T013 Run lint and typecheck across frontend

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — empty phase
- **Foundational (Phase 2)**: No dependencies — empty phase
- **User Story 1 (Phase 3)**: Can start immediately — no blocking prerequisites
- **User Story 2 (Phase 4)**: Depends on User Story 1 completion (both modify `AddMCPModal.tsx`)
- **Polish (Final Phase)**: Depends on all user stories completion

### User Story Dependencies

- **User Story 1 (P1)**: Can start immediately — no dependencies on other stories
- **User Story 2 (P1)**: Depends on US1 — both modify `AddMCPModal.tsx`, must be done sequentially

### Within Each User Story

- Tests (T001, T004, T005) MUST be written and FAIL before implementation
- Core logic before UI integration

### Parallel Opportunities

- T004 and T005: both are test files in the same test suite — can be written in parallel
- No other parallel opportunities within a single-file change

---

## Parallel Example

```bash
# Phase 4 — Tests in parallel:
Task: "Write unit tests for auto-test on save"
Task: "Write unit tests for OAuth2 popup trigger after save"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 3: User Story 1 (Test auto-saves on success)
2. **STOP and VALIDATE**: Test with real UI — Test Connection auto-saves and closes modal
3. Add Phase 4: User Story 2 (Save triggers auto-test + OAuth2 popup)

### Incremental Delivery

1. Add User Story 1 → Test + Auto-Save works (MVP!)
2. Add User Story 2 → Save triggers Auto-Test + OAuth2 popup
3. Run lint + typecheck + quickstart

**MVP Scope**: User Story 1 — Test Connection auto-saves and closes modal on success.

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Both stories modify the same file (`AddMCPModal.tsx`) — must be done sequentially
- All user-facing text in English per Constitution III
