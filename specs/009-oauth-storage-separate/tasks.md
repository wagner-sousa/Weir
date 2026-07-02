# Tasks: OAuth Storage Separate

**Input**: Design documents from `/specs/009-oauth-storage-separate/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Included per Constitution II (Test-First).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/`, `backend/tests/` as established by existing project
- All paths relative to repository root

---

## Phase 1: Setup

**Purpose**: Install new dependency.

- [X] T001 Install `conf` package in `backend/` via `npm install conf`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: AuthStorage service that blocks all user stories.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Tests (TDD — write first, verify they fail)

- [X] T002 [P] Add unit tests for `auth-storage` in `backend/tests/unit/auth-storage.test.ts` (cover: get/set/delete auth config, file permission 0600, missing file returns undefined, migration from .mcp.json)

### Implementation

- [X] T003 [P] Create `AuthStorage` service in `backend/src/services/auth-storage.ts` using `conf` package. Functions: `getAuthConfig(name)`, `setAuthConfig(name, data)`, `deleteAuthConfig(name)`, `migrateFromMcpJson(mcpJsonPath)`. Config path via `MCP_AUTH_CONFIG_PATH` env var (default: derived from `MCP_CONFIG_PATH`).
- [X] T004 [P] Add `stripOAuthFields` helper to `backend/src/config/writer.ts` — remove `accessToken`, `auth`, `pendingCodeVerifier` from each MCP entry before serialization.

**Checkpoint**: AuthStorage ready — migration and storage layer complete.

---

## Phase 3: User Story 1 — OAuth Data in Separate Storage (Priority: P1) 🎯 MVP

**Goal**: After OAuth2 authorization, tokens are stored in `.mcp-auth.json` instead of `.mcp.json`. All reads of OAuth data use the new storage.

**Independent Test**: Complete OAuth2 flow, inspect `.mcp-auth.json` for token, verify `.mcp.json` has no OAuth fields.

### Tests (TDD — write first, verify they fail)

- [X] T005 [US1] Add integration tests for auth routes using new storage in `backend/tests/integration/auth-storage.test.ts` (cover: OAuth callback stores token in `.mcp-auth.json`, token is NOT in `.mcp.json`)

### Implementation

- [X] T006 [US1] Modify `auth.routes.ts` (`saveRawConfig` and callback handler) to use `AuthStorage.setAuthConfig` instead of direct `.mcp.json` writes for `accessToken`, `auth`, and `pendingCodeVerifier`.
- [X] T007 [US1] Modify `mcp.routes.ts` (all handlers that read `accessToken`) to use `AuthStorage.getAuthConfig` instead of reading directly from `.mcp.json`.
- [X] T008 [US1] Modify `mcp.routes.ts` (`DELETE` handler) to call `AuthStorage.deleteAuthConfig` alongside the existing config deletion.

**Checkpoint**: User Story 1 complete — all OAuth reads/writes use `.mcp-auth.json`.

---

## Phase 4: User Story 2 — Migration (Priority: P1)

**Goal**: Existing `.mcp.json` files with inline OAuth data are automatically migrated to `.mcp-auth.json` on first access.

**Independent Test**: Create `.mcp.json` with inline accessToken, start backend, verify data moved.

### Tests (TDD — write first, verify they fail)

- [X] T009 [US2] Add migration integration tests in `backend/tests/integration/auth-storage.test.ts` (cover: migration copies token from .mcp.json to .mcp-auth.json, migration strips token from .mcp.json, migration does NOT overwrite existing .mcp-auth.json)

### Implementation

- [X] T010 [US2] Call `migrateFromMcpJson` on startup in `backend/src/index.ts` after config path is resolved.
- [X] T011 [US2] Update `writer.ts` to always call `stripOAuthFields` before writing `.mcp.json` (ensures no OAuth fields persist after migration).

**Checkpoint**: User Story 2 complete — migration runs automatically.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Validation and cleanup.

- [X] T012 Run `quickstart.md` validation scenarios
- [X] T013 Run lint and typecheck across backend
- [X] T014 Add `MCP_AUTH_CONFIG_PATH` to `.env.example` and `docker-compose.dev.yml`

---

## Phase 6: Convergence

**Purpose**: Close gaps between implementation and spec/plan/tasks discovered during convergence assessment.

- [X] T015 Modify `migrateFromMcpJson` in `backend/src/services/auth-storage.ts` to also rewrite `.mcp.json` via `writeMCPConfig` after copying OAuth data, so OAuth fields are stripped from `.mcp.json` per FR-004 (`partial`)
- [X] T016 Add `deleteAuthConfig(name)` call to the DELETE handler in `backend/src/api/mcp.routes.ts` so orphaned auth entries are cleaned up per T008 (`missing`)
- [X] T017 Add error handling in `AuthStorage` (`backend/src/services/auth-storage.ts`) — wrap `getStore`/`getAuthConfig` so that a corrupted `.mcp-auth.json` logs a warning and returns undefined instead of throwing, per FR-007 (`partial`)
- [X] T018 Pass `configFileMode: 0o600` to the `Conf` constructor in `backend/src/services/auth-storage.ts` to enforce restricted permissions per FR-006 (`missing`)
- [X] T019 Add integration tests for migration in `backend/tests/integration/auth-storage.test.ts` covering: migration with full backend, migration strips `.mcp.json`, migration doesn't overwrite existing `.mcp-auth.json`, per T009 (`missing`)

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational
- **User Story 2 (Phase 4)**: Depends on Foundational — independent from US1
- **Polish (Phase 5)**: Depends on US1 + US2

### Parallel Opportunities

- T002, T003, T004: Phase 2 tasks can run in parallel (different files)
- T006, T007, T008: US1 implementation can run in parallel (different handlers)

---

## Implementation Strategy

### MVP

1. Phase 1 + 2: Install `conf`, create AuthStorage service
2. Phase 3: Redirect auth writes/reads to new storage
3. Phase 4: Migration from old `.mcp.json` format
4. Phase 5: Lint + typecheck + env vars

---

## Notes

- Uses `conf` package instead of custom fs — atomic writes, auto JSON parse
- `.mcp-auth.json` permissions set to 0600 by `conf`
- Migration is one-way: OAuth fields stripped from `.mcp.json` permanently
- No frontend changes needed
