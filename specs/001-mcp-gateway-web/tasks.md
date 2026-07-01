---

description: "Task list for MCP Gateway Web (Weir)"

---

# Tasks: MCP Gateway Web

**Input**: Design documents from `specs/001-mcp-gateway-web/`

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/api.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/`, `frontend/src/`
- Tests: `backend/tests/`, `frontend/tests/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create backend project: package.json, tsconfig.json, eslint.config.js, .prettierrc, vitest.config.ts in backend/
- [x] T002 [P] Create frontend project with Vite + React + TypeScript in frontend/
- [x] T003 [P] Create Dockerfile (multi-stage: frontend build + backend build + runtime) at project root
- [x] T004 [P] Create docker-compose.yml (producao) at project root
- [x] T005 [P] Create docker-compose.dev.yml with services: setup, dev, test, build, typecheck, lint, format
- [x] T006 [P] Install all dependencies via docker compose -f docker-compose.dev.yml run --rm setup
- [x] T007 Create .gitignore with node_modules/, dist/, .env, coverage/
- [x] T008 Create .dockerignore with node_modules/, .git, coverage/, frontend/node_modules/
- [x] T046 Create .env.example and .env with all configuration parameters (MCP_CONFIG_PATH, PORT) in project root

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T047 Write unit tests for schema and loader in backend/tests/unit/schema.test.ts and backend/tests/unit/loader.test.ts
- [x] T009 Create Zod schema for .mcp.json in backend/src/config/schema.ts
- [x] T010 [P] Create TypeScript types inferred from schema in backend/src/config/types.ts
- [x] T011 Create .mcp.json loader + validator in backend/src/config/loader.ts
- [x] T013 Create Fastify server entry point in backend/src/index.ts (basic server, graceful shutdown)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - View MCP list in web mode (Priority: P1) MVP

**Goal**: User accesses Weir in the browser and sees configured MCPs displayed as cards (3 per row)

**Independent Test**: Start Weir, access http://localhost:3000, verify cards displayed with name and type

### Tests for User Story 1

- [x] T014 [P] [US1] Write contract test for GET /api/mcps in backend/tests/unit/mcp.routes.test.ts
- [x] T015 [P] [US1] Write integration test for API + loader in backend/tests/integration/api.test.ts
- [x] T016 [P] [US1] Write component test for MCPCard in frontend/tests/components/MCPCard.test.tsx
- [x] T017 [P] [US1] Write component test for CardGrid in frontend/tests/components/CardGrid.test.tsx
- [x] T058 [P] [US1] Write test for unknown transport type displaying "Unknown" badge in frontend/tests/components/MCPCard.test.tsx

### Implementation for User Story 1

- [x] T018 [US1] Implement GET /api/mcps route in backend/src/api/mcp.routes.ts
- [x] T019 [P] [US1] Implement GET /api/health route in backend/src/api/health.routes.ts
- [x] T020 [US1] Register routes + static file serve + CORS in backend/src/index.ts
- [x] T021 [P] [US1] Create MCPCard component in frontend/src/components/MCPCard.tsx (nome, tipo, badge)
- [x] T022 [P] [US1] Create CardGrid component in frontend/src/components/CardGrid.tsx (grid 3 colunas)
- [x] T023 [P] [US1] Create EmptyState component in frontend/src/components/EmptyState.tsx
- [x] T024 [P] [US1] Create ErrorState component in frontend/src/components/ErrorState.tsx
- [x] T025 [P] [US1] Create API client service in frontend/src/services/api.ts
- [x] T026 [P] [US1] Create useMCPs hook in frontend/src/hooks/useMCPs.ts (TanStack Query)
- [x] T027 [US1] Create App.tsx with CardGrid + EmptyState + ErrorState in frontend/src/App.tsx
- [x] T028 [US1] Create main.tsx entry point in frontend/src/main.tsx
- [x] T029 [US1] Configure Tailwind CSS with theme colors in frontend/src/styles.css
- [x] T030 [US1] Configure frontend build output to backend/src/web/ in frontend/vite.config.ts

### Badge System, Connection Indicator & Loading (US4/US6)

- [x] T048 [P] [US4] Implement Badge component with 6 semantic variants in frontend/src/components/Badge.tsx (default, secondary, destructive, success, warning, outline)
- [x] T049 [P] [US4] Implement ConnectionIndicator component in frontend/src/components/ConnectionIndicator.tsx (green dot for online, red dot for offline)
- [x] T050 [P] [US4] Integrate Badge and ConnectionIndicator into MCPCard component
- [x] T051 [P] [US6] Create LoadingSpinner component in frontend/src/components/LoadingSpinner.tsx

### Toast Notification System (US5 - P2)

- [x] T052 [P] [US5] Integrate sonner Toaster in frontend/src/main.tsx (positioned bottom-right, auto-dismiss 3s)
- [x] T053 [P] [US5] Create notification service wrapper in frontend/src/services/notifications.ts (success/green, error/red, info/blue)
- [x] T054 [US5] Wire error notifications into API client service (show toast on HTTP failures)

**Checkpoint**: User Story 1 should be fully functional -- accessing http://localhost:3000 shows cards

---

## Phase 4: User Story 2 - View MCP list in Docker mode (Priority: P1)

**Goal**: User runs Docker container with .mcp.json mounted as a volume and sees the list

**Independent Test**: `docker run -v $(pwd)/.mcp.json:/app/.mcp.json -p 3000:3000 weir` and access browser

### Tests for User Story 2

- [x] T031 [P] [US2] Write Docker startup test via docker compose run --rm test in backend/tests/integration/docker.test.ts
  Note: docker-compose.dev.yml needs a docker-test service with /var/run/docker.sock mounted (requires access to Docker daemon in CI)

### Implementation for User Story 2

- [x] T032 [US2] Complete Dockerfile with multi-stage build (frontend build + tsc + runtime stage)
- [x] T033 [US2] Update docker-compose.yml (producao) with volume mount for .mcp.json
- [x] T034 [US2] Update docker-compose.dev.yml with production-like service for validation

**Checkpoint**: User Story 2 should work -- container starts and displays MCPs without extra configuration

---

## Phase 5: User Story 3 - Automatic listing update (Priority: P2)

**Goal**: Modify .mcp.json and see changes reflected in <5s without reloading the page

**Independent Test**: Edit .mcp.json (add/remove server) and see card appear/disappear within <5s

### Tests for User Story 3

- [x] T035 [P] [US3] Write unit test for file watcher in backend/tests/unit/watcher.test.ts
- [x] T036 [P] [US3] Write unit test for WebSocket broadcast in backend/tests/unit/ws.test.ts

### Implementation for User Story 3

- [x] T037 [US3] Implement chokidar file watcher in backend/src/config/watcher.ts
- [x] T038 [US3] Implement WebSocket handler in backend/src/api/ws.ts (broadcast config:changed)
- [x] T039 [US3] Wire watcher + WebSocket into Fastify server in backend/src/index.ts
- [x] T040 [P] [US3] Add WebSocket client logic to frontend/src/services/api.ts
- [x] T041 [US3] Add auto-refetch logic to useMCPs hook on config:changed event
- [x] T042 [US3] Add loading state "Updating..." during refresh

**Checkpoint**: User Story 3 should work -- editing .mcp.json updates the screen without reloading

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T043 [P] Add error handling for JSON parse failures in .mcp.json loader (implemented in loader.ts)
- [x] T044 [P] Add logging (pino) for file changes, API requests, and errors (implemented in index.ts via Fastify logger + watcher log)
- [x] T045 Run quickstart.md validation scenarios (scenarios 1-6) — requires functional Docker environment
- [x] T055 [P] [US3] Handle .mcp.json deletion during runtime in watcher - broadcast deletion event and show "file not found" in UI
- [x] T056 [P] Add descriptive startup error messages in backend/src/index.ts (port occupied, permission denied, file not found)
- [x] T057 [P] Add responsive design test for minimum viewport width (320px)
- [x] T059 [P] Verify that web mode and Docker mode share the same .mcp.json parsing logic (RF-010) — confirm both paths call the same loader module
- [x] T060 [P] Add load/performance test for large .mcp.json (dozens of MCPs) to verify rendering and responsiveness

---

## Phase 7: Convergence

- [x] T061 Update contracts/api.md GET /api/mcps response key from `mcps` to `clients` and add missing fields (`error`, `timestamp`, `mcpPort`) to match actual API implementation (contracts/api.md:11, contradicts)
- [x] T062 Implement T060 — create load/performance test for large .mcp.json in frontend/tests/components/ (missing)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Foundational
- **US2 (Phase 4)**: Depends on US1 (Docker precisa do app funcionando)
- **US3 (Phase 5)**: Depends on US1 (watcher + WS integram com o backend)
- **Polish & Remediation (Phase 6)**: Depends on all user stories

### Parallel Opportunities

- T002, T003, T004, T005, T006, T007, T008, T046 can run in parallel (Phase 1)
- T047 must run before T009, T010, T011 (Test-First)
- T014, T015, T016, T017 can run in parallel (Phase 3 tests)
- T019, T021, T022, T023, T024, T025, T026, T048, T049, T050, T051 can run in parallel (Phase 3 impl)
- T052, T053, T054 can run in parallel (Phase 3 toasts)
- T031 can run alone (Phase 4)
- T035, T036 can run in parallel (Phase 5 tests)
- T055, T056, T057 can run in parallel (Phase 6)

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Write contract test for GET /api/mcps in backend/tests/unit/mcp.routes.test.ts"
Task: "Write integration test for API + loader in backend/tests/integration/api.test.ts"
Task: "Write component test for MCPCard in frontend/tests/components/MCPCard.test.tsx"
Task: "Write component test for CardGrid in frontend/tests/components/CardGrid.test.tsx"

# Launch all UI components together:
Task: "Create MCPCard component in frontend/src/components/MCPCard.tsx"
Task: "Create CardGrid component in frontend/src/components/CardGrid.tsx"
Task: "Create EmptyState component in frontend/src/components/EmptyState.tsx"
Task: "Create ErrorState component in frontend/src/components/ErrorState.tsx"
Task: "Implement Badge component with 6 semantic variants in frontend/src/components/Badge.tsx"
Task: "Implement ConnectionIndicator component in frontend/src/components/ConnectionIndicator.tsx"
Task: "Create LoadingSpinner component in frontend/src/components/LoadingSpinner.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup
2. Phase 2: Foundational (Test-First: T047 before T009)
3. Phase 3: US1 (Web mode - core functionality + badges + toasts + loading)
4. **STOP and VALIDATE**: Test US1 independently

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 (Web mode + badges + toasts + loading) → Test independently → MVP!
3. Add US2 (Docker) → Test independently
4. Add US3 (Auto-refresh + deletion handling) → Test independently
5. Polish (terminal errors, responsive test)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing (Test-First)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- T046 creates .env.example per Constitution Workflow #7
- T047 before T009 enforces Test-First (Constitution Principle II)
