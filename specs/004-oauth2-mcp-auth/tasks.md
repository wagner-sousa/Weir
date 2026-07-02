# Tasks: OAuth2 MCP Auth

**Input**: Design documents from `/specs/004-oauth2-mcp-auth/`

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

**Purpose**: No new project initialization needed — all infrastructure inherited from 003-edit-mcp-config.

No tasks in this phase.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Backend OAuth2 support — discovery, token storage, and callback endpoints. These block all user stories.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Tests (TDD — write first, verify they fail)

- [X] T001 [P] Add unit tests for `discoverOAuth2` in `backend/tests/unit/mcp-client.test.ts` (cover: successful discovery, unreachable well-known, invalid well-known response)
- [X] T002 [P] Add integration tests for `POST /api/auth/:name/start` in `backend/tests/integration/auth.test.ts` (cover: known MCP returns auth URL, nonexistent MCP returns 404, MCP without auth config returns 400)
- [X] T003 [P] Add integration tests for `GET /api/auth/:name/callback` in `backend/tests/integration/auth.test.ts` (cover: valid code exchange, missing code error, MCP not found)
- [X] T004 [P] Add unit tests for Bearer token header in `backend/tests/unit/mcp-client.test.ts` (cover: token passed in TransportConfig adds Authorization header, no token sends without header)

### Implementation

- [X] T005 [P] Add `discoverOAuth2(mcpUrl)` function to `backend/src/services/mcp-client.ts` that fetches `/.well-known/oauth-authorization-server` from the MCP origin and returns parsed auth config
- [X] T006 [P] Add optional `accessToken` field to `TransportConfig` in `backend/src/config/types.ts` and update `testHttpConnection`/`testSseConnection` to include `Authorization: Bearer` header when token is present
- [X] T007 [P] Update `testHttpConnection` in `backend/src/services/mcp-client.ts` to call `discoverOAuth2` on HTTP 401 and return `needsAuth: true` + `authUrl` in the result
- [X] T008 [P] Create `backend/src/api/auth.routes.ts` with routes:
  - `POST /api/auth/:name/start` — returns authorization URL with `client_id`, `redirect_uri`, `response_type=code`, `scope` params
  - `GET /api/auth/:name/callback` — handles provider redirect, receives `?code=`, exchanges for token via `token_endpoint`, stores in `.mcp.json`
- [X] T009 Register `authRoutes` in `backend/src/index.ts` (call `app.register(authRoutes)`)

**Checkpoint**: Backend ready — OAuth2 discovery works, callback completes token exchange, Bearer token used in requests.

---

## Phase 3: User Story 1 — Basic Auth Shield (Priority: P1) 🎯 MVP

**Goal**: Users see a shield icon on MCP cards that return 401. Clicking it opens a popup to the OAuth2 authorization URL.

**Independent Test**: Open dashboard, locate an HTTP MCP with 401 status, verify shield button appears, click it, verify popup opens to authorization URL.

### Tests (TDD — write first, verify they fail)

- [X] T010 [P] [US1] Write unit tests for `MCPCard` shield button rendering in `frontend/tests/components/MCPCard.test.tsx` (verify shield shows when `needsAuth` is true, hides when false)
- [X] T011 [P] [US1] Write unit tests for auth popup handling in `frontend/tests/components/CardGrid.test.tsx` (verify `onAuth` triggers `window.open` with correct URL)

### Implementation

- [X] T012 [P] [US1] Add `needsAuth` and `authUrl` fields to `MCPClient` interface in `frontend/src/services/api.ts`
- [X] T013 [P] [US1] Add shield button (ShieldAlert from lucide-react) to `frontend/src/components/MCPCard.tsx` — visible when `client.needsAuth && client.authUrl`, with `aria-label="Authorize MCP"` and amber styling
- [X] T014 [US1] Wire auth popup in `frontend/src/components/CardGrid.tsx`:
  - Add `handleAuth(client)` that calls `POST /api/auth/:name/start` to get the full authorization URL
  - Open popup via `window.open(url, '_blank', 'width=600,height=700')`
  - If `window.open` returns null, show toast "Popup blocked. Please allow popups for this site."
  - Monitor popup close: when closed, invalidate `['mcps']` query to refresh status
- [X] T015 [US1] Pass `onAuth` callback and `window.open` result to `CardGrid` from parent component if needed for testability

**Checkpoint**: User Story 1 complete — shield button visible on 401 cards, popup opens to auth URL.

---

## Phase 4: User Story 3 — Token Persistence (Priority: P2)

**Goal**: Access token is stored in `.mcp.json` and used for all subsequent MCP requests.

**Independent Test**: Complete OAuth2 flow, reload page, verify card shows "connected" and `.mcp-auth.json` contains `accessToken`.

### Tests (TDD — write first, verify they fail)

- [X] T016 [P] [US3] Write integration tests for token storage in `backend/tests/integration/auth.test.ts` (verify callback stores token in `.mcp.json`, verify token survives backend restart)

### Implementation

- [X] T017 [P] [US3] In `GET /api/auth/:name/callback` handler (`backend/src/api/auth.routes.ts`):
  - Extract `code` from query params
  - POST to MCP's `token_endpoint` with `grant_type=authorization_code`, `code`, `redirect_uri`, `client_id`
  - Receive `access_token` from response
  - Store `accessToken` in auth storage (`setAuthConfig`) for the MCP — written to `.mcp-auth.json` via `conf` npm package
  - Return HTML page with "Authorization successful" and `window.close()` script
- [X] T018 [US3] Populate `accessToken` in `TransportConfig` when loading MCP clients in `backend/src/api/mcp.routes.ts` `GET /api/mcps` handler — read from config file and pass to `testConnection`

**Checkpoint**: User Story 3 complete — tokens are stored and used.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Documentation updates and validation.

- [X] T019 Run `quickstart.md` validation scenarios to verify all acceptance criteria pass
- [X] T020 Run lint and typecheck across backend and frontend

---

## Phase 6: Convergence

**Purpose**: Close gaps between spec/plan requirements and implementation.

- [X] T021 Align token storage location with spec: store `accessToken` in `.mcp.json` per FR-005 / US3/AC1, or document the deviation in `plan.md` Constitution Check and update spec/data-model to reference `.mcp-auth.json` (constitution IV, FR-005, US3/AC1 — contradicts)
- [X] T022 Fix whitespace-only scope filtering: replace `.filter(Boolean)` with `.filter(s => s && s.trim().length > 0)` in `auth.routes.ts:213` per FR-012 (FR-012 — partial)
- [X] T023 Add integration tests for scope parameter construction: verify `scope` omitted when `scopesSupported` is absent/empty, included when present, and whitespace-only entries are filtered out per FR-010/FR-011/FR-012/SC-006/SC-007/US4/AC1-3/US5/AC1-3 (FR-010, FR-011, FR-012, SC-006, SC-007 — missing)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — empty phase (all infra exists)
- **Foundational (Phase 2)**: No dependencies — can start immediately — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational (Phase 2) completion
- **User Story 3 (Phase 4)**: Depends on Foundational (Phase 2) — can proceed in parallel with US1
- **Polish (Final Phase)**: Depends on US1 completion

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) — No dependencies on other stories
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) — independent from US1

### Within Each User Story

- Tests (T001–T004, T010–T011, T016) MUST be written and FAIL before implementation
- Backend services before API routes
- API routes before frontend integration

### Parallel Opportunities

- T001, T002, T003, T004: All backend test files can run in parallel (different test files)
- T005, T006, T008: discovery function, TransportConfig update, auth routes can run in parallel
- T007 depends on T005 (testHttpConnection calls discoverOAuth2)
- T009 depends on T008 (need authRoutes before registration)
- T010, T011, T012: frontend tests and type update can run in parallel
- T013 depends on T012 (needs MCPClient type)
- T014 depends on T013 + T008 (needs shield button + auth route)
- T016, T017: token tests and implementation — T016 before T017
- T018 depends on T017 (need token stored before using it)

---

## Parallel Example

```bash
# Phase 2 - Backend tests in parallel:
Task: "Add discoverOAuth2 unit tests"
Task: "Add POST /api/auth/:name/start integration tests"
Task: "Add GET /api/auth/:name/callback integration tests"
Task: "Add Bearer token unit tests"

# Phase 2 - Backend implementation in parallel:
Task: "Add discoverOAuth2 function"
Task: "Add accessToken to TransportConfig and update testHttpConnection"
Task: "Create auth.routes.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 2: Foundational (OAuth2 discovery + Bearer token)
2. Complete Phase 3: User Story 1 (shield button + popup)
3. **STOP and VALIDATE**: Shield button appears on 401 cards, popup opens
4. Add Phase 4: Token persistence (stretch goal)

### Incremental Delivery

1. Complete Foundational → Backend OAuth2 ready
2. Add User Story 1 → Shield + popup works (MVP!)
3. Add User Story 3 → Token persistence + auto-Bearer headers
4. Run lint + typecheck + quickstart

**MVP Scope**: User Story 1 — shield button on 401 cards + popup opens to authorization URL. Token persistence is a P2 stretch goal.

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- All user-facing text in English per Constitution III
- All icons from lucide-react per Constitution VI (ShieldAlert for auth)
