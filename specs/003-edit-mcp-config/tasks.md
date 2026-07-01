# Tasks: Edit MCP Config

**Input**: Design documents from `/specs/003-edit-mcp-config/`

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

**Purpose**: No new project initialization needed — all infrastructure inherited from 002-mcp-connection-manager.

No tasks in this phase.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Backend writer and API endpoint that the frontend edit modal depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Tests (TDD — write first, verify they fail)

- [X] T001 [P] Add unit tests for `updateEntry` in `backend/tests/unit/writer.test.ts` (cover: update name unchanged, update with rename, update nonexistent, update with duplicate target name, update preserves other entries)
- [X] T002 [P] Add integration tests for `PUT /api/mcps/:name` in `backend/tests/integration/mcp-api.test.ts` (cover: success name unchanged, success rename, 404 not found, 409 duplicate name, 400 validation error, 403 permission error)

### Implementation

- [X] T003 [P] Add `updateEntry(originalName, name, entry)` function to `backend/src/config/writer.ts` that handles rename (delete old key + write new key atomically) and preserves other entries
- [X] T004 Implement `PUT /api/mcps/:name` route in `backend/src/api/mcp.routes.ts` — parse original name from `:name` param, validate body with existing Zod schema, call `updateEntry`, broadcast `config:changed`, return 200/404/409/400/403/503 per contract

**Checkpoint**: Backend ready — writer supports update, PUT endpoint deployed and tested.

---

## Phase 3: User Story 1 — Edit MCP via Modal (Priority: P1) 🎯 MVP

**Goal**: Users can open a pre-populated edit modal from an MCP card, modify fields, optionally test connection, and save changes to .mcp.json.

**Independent Test**: Open edit modal for an existing MCP, change the command, save, and verify the card and .mcp.json reflect the new value.

### Tests (TDD — write first, verify they fail)

- [X] T005 [P] [US1] Write unit tests for `updateMCP` API function in `frontend/src/services/api.ts` (mock fetch, verify PUT call with correct body)
- [X] T006 [P] [US1] Write unit tests for `useUpdateMCP` mutation hook in `frontend/src/hooks/useMCPs.ts` (verify mutation calls api.updateMCP and invalidates query on success)

### Implementation

- [X] T007 [P] [US1] Add `updateMCP(originalName, name, transport)` function to `frontend/src/services/api.ts` that calls `PUT /api/mcps/:originalName`
- [X] T008 [P] [US1] Add `useUpdateMCP()` mutation hook to `frontend/src/hooks/useMCPs.ts` that calls `updateMCP` and invalidates `['mcps']` query on success
- [X] T009 [P] [US1] Add Edit button (Pencil icon from lucide-react) to `frontend/src/components/MCPCard.tsx` at the bottom right next to Remove, with `onEdit` callback and `aria-label="Edit MCP"`
- [X] T010 [US1] Extend `AddMCPModal` (`frontend/src/components/AddMCPModal.tsx`) to accept optional `existingMCP` prop and edit mode:
  - Pre-populate all fields from `existingMCP` data
  - Change title to "Edit MCP" when editing
  - On save: call `useUpdateMCP` (PUT) instead of `useAddMCP` (POST)
  - Name uniqueness excludes the MCP being edited
  - Show transport-type-change confirmation dialog
  - Reset connection status on name/transport change
- [X] T011 [US1] Wire the Edit flow in `frontend/src/components/CardGrid.tsx`: pass `onEdit` prop to `MCPCard`, open `AddMCPModal` in edit mode when triggered

**Checkpoint**: User Story 1 complete — users can edit any MCP via the UI. Card updates, .mcp.json updated, toasts shown.

---

## Phase 4: Polish & Cross-Cutting Concerns

**Purpose**: Documentation updates and validation.

- [X] T012 Run `quickstart.md` validation scenarios to verify all acceptance criteria pass
- [X] T013 Run lint and typecheck across backend and frontend

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — empty phase (all infra exists)
- **Foundational (Phase 2)**: No dependencies — can start immediately — BLOCKS all user stories
- **User Stories (Phase 3: US1)**: Depends on Foundational (Phase 2) completion
- **Polish (Final Phase)**: Depends on US1 completion

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) — No dependencies on other stories
- **User Story 2 (P2)**: No implementation tasks — behavior is inherited from AddMCPModal's existing dirty-form detection. Verify manually.
- **User Story 3 (P2)**: No implementation tasks — spinner/disabled behavior is inherited from AddMCPModal's existing mutation patterns. Verify manually.

### Within Each User Story

- Tests (T005, T006) MUST be written and FAIL before implementation (T007–T012)
- API function before mutation hook
- Mutation hook before component integration
- Component integration before card wiring

### Parallel Opportunities

- T001 and T002: writer unit tests and API integration tests can run in parallel (different files)
- T003 and T004: writer implementation and API route — T003 must complete before T004
- T005 and T006: API function tests and hook tests can run in parallel
- T007, T008, T009: API function, mutation hook, and Edit button can run in parallel (no cross-dependencies)
- T010 depends on T007 + T008 (needs `updateMCP` and `useUpdateMCP`)
- T011 depends on T009 + T010 (needs Edit button + modal edit mode)
- T012 depends on T011 (needs edit flow working for validation)

---

## Parallel Example: User Story 1

```bash
# Phase 2 - Backend tests in parallel:
Task: "Add updateEntry unit tests in backend/tests/unit/writer.test.ts"
Task: "Add PUT endpoint integration tests in backend/tests/integration/mcp-api.test.ts"

# Phase 2 - Backend implementation in parallel:
Task: "Add updateEntry function in backend/src/config/writer.ts"
Task: "Implement PUT route in backend/src/api/mcp.routes.ts"

# Phase 3 - Frontend independent tasks in parallel:
Task: "Add updateMCP function in frontend/src/services/api.ts"
Task: "Add useUpdateMCP hook in frontend/src/hooks/useMCPs.ts"
Task: "Add Edit button to MCPCard.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 2: Foundational (backend writer + PUT endpoint)
2. Complete Phase 3: User Story 1 (frontend edit modal)
3. **STOP and VALIDATE**: Test edit flow independently
4. Run quickstart.md validation

### Incremental Delivery

1. Complete Foundational → Backend ready for PUT operations
2. Add User Story 1 → Users can edit MCPs via UI (MVP!)
3. US2 and US3 are validation-only (no new code) — verify they work
4. Run lint + typecheck + quickstart

**MVP Scope**: User Story 1 only — edit MCP via modal with pre-populated fields, save to .mcp.json, name validation, transport type change with confirmation.

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story (US1 only — US2 and US3 have no implementation tasks)
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- All user-facing text (toasts, labels, buttons) in English per Constitution III
- All icons from lucide-react per Constitution VI (Pencil for edit button)

---

## Phase 5: Convergence

**Purpose**: Close gaps between spec/plan/tasks and implementation.

- [x] T014 Fix error message and modal behavior for externally deleted MCP per FR-006 (`partial`) — change 404 message in `backend/src/api/mcp.routes.ts` to `"MCP not found. It may have been removed."`; close modal via `onClose()` in `frontend/src/components/AddMCPModal.tsx` after error toast on 404
- [x] T015 Add intermediate "disconnected" status on name/transport change per FR-002 (`partial`) — after save in `backend/src/api/mcp.routes.ts`, if name or transport changed, broadcast status `disconnected` before testing connection
- [x] T016 Add dirty-form detection with discard confirmation dialog per US2/AC1-AC2 (`missing`) — track form dirtiness in `frontend/src/components/AddMCPModal.tsx`; show confirmation `"Unsaved changes will be lost. Continue?"` on Cancel / Esc; second Esc dismisses confirmation (modal stays open)
- [x] T017 Add 403 response for file permission errors per contracts/api.md (`missing`) — detect `EACCES`/`EPERM` in `backend/src/config/writer.ts`; return 403 with `"File could not be written: permission denied."` in `backend/src/api/mcp.routes.ts`
- [x] T018 Refactor PUT route to use `updateEntry()` from writer.ts (`partial`) — make `updateEntry()` in `backend/src/config/writer.ts` support field merging (preserve non-transport fields like `fieldSelection`); call it from `backend/src/api/mcp.routes.ts` instead of duplicating inline logic
- [x] T019 Add integration tests for 403 and 503 error paths per contracts/api.md (`missing`) — add tests in `backend/tests/integration/mcp-api.test.ts` covering permission-error (403) and write-error (503) responses for PUT
