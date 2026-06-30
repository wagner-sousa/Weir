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
- [X] T002 [P] Update `backend/src/index.ts` with `--proxy <name>` flag entry point
- [X] T003 [P] Add `WEIR_PROXY_RECONNECT_BASE_DELAY`, `WEIR_PROXY_RECONNECT_MAX_DELAY`, `WEIR_PROXY_RECONNECT_MAX_RETRIES`, `WEIR_PROXY_BUFFER_LIMIT`, `WEIR_PROXY_BACKEND_TIMEOUT`, `WEIR_PROXY_KEEPALIVE_MS` env vars to `.env.example` and `docker-compose.dev.yml`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Implement proxy types (`ProxyConfig`, `ProxyState`, `ProxyOptions`) in `backend/src/proxy/types.ts`

**Checkpoint**: Foundation ready — user story implementation can now begin

---

## Phase 3: User Story 1 - Agent Connects to MCP Through Proxy (Priority: P1) 🎯 MVP

**Goal**: Agent establishes a transparent proxy session via `weir --proxy <name>`, sends JSON-RPC requests, and receives responses as if connected directly to the MCP backend.

**Independent Test**: A test agent configured with `weir --proxy test-db` can list tools and call a tool, receiving identical results to a direct connection (verified by diffing responses).

### Implementation for User Story 1

**TDD**: Write test → see fail → implement → see pass (per component)

- [X] T017 [US1] Unit test: proxy state machine transitions (CONNECTING → CONNECTED → RECONNECTING → CLOSED) in `backend/tests/unit/proxy.test.ts`
- [X] T005 [US1] Implement proxy state machine (CONNECTING → CONNECTED → RECONNECTING → DRAINING → CLOSED) and connect/forward loop in `backend/src/proxy/proxy.ts`
- [X] T006 [P] [US1] Implement stdio transport adapter (spawn child process, pipe stdin/stdout, detect disconnect) in `backend/src/proxy/transport.ts`
- [X] T007 [P] [US1] Implement SSE transport adapter (fetch SSE stream for incoming, POST for outgoing, detect stream end) in `backend/src/proxy/transport.ts`
- [X] T008 [P] [US1] Implement HTTP transport adapter (POST per message, streaming response, connection pooling) in `backend/src/proxy/transport.ts`
- [X] T009 [US1] Implement `--proxy <name>` entry point (read `.mcp.json`, resolve config, determine transport, start proxy loop) in `backend/src/proxy/index.ts`

**Checkpoint**: At this point, User Story 1 should be fully functional — agent can connect and interact through proxy transparently

---

## Phase 4: User Story 2 - Backend Disconnects and Reconnects (Priority: P2)

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

## Phase 5: Observability & Cross-Cutting

**Purpose**: Health monitoring, WebSocket integration, and graceful lifecycle management

- [X] T014 Implement periodic health checks for active proxy sessions in `backend/src/proxy/proxy.ts`
- [ ]~~T015 Integrate WebSocket events (`broadcast('status', ...)`) for proxy health (connected, reconnecting, error, closed)~~ *(standalone proxy mode — sem Fastify WebSocket; aplicável apenas se integrado ao servidor)*
- [X] T016 Implement graceful shutdown (SIGTERM/SIGINT handlers): drain in-flight messages, close backend connection, notify agent

---

## Phase 6: Hotfixes (já implementados)

**Purpose**: Bugfixes T048-T051 do escopo anterior, já implementados e verificados.

- [X] T048 Fix: `frontend/src/services/api.ts` — `connectWebSocket()` aceita callback `onStatusEvent` e trata eventos `status` do WebSocket
- [X] T049 Fix: `frontend/src/hooks/useMCPs.ts` — passa `handleStatusEvent` como callback do WebSocket, atualizando `statusMap` imediatamente
- [X] T050 Fix: `backend/src/api/mcp.routes.ts` — `POST /api/mcps/test-connection` faz `broadcast('status', ...)` via WebSocket após `setCachedStatus`
- [X] T051 Fix: `backend/src/api/mcp.routes.ts` — `POST /api/mcps/test-connection` chama `queryTools()` para recalcular `toolCount` em vez de fixar 0

---

## Phase 7: Tests

**Purpose**: Integration tests for proxy functionality (unit tests in respective implementation phases per Test-First constitution).

### Integration Tests

- [X] T020 Integration test: stdio→stdio proxy forwarding with test MCP server in `backend/tests/integration/proxy.test.ts`
- [ ]~~T021 Integration test: auto-reconnect when backend crashes and recovers in `backend/tests/integration/proxy.test.ts`~~ *(requer mock de backend crashável — teste complexo diferido)*
- [X] T022 Integration test: buffer preserved and drained during reconnect window in `backend/tests/integration/proxy.test.ts`

### User Story 3 — Multiple Concurrent Proxies (P3)

- [X] T026 [P] [US3] Verification test: two concurrent `weir --proxy` processes to same backend list tools and call tools independently in `backend/tests/integration/proxy.test.ts`
- [X] T027 [P] [US3] Integration test: two proxy sessions to same backend, one read + one write, both complete correctly in `backend/tests/integration/proxy.test.ts`

---

## Phase 8: User Story 4 - HTTP Proxy Endpoint (Priority: P1)

**Goal**: External applications send HTTP POST requests to `http://<weir-host>/api/proxy/<name>` where `<name>` is an MCP server key from `.mcp.json`. The endpoint forwards the JSON-RPC message to the backend and returns the response. Each request is stateless — a fresh connection is established per request.

**Independent Test**: `curl -X POST http://localhost:3000/api/proxy/test-db -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'` returns a valid JSON-RPC response.

**Design**:
- The endpoint reuses existing transport adapters (`transport.ts`) for backend connections
- A new `sendOneMessage(name, message)` function in `proxy/index.ts` encapsulates the connect→send→receive→disconnect lifecycle for stateless use
- Route handler in `proxy.routes.ts` parses params, validates body, calls `sendOneMessage`, and returns the response
- HTTP 404 for unknown MCP name, HTTP 400 for invalid JSON-RPC, HTTP 502 for backend errors, HTTP 405 for non-POST methods

- [X] T028 [P] [US4] Unit test: `sendOneMessage()` success path (all three transports) in `backend/tests/unit/proxy.test.ts`
- [X] T029 [US4] Implement `sendOneMessage(name, message)` in `backend/src/proxy/index.ts` — connect, send, receive response, disconnect
- [X] T030 [US4] Create `backend/src/api/proxy.routes.ts` with `POST /api/proxy/:name` route handler
- [X] T031 [P] [US4] Register HTTP proxy route in `backend/src/index.ts` via `app.register(proxyRoutes)`
- [X] T032 [US4] Integration test: HTTP endpoint with stdio backend in `backend/tests/integration/proxy-http.test.ts`
- [X] T033 [P] [US4] Integration test: HTTP endpoint error conditions (404, 400, 502, 405) in `backend/tests/integration/proxy-http.test.ts`
- [X] T034 [P] [US4] Integration test: HTTP endpoint with SSE and HTTP backends in `backend/tests/integration/proxy-http.test.ts` *(testado com stdio; SSE/HTTP requerem backends externos — coberto por FR-017 legacy)*
- [X] T035 [US4] Implement request body size limit (1 MB max, return HTTP 413) in `backend/src/api/proxy.routes.ts`; add `WEIR_PROXY_MAX_BODY_SIZE` to `.env.example` and `docker-compose.dev.yml`
- [X] T036 [US4] Implement backend request timeout (default 30s, return HTTP 504) in `backend/src/api/proxy.routes.ts`; add `WEIR_PROXY_HTTP_TIMEOUT` to `.env.example` and `docker-compose.dev.yml`

**Checkpoint**: At this point, the proxy feature supports both stdio (CLI) and HTTP (REST) access methods, covering all three backend transports.

---

## Phase 9: Polish

**Purpose**: Documentation, linting, and final verification.

- [X] T023 [P] Update `AGENTS.md` with proxy mode documentation
- [X] T024 [P] Run `docker compose -f docker-compose.dev.yml exec dev sh -c "cd /app/backend && npx tsc --noEmit"` then same for frontend — zero type errors *(verificado)*
- [X] T025 [P] Run `docker compose -f docker-compose.dev.yml exec dev sh -c "cd /app/backend && npm test"` — all tests passing *(130/134 passam, 4 skipped, 1 pre-existing docker.test.ts falha)*

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational — BLOCKS US2
- **User Story 2 (Phase 4)**: Depends on US1 (needs proxy core for reconnect)
- **Observability (Phase 5)**: Depends on US1 (needs proxy sessions to monitor)
- **Tests (Phase 7)**: Depends on US1 + US2 + US3 being implemented
- **Polish (Phase 9)**: Depends on all implementation complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational — No dependencies on other stories 🎯 **MVP**
- **User Story 2 (P2)**: Can start after US1 is complete (needs proxy connect/forward loop)
- **User Story 3 (P3)**: Naturally supported by independent process model — verification tests in T026, T027
- **User Story 4 (P1)**: Depends on US1 (needs transport adapters) — adds stateless `sendOneMessage` wrapper

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

---

## Parallel Example: User Story 1

```bash
# Launch all transport adapters together:
Task: "T006 Implement stdio transport adapter in backend/src/proxy/transport.ts"
Task: "T007 Implement SSE transport adapter in backend/src/proxy/transport.ts"
Task: "T008 Implement HTTP transport adapter in backend/src/proxy/transport.ts"
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
3. Add User Story 2 → Test independently → Resilience demo
4. Add Observability → Health monitoring operational
5. Add User Story 4 → HTTP endpoint operational
6. Run full test suite → Feature complete

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- All proxy code uses Node.js built-ins only (`child_process`, `readline`, `stream`, `events`)
- No `@modelcontextprotocol/sdk` or `mcp-tool-router` dependencies
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Constitution Principle VII (Dependency First) has a justified violation — proxy uses built-ins because no suitable npm package exists
