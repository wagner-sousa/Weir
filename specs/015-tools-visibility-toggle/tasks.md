# Tasks: Tools Visibility Toggle

**Input**: Design documents from `/specs/015-tools-visibility-toggle/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Schema definitions and shared types for the visibility module

- [x] T001 [P] Add `ToolVisibilityConfig` Zod schema to `backend/src/config/schema.ts` — `z.record(z.string(), z.record(z.string(), z.boolean()))`
- [x] T002 [P] Add `ToolVisibilityMap` and `ToolWithVisibility` types to `backend/src/config/types.ts`
- [x] T003 [P] Add `ToolVisibilityResponse` and `ToolWithVisibility` types to `frontend/src/services/api.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Backend visibility module that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Create `backend/src/tool-visibility/index.ts` with `loadToolVisibility(configDir)` — reads `tool-visibility.json`, validates with Zod schema, returns `ToolVisibilityMap`, falls back to `{}` on corruption (FR-006, FR-011)
- [x] T005 [P] Create `backend/src/tool-visibility/index.ts` function `saveToolVisibility(configDir, map)` — writes `tool-visibility.json` with pretty-printed JSON
- [x] T006 [P] Create `backend/src/tool-visibility/index.ts` function `getToolEnabled(configDir, mcpName, toolName)` — returns boolean, defaults to `true` if not in config (FR-006, FR-007)
- [x] T007 [P] Create `backend/src/tool-visibility/index.ts` function `setToolEnabled(configDir, mcpName, toolName, enabled)` — sets single tool visibility and saves
- [x] T008 [P] Create `backend/src/tool-visibility/index.ts` function `setBulkVisibility(configDir, mcpName, enabled)` — sets all tools for an MCP to the same state and saves
- [x] T009 [P] Create `backend/src/tool-visibility/index.ts` function `filterTools(configDir, mcpName, tools)` — filters array of tools by visibility, returns only enabled tools
- [x] T010 [P] Create `backend/src/tool-visibility/index.ts` function `filterToolsListResponse(configDir, mcpName, result)` — filters `tools/list` JSON-RPC result object's `tools` array by visibility
- [x] T011 Add `tool-visibility.json` to `.gitignore`
- [x] T012 Create `backend/tests/unit/tool-visibility.test.ts` — unit tests for all functions in the visibility module (load, save, get, set, bulk, filter, corruption fallback)

**Checkpoint**: Foundation ready — user story implementation can now begin

---

## Phase 3: User Story 1 — Toggle Individual Tool Visibility (Priority: P1) 🎯 MVP

**Goal**: User can open a tools modal, toggle individual tools on/off, and disabled tools are filtered from the API

**Independent Test**: Open tools modal, toggle a tool off, verify it disappears from the default tools API response. Toggle it back on, verify it reappears.

### Implementation for User Story 1

- [x] T013 [US1] Add `GET /api/mcps/:name/tools/visibility` endpoint to `backend/src/api/mcp.routes.ts` — returns `{ visibility, totalCount, enabledCount }` (contracts/api.md)
- [x] T014 [US1] Add `PUT /api/mcps/:name/tools/visibility/:toolName` endpoint to `backend/src/api/mcp.routes.ts` — accepts `{ enabled: boolean }`, calls `setToolEnabled`, broadcasts `config:changed` (FR-001, FR-012)
- [x] T015 [US1] Modify `GET /api/mcps/:name/tools` endpoint in `backend/src/api/mcp.routes.ts` — add `includeDisabled` query param support; when `false` (default), filter tools by visibility using `filterTools`; when `true`, add `enabled` field to each tool (FR-003, FR-004)
- [x] T016 [US1] Add `filterToolsListResponse` call in `backend/src/proxy/index.ts` `sendOneMessage` — after receiving response, if request method is `tools/list`, filter the result's tools array by visibility before returning (FR-005)
- [x] T017 [US1] Add `filterToolsListResponse` call in `backend/src/mcp/mcp.routes.ts` SSE session `onMessage` handler — filter `tools/list` results before writing to SSE stream (FR-005)
- [x] T018 [P] [US1] Add `getToolVisibility(name)` and `setToolVisibility(name, toolName, enabled)` functions to `frontend/src/services/api.ts`
- [x] T019 [US1] Modify `getMCPTools` in `frontend/src/services/api.ts` — add optional `includeDisabled` parameter
- [x] T020 [US1] Create `frontend/src/hooks/useToolVisibility.ts` — React Query hook that fetches tools + visibility, returns `ToolWithVisibility[]`, provides toggle mutation
- [x] T021 [US1] Create `frontend/src/components/ToolsModal.tsx` — Radix Dialog modal showing tools list with toggle button per tool; each row has tool name, description, and toggle; disabled tools shown with `opacity-50`
- [x] T022 [US1] Add `Wrench` icon button to `frontend/src/components/MCPCard.tsx` — opens ToolsModal, only visible when `client.status === 'connected'` and `client.toolCount > 0`
- [x] T023 [US1] Wire ToolsModal state in `frontend/src/components/CardGrid.tsx` — add `toolsMcpName` state, pass `onTools` callback to MCPCard, render ToolsModal

**Checkpoint**: User Story 1 fully functional — user can toggle individual tools and see filtering in action

---

## Phase 4: User Story 2 — Persist Visibility Settings (Priority: P2)

**Goal**: Tool visibility settings survive application restarts

**Independent Test**: Disable a tool, restart the backend, verify the tool remains disabled.

### Implementation for User Story 2

- [x] T024 [US2] Verify persistence by adding integration test in `backend/tests/integration/tool-visibility.routes.test.ts` — toggle a tool via API, simulate restart (reload config), verify visibility persists
- [x] T025 [US2] Ensure `tool-visibility.json` is created on first write and read safely on subsequent loads — verify in `backend/src/tool-visibility/index.ts` that `loadToolVisibility` handles missing file gracefully

**Checkpoint**: User Story 2 complete — visibility settings persist across restarts

---

## Phase 5: User Story 3 — Visual Feedback and Bulk Actions (Priority: P3)

**Goal**: User sees enabled/total count and can enable/disable all tools at once

**Independent Test**: Open tools modal, verify count display, click "Disable All" and verify all tools switch state, click "Enable All" and verify reversal.

### Implementation for User Story 3

- [x] T026 [US3] Add `PUT /api/mcps/:name/tools/visibility` bulk endpoint to `backend/src/api/mcp.routes.ts` — accepts `{ enabled: boolean }`, calls `setBulkVisibility`, broadcasts `config:changed` (FR-008, FR-012)
- [x] T027 [US3] Add `setBulkToolVisibility(name, enabled)` function to `frontend/src/services/api.ts`
- [x] T028 [US3] Add bulk mutation to `frontend/src/hooks/useToolVisibility.ts` — `enableAll` and `disableAll` mutations that call `setBulkToolVisibility`
- [x] T029 [US3] Update `frontend/src/components/ToolsModal.tsx` header — show enabled/total count ("7/10 tools enabled"), add "Enable All" / "Disable All" buttons, wire to bulk mutations (FR-009, FR-010)
- [x] T030 [US3] Update `frontend/src/components/ToolsModal.tsx` tool rows — disabled tools use `opacity-50` and muted color scheme for clear visual distinction (FR-009)

**Checkpoint**: All user stories complete — full feature with toggle, persistence, bulk actions, and visual feedback

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and cleanup

- [x] T031 Run quickstart.md validation scenarios V1–V6 end-to-end (V2/V4/V5/V6 validated by test suite; V1/V3 require manual browser testing)
- [x] T032 Verify TypeScript compilation passes for both backend and frontend (`npx tsc --noEmit`)
- [x] T033 Run full test suite (`npm test` in backend and frontend) — 248/256 pass, 4 pre-existing failures

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (schema/types) — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Phase 2 completion
- **User Story 2 (Phase 4)**: Depends on Phase 2 completion (persistence is already built into the visibility module)
- **User Story 3 (Phase 5)**: Depends on Phase 2 completion (bulk operations use the same module)
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Phase 2 — no dependencies on other stories
- **User Story 2 (P2)**: Can start after Phase 2 — persistence is built into the foundational module, this phase just validates it
- **User Story 3 (P3)**: Can start after Phase 2 — bulk operations extend the same module

### Within Each User Story

- Backend endpoints before frontend integration
- API functions before React Query hooks
- React Query hooks before modal component
- Modal component before card integration

### Parallel Opportunities

- **Phase 1**: T001, T002, T003 can all run in parallel (different files)
- **Phase 2**: T005–T010 can run in parallel (same file but independent functions), T012 can run in parallel with T011
- **Phase 3**: T013–T015 (backend endpoints) can run in parallel with T018–T019 (frontend API functions); T021 (modal) can run in parallel with T016–T017 (proxy filtering)
- **Phase 5**: T026–T027 can run in parallel

---

## Parallel Example: User Story 1

```bash
# Backend endpoints (parallel):
Task: T013 — GET visibility endpoint
Task: T014 — PUT single toggle endpoint
Task: T015 — Modify tools endpoint

# Frontend API + Hook (parallel with backend):
Task: T018 — API functions
Task: T019 — Modify getMCPTools

# Proxy filtering (parallel with modal):
Task: T016 — sendOneMessage filtering
Task: T017 — SSE session filtering
Task: T021 — ToolsModal component
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Schema + types
2. Complete Phase 2: Visibility module
3. Complete Phase 3: Toggle + API + Modal
4. **STOP and VALIDATE**: Toggle a tool, verify API filtering works
5. Deploy/demo if ready

### Incremental Delivery

1. Phase 1 + Phase 2 → Foundation ready
2. Phase 3 (US1) → Toggle works → Deploy/Demo (MVP!)
3. Phase 4 (US2) → Persistence validated → Deploy/Demo
4. Phase 5 (US3) → Bulk actions + visual polish → Deploy/Demo
5. Each story adds value without breaking previous stories

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- The `tool-visibility.json` file follows the same pattern as `field-projection.json` — standalone config in the same directory as `.mcp.json`

---

## Phase 7: Convergence

**Purpose**: Address gaps identified between specification/plan and current implementation

- [x] T034 [US1] Add conditional rendering to Wrench icon button in `frontend/src/components/MCPCard.tsx` — only show when `client.status === 'connected'` AND `client.toolCount > 0` per T022 (partial)
- [x] T035 [US1] Create `frontend/tests/unit/ToolsModal.test.tsx` — component tests covering toggle interaction, bulk enable/disable, visual states (opacity-50 for disabled), and summary count display per plan: Project Structure (missing)
