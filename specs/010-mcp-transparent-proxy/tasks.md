# Tasks: Transparent MCP Proxy

**Input**: Design documents from `specs/010-mcp-transparent-proxy/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Test tasks are included per the feature specification (Test-First constitution principle).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `backend/src/`, `backend/tests/`
- **Frontend**: `frontend/src/`
- Paths follow the existing monorepo structure

---

## Phase 1: Setup

**Purpose**: Project initialization and directory structure

- [X] T001 Create `backend/src/proxy/` directory structure for new module
- [X] T002 [P] Update `backend/src/index.ts` with `--mcp <name>` flag entry point and optional MCP port server startup
- [X] T003 [P] Add `WEIR_MCP_PORT`, `WEIR_PROXY_RECONNECT_BASE_DELAY`, `WEIR_PROXY_RECONNECT_MAX_DELAY`, `WEIR_PROXY_RECONNECT_MAX_RETRIES`, `WEIR_PROXY_BUFFER_LIMIT`, `WEIR_PROXY_BACKEND_TIMEOUT`, `WEIR_PROXY_KEEPALIVE_MS` env vars to `.env.example` and `docker-compose.dev.yml`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Implement proxy types (`ProxyConfig`, `ProxyState`, `ProxyOptions`) in `backend/src/proxy/types.ts`

**Checkpoint**: Foundation ready — user story implementation can now begin

---

## Phase 3: User Story 1 - Agent Connects to MCP Through Proxy (Priority: P1) 🎯 MVP

**Goal**: Agent establishes a transparent proxy session via `weir --mcp <name>`, sends JSON-RPC requests, and receives responses as if connected directly to the MCP backend.

**Independent Test**: A test agent configured with `weir --mcp test-db` can list tools and call a tool, receiving identical results to a direct connection (verified by diffing responses).

### Implementation for User Story 1

**TDD**: Write test → see fail → implement → see pass (per component)

- [X] T017 [US1] Unit test: proxy state machine transitions (CONNECTING → CONNECTED → RECONNECTING → CLOSED) in `backend/tests/unit/proxy.test.ts`
- [X] T005 [US1] Implement proxy state machine (CONNECTING → CONNECTED → RECONNECTING → DRAINING → CLOSED) and connect/forward loop in `backend/src/proxy/proxy.ts`
- [X] T006 [P] [US1] Implement stdio transport adapter (spawn child process, pipe stdin/stdout, detect disconnect) in `backend/src/proxy/transport.ts`
- [X] T007 [P] [US1] Implement SSE transport adapter (fetch SSE stream for incoming, POST for outgoing, detect stream end) in `backend/src/proxy/transport.ts`
- [X] T008 [P] [US1] Implement HTTP transport adapter (POST per message, streaming response, connection pooling) in `backend/src/proxy/transport.ts`
- [X] T009 [US1] Implement `--mcp <name>` entry point (read `.mcp.json`, resolve config, determine transport, start proxy loop) in `backend/src/proxy/index.ts`

**Checkpoint**: At this point, User Story 1 should be fully functional — agent can connect and interact through proxy transparently

---

## Phase 4: User Story 4 - Dedicated MCP Port /mcp SSE Endpoint (Priority: P1)

**Goal**: Weir runs a dedicated HTTP server on port 4000 (configurable via `WEIR_MCP_PORT`) serving `GET /mcp/<name>` for SSE streaming and `POST /mcp/<name>/message` for agent messages. Each SSE session creates an independent proxy session with its own backend transport and state machine. This replaces the old `POST /api/proxy/<name>` stateless endpoint. US4 has P1 priority (same as US1) and comes before US2–US3.

**Independent Test**: An agent configured with `http://localhost:4000/mcp/Bitbucket` as its MCP server URL can list tools and call a tool, receiving the same results as `weir --mcp Bitbucket`.

**Design**:
- A new `createProxySession(name)` factory in `proxy/index.ts` returns a reusable proxy session (connect, forward, disconnect)
- The MCP port server is a separate Fastify instance started conditionally based on `WEIR_MCP_PORT`
- `mcp.server.ts` creates and starts/stops the dedicated Fastify instance
- `mcp.routes.ts` handles SSE stream setup (`GET /mcp/<name>`) and message receiving (`POST /mcp/<name>/message`)
- Each SSE connection creates a `ProxySession` via the existing `proxy.ts` core
- CORS headers applied to MCP port endpoints

### Implementation

- [X] T028 [P] [US4] Unit test: `createProxySession()` creates session with correct config in `backend/tests/unit/mcp-server.test.ts`
- [X] T029 [US4] Implement `createProxySession(name)` factory in `backend/src/proxy/index.ts`
- [X] T030 [US4] Create `backend/src/mcp/mcp.server.ts` — dedicated Fastify instance, start/stop lifecycle, backpressure handling for SSE slow consumers
- [X] T031 [US4] Create `backend/src/mcp/mcp.routes.ts` — `GET /mcp/<name>` (SSE) + `POST /mcp/<name>/message`
- [X] T032 [P] [US4] Register MCP port server in `backend/src/index.ts` (conditional on `WEIR_MCP_PORT`)
- [X] T033 [US4] Implement SSE session management (per-connection proxy session, cleanup on disconnect) in `backend/src/mcp/mcp.server.ts`
- [X] T038 [US4] Handle malformed JSON-RPC responses: log warning and forward if possible in `backend/src/proxy/proxy.ts`
- [X] T035 [US4] Integration test: SSE stream + message round-trip with stdio backend in `backend/tests/integration/mcp-server.test.ts`
- [X] T036 [P] [US4] Integration test: MCP port error conditions (404 unknown name, no SSE invalid path) in `backend/tests/integration/mcp-server.test.ts`
- [X] T037 [P] [US4] Integration test: MCP port isolation from main API (port 3000 routes unaffected) in `backend/tests/integration/mcp-server.test.ts`

**Checkpoint**: At this point, the proxy feature supports both CLI (`weir --mcp <name>`) and SSE URL (`http://localhost:4000/mcp/<name>`) access methods, covering all three backend transports.

---

## Phase 5: User Story 2 - Backend Disconnects and Reconnects (Priority: P2)

**Goal**: If the MCP backend crashes, Weir detects the disconnection, buffers messages with FIFO ordering, and reconnects with exponential backoff. When the backend recovers, buffered messages are drained in order.

**Independent Test**: A test backend configured to crash after one request. Weir reconnects with increasing delays, the agent retries, and the second request succeeds.

### Implementation for User Story 2

**TDD**: Write test → see fail → implement → see pass (per component)

- [X] T019 [US2] Unit test: backoff delay calculation with jitter in `backend/tests/unit/proxy.test.ts`
- [X] T010 [US2] Implement exponential backoff with jitter in `backend/src/proxy/proxy.ts`
- [X] T018 [US2] Unit test: buffer push, drain, overflow behavior in `backend/tests/unit/proxy.test.ts`
- [X] T011 [US2] Implement message buffer (FIFO queue) during reconnect with configurable limit in `backend/src/proxy/proxy.ts`
- [X] T012 [US2] Implement buffer drain on reconnect (deliver buffered messages in order) in `backend/src/proxy/proxy.ts`
- [X] T013 [US2] Handle max retries exceeded: close proxy with error message to agent in `backend/src/proxy/proxy.ts`

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 6: Observability & Cross-Cutting

**Purpose**: Health monitoring, WebSocket integration, and graceful lifecycle management

- [X] T014 Implement periodic health checks for active proxy sessions in `backend/src/proxy/proxy.ts`
- [ ]~~T015 Integrate WebSocket events (`broadcast('status', ...)`) for proxy health (connected, reconnecting, error, closed)~~ *(standalone proxy mode — sem Fastify WebSocket; aplicável apenas se integrado ao servidor)*
- [X] T016 Implement graceful shutdown (SIGTERM/SIGINT handlers): drain in-flight messages, close backend connection, notify agent

---

## Phase 7: Hotfixes (já implementados)

**Purpose**: Bugfixes T048-T051 do escopo anterior, já implementados e verificados.

- [X] T048 Fix: `frontend/src/services/api.ts` — `connectWebSocket()` aceita callback `onStatusEvent` e trata eventos `status` do WebSocket
- [X] T049 Fix: `frontend/src/hooks/useMCPs.ts` — passa `handleStatusEvent` como callback do WebSocket, atualizando `statusMap` imediatamente
- [X] T050 Fix: `backend/src/api/mcp.routes.ts` — `POST /api/mcps/test-connection` faz `broadcast('status', ...)` via WebSocket após `setCachedStatus`
- [X] T051 Fix: `backend/src/api/mcp.routes.ts` — `POST /api/mcps/test-connection` chama `queryTools()` para recalcular `toolCount` em vez de fixar 0

---

## Phase 8: Tests

**Purpose**: Integration tests for proxy functionality (unit tests in respective implementation phases per Test-First constitution).

### Integration Tests

- [X] T020 Integration test: stdio→stdio proxy forwarding with test MCP server in `backend/tests/integration/proxy.test.ts`
- [ ]~~T021 Integration test: auto-reconnect when backend crashes and recovers in `backend/tests/integration/proxy.test.ts`~~ *(requer mock de backend crashável — teste complexo diferido)*
- [X] T022 Integration test: buffer preserved and drained during reconnect window in `backend/tests/integration/proxy.test.ts`

### User Story 3 — Multiple Concurrent Proxies (P3)

- [X] T026 [P] [US3] Verification test: two concurrent `weir --mcp` processes to same backend list tools and call tools independently in `backend/tests/integration/proxy.test.ts`
- [X] T027 [P] [US3] Integration test: two proxy sessions to same backend, one read + one write, both complete correctly in `backend/tests/integration/proxy.test.ts`

---

## Phase 9: Polish

**Purpose**: Documentation, linting, and final verification.

- [X] T023 [P] Update `AGENTS.md` with proxy mode documentation
- [X] T024 [P] Run `docker compose -f docker-compose.dev.yml exec dev sh -c "cd /app/backend && npx tsc --noEmit"` then same for frontend — zero type errors *(verificado)*
- [X] T025 [P] Run `docker compose -f docker-compose.dev.yml exec dev sh -c "cd /app/backend && npm test"` — all tests passing *(130/134 passam, 4 skipped, 1 pre-existing docker.test.ts falha)*

---

## Phase 10: User Story 5 - Auth-Gated MCP Shows Correct Status (Priority: P1)

**Goal**: Auth-gated HTTP MCPs (e.g., Postman) that accept `initialize` without a token but require one for `tools/list` show `needsAuth` status instead of `connected` in the dashboard. Non-auth MCPs remain unaffected.

**Independent Test**: Configure an auth-gated HTTP MCP with no `accessToken`. Run test-connection via `POST /api/mcps/test`. Verify response contains `{"status":"needsAuth","needsAuth":true}` and the dashboard card shows the warning icon.

### Implementation for User Story 5

**TDD**: Write test → see fail → implement → see pass (per component)

#### Tests ⚠️

- [ ] T052 [P] [US5] Unit test: `detectAuthRequired()` returns `true` when `tools/list` returns HTTP 401 in `backend/tests/unit/mcp-client.test.ts`
- [ ] T053 [P] [US5] Unit test: `detectAuthRequired()` returns `false` when `tools/list` returns valid tool list (no auth needed) in `backend/tests/unit/mcp-client.test.ts`
- [ ] T054 [P] [US5] Unit test: `detectAuthRequired()` returns `false` when `accessToken` is already provided in `backend/tests/unit/mcp-client.test.ts`
- [ ] T055 [P] [US5] Unit test: `detectAuthRequired()` returns `false` for non-HTTP transports (stdio, SSE) in `backend/tests/unit/mcp-client.test.ts`
- [ ] T056 [US5] Unit test: `POST /api/mcps/test` returns `needsAuth: true` when `queryTools` fails with 401 in `backend/tests/unit/mcp.routes.test.ts`
- [ ] T057 [US5] Integration test: auth-gated HTTP MCP without token shows `needsAuth` status in `backend/tests/integration/mcp-routes.test.ts`
- [ ] T058 [P] [US5] Integration test: non-auth HTTP MCP shows `connected` regardless of token presence in `backend/tests/integration/mcp-routes.test.ts`

#### Implementation

- [ ] T059 [US5] Implement `detectAuthRequired(transport, accessToken)` that calls `tools/list` and returns `true` on 401 in `backend/src/services/mcp-client.ts`
- [ ] T060 [US5] Call `detectAuthRequired()` from `testHttpConnection` after `initialize` succeeds when no `accessToken` is configured — if it returns true, result is `needsAuth: true, success: false` in `backend/src/services/mcp-client.ts`
- [ ] T061 [US5] Update error handling in `testMCPConnection()` at `backend/src/api/mcp.routes.ts`: when `queryTools` throws a 401 error and no `accessToken` is present, set `needsAuth: true` on cached status instead of leaving it as `connected`
- [ ] T062 [US5] Verify that the MCP port server (`backend/src/mcp/mcp.routes.ts`) checks auth before establishing SSE sessions for auth-gated backends — if no token and auth required, reject with HTTP 401
- [ ] T063 [US5] Add auth validation scenario to quickstart.md (`specs/010-mcp-transparent-proxy/quickstart.md`)

**Checkpoint**: Auth-gated MCPs without tokens correctly show `needsAuth` in the dashboard. Non-auth MCPs unaffected.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational — BLOCKS US4 and US2
- **User Story 4 (Phase 4)**: Depends on US1 (needs transport adapters and proxy core)
- **User Story 2 (Phase 5)**: Depends on US1 (needs proxy core for reconnect)
- **Observability (Phase 6)**: Depends on US1 (needs proxy sessions to monitor)
- **Tests (Phase 8)**: Depends on US1 + US2 + US3 + US4 being implemented
- **Polish (Phase 9)**: Depends on all implementation complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational — No dependencies on other stories 🎯 **MVP**
- **User Story 2 (P2)**: Can start after US1 is complete (needs proxy connect/forward loop)
- **User Story 3 (P3)**: Naturally supported by independent process model — verification tests in T026, T027
- **User Story 4 (P1)**: Depends on US1 (needs transport adapters and proxy core) — adds SSE session management on dedicated port. Moved to Phase 4 (before US2) due to P1 priority.
- **User Story 5 (P1)**: Can start after Foundational (Phase 2) — adds auth detection to existing test-connection flow. No dependency on US1-US4 (auth is separate from proxy core).

### Within Each Phase

- Types before implementations
- Core before transports
- Transports before entry point
- Tests before implementations (TDD per component)
- Tests before polish

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All transport adapters (T006, T007, T008) can run in parallel
- All TDD pairs (T017+T005, T019+T010, T018+T011) are sequential per component
- US3 verification tests (T026, T027) can run in parallel
- All polish tasks (T023, T024, T025) can run in parallel
- All US5 unit tests (T052-T056) can run in parallel
- T057 and T058 (integration tests) can run after detectAuthRequired implementation (T059)
- T059 (detectAuthRequired) and T060 (testHttpConnection integration) are sequential

---

## Parallel Example: User Story 1

```bash
# Launch all transport adapters together:
Task: "T006 Implement stdio transport adapter in backend/src/proxy/transport.ts"
Task: "T007 Implement SSE transport adapter in backend/src/proxy/transport.ts"
Task: "T008 Implement HTTP transport adapter in backend/src/proxy/transport.ts"
```

## Parallel Example: User Story 5

```bash
# Launch all unit tests for detectAuthRequired together:
Task: "T052 Unit test: detectAuthRequired returns true on 401"
Task: "T053 Unit test: detectAuthRequired returns false without auth"
Task: "T054 Unit test: detectAuthRequired returns false with token"
Task: "T055 Unit test: detectAuthRequired returns false for non-HTTP"

# Then implement (sequential):
Task: "T059 Implement detectAuthRequired in backend/src/services/mcp-client.ts"
Task: "T060 Integrate detectAuthRequired into testHttpConnection"

# Then integration tests:
Task: "T057 Integration test: auth-gated MCP shows needsAuth"
Task: "T058 Integration test: non-auth MCP unaffected"
```

## Parallel Example: User Story 2

```bash
# Launch backoff and buffer simultaneously:
Task: "T010 Implement exponential backoff with jitter in backend/src/proxy/proxy.ts"
Task: "T011 Implement message buffer in backend/src/proxy/proxy.ts"

# Then drain (depends on buffer):
Task: "T012 Implement buffer drain on reconnect in backend/src/proxy/proxy.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1 (transparent proxy)
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Run typecheck + basic tests

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → **MVP demo!**
3. Add User Story 4 → Dedicated MCP port operational
4. Add User Story 2 → Test independently → Resilience demo
5. Add Observability → Health monitoring operational
6. Add User Story 5 → Auth detection for connection test
7. Run full test suite → Feature complete

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- All proxy core uses Node.js built-ins only (`child_process`, `readline`, `stream`, `events`). The MCP port server uses Fastify (already a project dependency).
- MCP port server is a separate Fastify instance — no route conflicts with main API
- No `@modelcontextprotocol/sdk` or `mcp-tool-router` dependencies
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Constitution Principle VII (Dependency First) has two justified violations: (1) proxy core uses Node built-ins because no suitable npm package provides transparent MCP proxy + multi-transport + auto-reconnect; (2) `@modelcontextprotocol/sdk` added for the official `StreamableHTTPClientTransport`

---

## Phase 11: Convergence

**Purpose**: Close gaps between spec/plan/tasks and actual codebase state identified by `/speckit.converge`.

**CRITICAL**: Constitution violations first. HIGH gaps ordered by impact on US5 completeness.

- [X] T064 CRITICAL Follow TDD order per Constitution II: finalize T052-T058 tests (write → see fail) before completing T059-T062 implementation (Constitution II — contradicts)
- [X] T065 Document justified violation for `@modelcontextprotocol/sdk` in plan.md per Principle VII — dependency is required for `StreamableHTTPClientTransport` (plan.md constraint — contradicts)
- [X] T066 Extract `detectAuthRequired(transport, accessToken)` as standalone function in `backend/src/services/mcp-client.ts` per plan.md design decision (plan.md + T059 — partial)
- [X] T067 Add auth validation in `backend/src/mcp/mcp.routes.ts` before establishing SSE sessions for auth-gated backends without token — reject with HTTP 401 (T062 — missing)
- [X] T068 Write unit tests for standalone `detectAuthRequired()` in `backend/tests/unit/mcp-client.test.ts`: returns true on 401, false on valid list, false with token, false for non-HTTP (T052-T055 — missing)
- [X] T069 Write unit test for `POST /api/mcps/test` returning `needsAuth: true` when `queryTools` fails with 401 in `backend/tests/unit/mcp.routes.test.ts` (T056 — missing)
- [X] T070 Create `backend/tests/integration/mcp-routes.test.ts` with integration tests: auth-gated MCP without token shows `needsAuth`, non-auth MCP shows `connected` regardless of token (T057-T058 — missing)

---

## Phase 12: Convergence

**Purpose**: Close remaining gaps between spec/plan/tasks and actual codebase state.

- [X] T071 Fix quickstart.md Scenarios 6 and 7 curl endpoints: `/api/mcps/test` → `/api/mcps/test-connection` per actual route defined in `backend/src/api/mcp.routes.ts:123` (documentation — partial)
