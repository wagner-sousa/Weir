---

description: "Task list for MCP Connection Manager feature"
---

# Tasks: MCP Connection Manager

**Input**: Design documents from `/specs/002-mcp-connection-manager/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/api.md

**Tests**: Test tasks are included per Constitution II (Test-First — write tests before implementation).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/`, `frontend/src/` at repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Environment variable configuration for this feature

- [ ] T001 Add `MCP_CONNECTION_TIMEOUT` (default `5000`) and `MCP_ADD_TIMEOUT` (default `30000`, CI override `5000`) to `.env.example` and wire in `docker-compose.dev.yml` and `docker-compose.yml`
- [ ] T002 Create `.env` entries for `MCP_CONNECTION_TIMEOUT` and `MCP_ADD_TIMEOUT` (local dev) and document in `README.md`

**Checkpoint**: Env var ready for timeout configuration

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Backend services that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Tests for Foundational Phase ⚠️

- [ ] T003 [P] Unit test for writer.ts — `writeMCPConfig`, `addMCPEntry`, `removeMCPEntry` in `backend/tests/unit/writer.test.ts`
- [ ] T004 [P] Unit test for mcp-client.ts — `testConnection` (stdio + http/sse), `queryTools` in `backend/tests/unit/mcp-client.test.ts`

### Implementation for Foundational Phase

- [ ] T005 [P] Create `backend/src/config/writer.ts` with `addMCPEntry(config, name, entry)`, `removeMCPEntry(config, name)`, `writeMCPConfig(filePath, config)` — handle file read/write, pretty-print, error handling for permission errors
- [ ] T006 [P] Create `backend/src/services/mcp-client.ts` with `testConnection(transport, timeout)` — stdio: spawn `which` check + exec test (pass `transport.env` as environment variables to spawned process); http/sse: HTTP GET/OPTIONS with 5s configurable timeout; return `{ success, error? }`
- [ ] T007 Extend `backend/src/services/mcp-client.ts` with `queryTools(transport, timeout)` — MCP `initialize` + `tools/list` JSON-RPC handshake, return `{ tools: ToolInfo[], count: number }`
- [ ] T008 [P] Add Zod schema for test-connection request/response in `backend/src/config/schema.ts` (reuse existing transport schema)

**Checkpoint**: Foundation ready - writer and MCP client services operational

---

## Phase 3: User Story 1 - Add a New MCP via Modal (Priority: P1) 🎯 MVP

**Goal**: User can open a modal, select transport type, fill dynamic fields, test connection, and save a new MCP to .mcp.json

**Independent Test**: Open dashboard, click "Add MCP", fill form with stdio transport (command: `echo`, args: `["hello"]`), test connection, save, verify card appears in grid and .mcp.json contains the new entry

### Tests for User Story 1 ⚠️

- [ ] T009 [P] [US1] Integration test for `POST /api/mcps/test-connection` in `backend/tests/integration/mcp-api.test.ts`
- [ ] T010 [P] [US1] Integration test for `POST /api/mcps` (add MCP) in `backend/tests/integration/mcp-api.test.ts`

### Implementation for User Story 1

- [ ] T011 [P] [US1] Add `POST /api/mcps/test-connection` route in `backend/src/api/mcp.routes.ts` — accepts flat/nested transport, calls `testConnection()`, returns `{ success, error? }`
- [ ] T012 [P] [US1] Add `POST /api/mcps` route in `backend/src/api/mcp.routes.ts` — accepts name + transport, validates uniqueness via `writer.ts`, calls `addMCPEntry()`, writes file, returns `{ success, name }` or `503` if backend is unreachable
- [ ] T013 [US1] Create `frontend/src/components/AddMCPModal.tsx` — modal with transport type selector (stdio/http/sse), dynamic fields (command+args+env for stdio, url for http/sse), env section with table (name + value columns) and "Add variable" button that opens two fields, "Test Connection" button with spinner/disabled state, "Save" button with spinner/disabled state, inline name uniqueness validation, error display for test/save failures
- [ ] T014 [US1] Extend `frontend/src/services/api.ts` with `testConnection(transport)`, `addMCP(name, transport)` functions
- [ ] T015 [US1] Extend `frontend/src/hooks/useMCPs.ts` with `useAddMCP` mutation (invalidates query on success, shows toast via callback)
- [ ] T016 [US1] Add "Add MCP" button to `frontend/src/components/CardGrid.tsx` at top right, wire to open AddMCPModal
- [ ] T017 [US1] Add toast notification system for add success (auto-dismiss 3s, stackable, clickable to dismiss) in `frontend/src/components/Toast.tsx`

**Checkpoint**: User can add MCPs via modal with connection test — MVP functional

---

## Phase 4: User Story 2 - View Connection Status and Reconnect (Priority: P1)

**Goal**: Each MCP card shows connection status icon (green/red) with tooltip on failure, and a Reconnect button

**Independent Test**: Add an MCP with invalid command, verify red icon + tooltip with error reason; click Reconnect, verify status updates

### Tests for User Story 2 ⚠️

- [ ] T018 [P] [US2] Integration test for `GET /api/mcps` extended response (status + toolCount fields) in `backend/tests/integration/mcp-api.test.ts`

### Implementation for User Story 2

- [ ] T019 [P] [US2] Extend `GET /api/mcps` route in `backend/src/api/mcp.routes.ts` — for each MCP, attempt connection via `mcp-client.ts`, return `status`, `error`, `toolCount` alongside existing transport data
- [ ] T020 [P] [US2] Add `GET /api/mcps/:name/tools` route in `backend/src/api/mcp.routes.ts` — calls `queryTools()`, returns `{ tools, count }` or `503` on connection failure
- [ ] T021 [US2] Update `frontend/src/components/MCPCard.tsx` — add connection status icon at top right (green checkmark / red X, amber/yellow spinner for "connecting", muted/gray for "disconnected"), tooltip on hover for failure reason, "Reconnect" button in footer that re-triggers connection and updates status, tool count badge shows "?" when disconnected, all icons have `aria-label` for screen readers
- [ ] T022 [US2] Extend `frontend/src/services/api.ts` with `getMCPTools(name)` function
- [ ] T023 [US2] Extend `frontend/src/hooks/useMCPs.ts` with SSE subscription (`EventSource`) for real-time status updates from `GET /api/mcps/events`

**Checkpoint**: User can see connection status per MCP and reconnect on failure

---

## Phase 5: User Story 3 - View Tool Count and Remove MCP (Priority: P2)

**Goal**: Each MCP card footer shows tool count badge, and a Remove button that deletes the MCP from .mcp.json

**Independent Test**: Add a valid MCP, verify tool count badge appears in footer; click Remove, verify card disappears and .mcp.json no longer has the entry

### Tests for User Story 3 ⚠️

- [ ] T024 [P] [US3] Integration test for `DELETE /api/mcps/:name` in `backend/tests/integration/mcp-api.test.ts`

### Implementation for User Story 3

- [ ] T025 [P] [US3] Add `DELETE /api/mcps/:name` route in `backend/src/api/mcp.routes.ts` — calls `removeMCPEntry()`, writes file, returns `{ success }`, `404` if not found, or `503` if backend is unreachable
- [ ] T026 [US3] Update `frontend/src/components/MCPCard.tsx` — add tool count badge in footer (fetched via `queryTools`), add "Remove" button that calls delete API, removes card, shows success toast
- [ ] T027 [US3] Extend `frontend/src/services/api.ts` with `removeMCP(name)` function
- [ ] T028 [US3] Extend `frontend/src/hooks/useMCPs.ts` with `useRemoveMCP` mutation (invalidates query, shows toast)
- [ ] T029 [US3] Handle empty state in `frontend/src/components/CardGrid.tsx` — when last MCP removed, show EmptyState component

**Checkpoint**: User can see tool counts and remove MCPs

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T030 [P] Add toast on duplicate name error (FR-020) — frontend handles 409 from POST /api/mcps
- [ ] T031 [P] Lint and typecheck all new/modified files — `docker compose exec backend npx eslint src tests && docker compose exec backend npx tsc --noEmit` in backend/, `docker compose exec frontend npx eslint src && docker compose exec frontend npx tsc --noEmit` in frontend/
- [ ] T032 [P] Verify toasts display in pt-BR per Constitution III
- [ ] T033 [P] Update `specs/002-mcp-connection-manager/quickstart.md` with validation scenarios
- [ ] T034 [P] Update `docs/architecture.md` and `docs/development.md` with new components and endpoints
- [ ] T035 Run quickstart.md validation — all scenarios pass
- [ ] T036 [P] Add `GET /api/mcps/events` SSE endpoint in `backend/src/api/mcp.routes.ts` — pushes `status` events with `{ name, status, toolCount, error }` payload
- [ ] T037 [P] Add `beforeunload` warning in `frontend/src/components/AddMCPModal.tsx` — warns user if connection test is in progress during page close/refresh

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - US1 (P1) → US2 (P1) can start after or in parallel with US1
  - US3 (P2) can start after Foundational — independent of US1/US2
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational — No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational — US1's modal/card structure helps but not blocking
- **User Story 3 (P2)**: Can start after Foundational — Independent of US1/US2
- US1 and US2 can be developed in parallel (different frontend components, different backend routes)

### Within Each Phase

- Tests MUST be written and FAIL before implementation (Constitution II)
- Backend routes before frontend integration
- Services/api layer before components
- Story complete before moving to next priority

### Parallel Opportunities

- T003, T004 (test files) can run in parallel
- T005, T006 (writer + client services) can run in parallel
- T009, T010, T011, T012 (US1 backend routes + tests) can run together
- US1 frontend (T013-T017) can run after backend routes are settled
- US2 backend (T018-T020) can run in parallel with US1 frontend
- US3 backend (T024, T025) can run independently

---

## Parallel Example: User Story 1

```bash
# Launch US1 backend tasks together:
Task: "Add POST /api/mcps/test-connection route"
Task: "Add POST /api/mcps route"

# Launch US1 frontend tasks together (after backend routes):
Task: "Create AddMCPModal component"
Task: "Extend api.ts with testConnection/addMCP"
Task: "Extend useMCPs.ts with useAddMCP mutation"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T002)
2. Complete Phase 2: Foundational (T003-T008)
3. Complete Phase 3: User Story 1 (T009-T017)
4. **STOP and VALIDATE**: Add an MCP via modal — test connection, save, verify card
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (modal + add endpoint)
   - Developer B: User Story 2 (status + reconnect)
   - Developer C: User Story 3 (remove + tools)
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing (Constitution II)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- All toast messages and modal labels must be in pt-BR (Constitution III)
- .env.example must be updated with new env var (Dev Workflow 7)
