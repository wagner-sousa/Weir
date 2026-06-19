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

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T009 Create Zod schema for .mcp.json in backend/src/config/schema.ts
- [x] T010 [P] Create TypeScript types inferred from schema in backend/src/config/types.ts
- [x] T011 Create .mcp.json loader + validator in backend/src/config/loader.ts
- [x] T012 [P] Write unit tests for schema and loader in backend/tests/unit/schema.test.ts and backend/tests/unit/loader.test.ts
- [x] T013 Create Fastify server entry point in backend/src/index.ts (basic server, graceful shutdown)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Visualizar lista de MCPs em modo web (Priority: P1) MVP

**Goal**: Usuario acessa o Weir no navegador e ve os MCPs configurados em cartoes (3 por linha)

**Independent Test**: Iniciar o Weir, acessar http://localhost:3000, verificar cartoes exibidos com nome e tipo

### Tests for User Story 1

- [x] T014 [P] [US1] Write contract test for GET /api/mcps in backend/tests/unit/mcp.routes.test.ts
- [x] T015 [P] [US1] Write integration test for API + loader in backend/tests/integration/api.test.ts
- [x] T016 [P] [US1] Write component test for MCPCard in frontend/tests/components/MCPCard.test.tsx
- [x] T017 [P] [US1] Write component test for CardGrid in frontend/tests/components/CardGrid.test.tsx

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

**Checkpoint**: User Story 1 should be fully functional -- acessar http://localhost:3000 mostra cartoes

---

## Phase 4: User Story 2 - Visualizar lista de MCPs em modo Docker (Priority: P1)

**Goal**: Usuario executa container Docker com .mcp.json montado como volume e ve a lista

**Independent Test**: `docker run -v $(pwd)/.mcp.json:/app/.mcp.json -p 3000:3000 weir` e acessar navegador

### Tests for User Story 2

- [ ] T031 [P] [US2] Write Docker startup test via docker compose run --rm test in backend/tests/integration/docker.test.ts
  Nota: docker-compose.dev.yml precisa de servico docker-test com /var/run/docker.sock montado (requer acesso ao daemon Docker no CI)

### Implementation for User Story 2

- [x] T032 [US2] Complete Dockerfile with multi-stage build (frontend build + tsc + runtime stage)
- [x] T033 [US2] Update docker-compose.yml (producao) with volume mount for .mcp.json
- [ ] T034 [US2] Update docker-compose.dev.yml with production-like service for validation

**Checkpoint**: User Story 2 should work -- container inicia e exibe MCPs sem configuracao extra

---

## Phase 5: User Story 3 - Atualizacao automatica da listagem (Priority: P2)

**Goal**: Modificar .mcp.json e ver alteracoes refletidas em <5s sem recarregar a pagina

**Independent Test**: Editar .mcp.json (adicionar/remover servidor) e ver cartao aparecer/sumir em <5s

### Tests for User Story 3

- [x] T035 [P] [US3] Write unit test for file watcher in backend/tests/unit/watcher.test.ts
- [x] T036 [P] [US3] Write unit test for WebSocket broadcast in backend/tests/unit/ws.test.ts

### Implementation for User Story 3

- [x] T037 [US3] Implement chokidar file watcher in backend/src/config/watcher.ts
- [x] T038 [US3] Implement WebSocket handler in backend/src/api/ws.ts (broadcast config:changed)
- [x] T039 [US3] Wire watcher + WebSocket into Fastify server in backend/src/index.ts
- [x] T040 [P] [US3] Add WebSocket client logic to frontend/src/services/api.ts
- [x] T041 [US3] Add auto-refetch logic to useMCPs hook on config:changed event
- [x] T042 [US3] Add loading state "Atualizando..." during refresh

**Checkpoint**: User Story 3 should work -- editar .mcp.json atualiza a tela sem recarregar

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T043 [P] Add error handling for JSON parse failures in .mcp.json loader (implementado em loader.ts)
- [x] T044 [P] Add logging (pino) for file changes, API requests, and errors (implementado em index.ts via Fastify logger + watcher log)
- [ ] T045 Run quickstart.md validation scenarios (cenarios 1-6) — requer ambiente Docker funcional

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Foundational
- **US2 (Phase 4)**: Depends on US1 (Docker precisa do app funcionando)
- **US3 (Phase 5)**: Depends on US1 (watcher + WS integram com o backend)
- **Polish (Phase 6)**: Depends on all user stories

### Parallel Opportunities

- T002, T003, T004, T005, T006, T007, T008 can run in parallel (Phase 1)
- T010, T012 can run in parallel (Phase 2)
- T014, T015, T016, T017 can run in parallel (Phase 3 tests)
- T019, T021, T022, T023, T024, T025, T026 can run in parallel (Phase 3 impl)
- T031 can run alone (Phase 4)
- T035, T036 can run in parallel (Phase 5 tests)

### Implementation Strategy

**MVP (US1 only)**:
1. Phase 1: Setup
2. Phase 2: Foundational
3. Phase 3: US1 (Web mode - core functionality)
4. **STOP and VALIDATE**: Test US1 independently

**Incremental Delivery**:
1. Setup + Foundational → Foundation ready
2. Add US1 (Web mode) → Test independently → MVP!
3. Add US2 (Docker) → Test independently
4. Add US3 (Auto-refresh) → Test independently
5. Polish
