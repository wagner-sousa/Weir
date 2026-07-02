# Feature Specification: Transparent MCP Proxy

**Feature Branch**: `010-mcp-transparent-proxy`

**Created**: 2026-06-26

**Status**: Draft

**Input**: User description from speckit.specify.args.md

## Clarifications

### Session 2026-06-30

- Q: CLI flag e remocao do endpoint antigo → A: CLI muda de `--proxy` para `--mcp` com argumento obrigatorio. Remove `POST /api/proxy/:name`. Porta 4000 com `GET /mcp/<name>` (SSE) e `POST /mcp/<name>/message`.

## User Scenarios & Testing

### User Story 1 - Agent Connects to MCP Through Proxy (Priority: P1)

An AI agent (e.g., Claude, Cline) needs to interact with an MCP backend (e.g., a database, a file system). Instead of configuring a direct connection, the agent's `.mcp.json` points to `weir --mcp <name>`. The agent sends a `tools/list` request and receives the backend's tool list as if connected directly.

**Why this priority**: This is the core value proposition — if the agent cannot connect transparently through Weir, the feature has no purpose.

**Independent Test**: A test agent configured with `weir --mcp test-db` can list tools and call a tool, receiving the same results as a direct connection to the same backend.

**Acceptance Scenarios**:

1. **Given** a running MCP backend, **When** an agent connects via `weir --mcp <name>`, **Then** the agent receives the backend's tool list
2. **Given** an agent connected via Weir proxy, **When** it calls a tool with valid arguments, **Then** the tool executes on the backend and returns the result to the agent
3. **Given** an agent connected via Weir proxy, **When** it calls a tool with invalid arguments, **Then** the error response from the backend is returned to the agent unchanged

---

### User Story 2 - Backend Disconnects and Reconnects (Priority: P2)

The MCP backend crashes unexpectedly. The agent sends a tool call but does not receive a response. Weir detects the disconnection, buffers the message, and begins reconnecting with exponential backoff. When the backend comes back online, Weir drains the buffer and the agent's tool call completes successfully.

**Why this priority**: Auto-reconnect is a key differentiator — it makes the proxy resilient without agent awareness. P2 because the happy path (U1) must work first.

**Independent Test**: A test backend is configured to crash after receiving one request. Weir reconnects, the agent retries, and the second request succeeds.

**Acceptance Scenarios**:

1. **Given** an agent connected via Weir proxy, **When** the backend disconnects, **Then** Weir detects the disconnection within 5 seconds
2. **Given** a disconnected backend, **When** Weir attempts reconnection, **Then** delays increase progressively (first retry within 1-2s, subsequent retries with growing delays up to 30s max)
3. **Given** a disconnected backend with buffered messages, **When** the backend reconnects, **Then** buffered messages are delivered in order
4. **Given** a backend that stays offline, **When** max retries are exceeded, **Then** Weir closes the proxy with an error message to the agent

---

### User Story 3 - Multiple Agents Connect to Same Backend (Priority: P3)

Two different AI agents (e.g., Claude and Cline) both need to access the same PostgreSQL MCP backend. Each agent runs its own `weir --mcp postgres-db` session. Both agents can list tools and call tools independently without interfering with each other.

**Why this priority**: Multi-agent concurrency is important for team workflows but is a refinement on the basic proxy capability.

**Independent Test**: Two processes run `weir --mcp postgres-db` simultaneously. Each lists tools and calls a tool. Both receive correct results.

**Acceptance Scenarios**:

1. **Given** two agent sessions proxying the same backend, **When** both list tools simultaneously, **Then** both receive identical tool lists
2. **Given** two agent sessions proxying the same backend, **When** one agent calls a read tool and the other calls a write tool, **Then** both operations complete correctly

---

### User Story 4 - Agent Connects via SSE on Dedicated MCP Port (Priority: P1)

An AI agent (e.g., Cline, Claude Desktop) connects to an MCP backend via HTTP/SSE instead of spawning a subprocess. The agent opens an SSE stream at `http://<weir-host>:4000/mcp/<name>` and sends JSON-RPC messages via `POST /mcp/<name>/message`. Weir runs a dedicated HTTP server on port 4000, isolated from the main API (port 3000), solely for MCP proxy connections.

**Why this priority**: Many agent tools support URL-based MCP connections natively but cannot run custom CLI commands. A dedicated port at `/mcp/<name>` enables these tools without interfering with the main API. This replaces the old `POST /api/proxy/<name>` stateless endpoint.

**Independent Test**: An agent configured with `http://localhost:4000/mcp/Bitbucket` as its MCP server URL can list tools and call a tool, receiving the same results as `weir --mcp Bitbucket`.

**Acceptance Scenarios**:

1. **Given** a running Weir server with MCP port enabled, **When** an agent opens `GET /mcp/<name>` on port 4000 as an SSE stream, **Then** Weir sends an `endpoint` event with the message POST URL
2. **Given** an open SSE stream on `/mcp/<name>`, **When** the agent sends a JSON-RPC message via `POST /mcp/<name>/message`, **Then** the response is delivered through the SSE stream
3. **Given** an open SSE stream on `/mcp/<name>`, **When** the agent sends `tools/list`, **Then** the response contains the backend's tool list
4. **Given** an open SSE stream with an unreachable backend, **When** the agent connects, **Then** Weir sends an error event and closes the stream
5. **Given** a running Weir server, **When** a client sends `GET /mcp/<nonexistent>` on port 4000, **Then** the server returns HTTP 404

---

### User Story 5 - Auth-Gated MCP Shows Correct Status on Connection Test (Priority: P1)

An administrator configures an auth-gated HTTP MCP (requiring OAuth2/Bearer token) via the dashboard. The system tests the connection but, because no access token is configured, the test returns `success` (green check) from the `initialize` handshake, even though the MCP is not usable. The administrator is misled into thinking the MCP is fully operational.

Instead, the test-connection flow MUST first detect whether the MCP requires authentication. If auth is required and no valid token is present, the test MUST return `status: "needsAuth"` (warning icon) instead of `status: "connected"` (green check). The card must display the needs-auth state and provide a path to authenticate (OAuth button).

**Why this priority**: This is a correctness bug — the dashboard shows a green check for an inoperative MCP, misleading the user. It undermines trust in the system.

**Independent Test**: Configure an auth-gated HTTP MCP (e.g., Postman) without providing an access token. Run test-connection. Verify the card shows "needs-authentication" status (warning icon), not green check.

**Acceptance Scenarios**:

1. **Given** an auth-gated HTTP MCP with no access token configured, **When** the user clicks "Test Connection", **Then** the result status is `needsAuth` (not `connected`) and the card displays the warning icon
2. **Given** the same MCP, **When** the card shows `needsAuth` status, **Then** it also shows the OAuth authenticate button/link so the user can authorize
3. **Given** the same MCP, **When** the user completes OAuth authorization and re-tests, **Then** the status becomes `connected` with a green check
4. **Given** an HTTP MCP that does NOT require authentication, **When** the user tests connection, **Then** the status is `connected` (green check) regardless of whether a token is present

---

### Edge Cases

- What happens when the agent disconnects while the backend is reconnecting? Weir should clean up the proxy session gracefully.
- How does the proxy handle a backend that sends malformed JSON-RPC responses? Malformed messages should be logged and forwarded if possible.
- What happens when the message buffer exceeds its limit? Oldest buffered messages are dropped with a warning.
- How does the proxy behave when the backend URL is unreachable from the start? It should report a clear connection error immediately.
- What happens during simultaneous shutdown of agent and backend? Weir should handle partial shutdown without hanging.
- How does the dedicated MCP port interact with the main API port? They run on separate ports independently — no shared routes or state.
- What happens when the agent closes the SSE connection? The proxy session should clean up the backend transport.
- How does the SSE endpoint handle backpressure from slow consumers? The proxy should buffer responses up to a configurable limit.
- What happens if the MCP port is not configured (disabled)? The main API should still work normally, and `weir --mcp` CLI should still function.
- What happens when an auth-gated HTTP MCP responds with 401 to `initialize` (not just `tools/list`)? The system should treat this as `needsAuth` regardless of when the 401 occurs.
- How does the system handle an OAuth token that has expired? Token expiration should be detected and the status should revert to `needsAuth`.
- What happens if `testConnection` is called via the API (`POST /api/mcps/test`) for an auth-gated MCP without a token? The API route must also return `needsAuth`, not `connected`.
- How does the MCP port (4000) respond when an agent connects to an auth-gated MCP with no token? The SSE stream should send a `needsAuth` event or return an appropriate error.

## Requirements

### Functional Requirements

- **FR-001**: Agent MUST be able to establish a transparent proxy session via `weir --mcp <name>`, where `<name>` is an MCP defined in `.mcp.json`
- **FR-002**: All JSON-RPC messages from agent to backend MUST be forwarded bidirectionally through the proxy without modification to message content
- **FR-003**: Proxy MUST detect when the backend disconnects (process exit, socket close, SSE stream end)
- **FR-004**: Proxy MUST attempt reconnection with exponential backoff: first attempt within 1-2 seconds, doubling each attempt, capped at 30 seconds maximum interval
- **FR-005**: Messages received from the agent during a disconnection MUST be buffered in FIFO order up to a configurable limit
- **FR-006**: Multiple concurrent proxy instances MUST be able to connect to the same MCP backend simultaneously
- **FR-007**: Proxy MUST support three backend transport types: stdio (child process), SSE (Server-Sent Events), and HTTP (REST-like requests)
- **FR-008**: When running in server mode (integrated with Fastify), the proxy SHOULD report periodic health status (connected, reconnecting, error, closed) via the Weir WebSocket interface. In standalone `--mcp` mode, health status is reported via stderr logs.
- **FR-009**: Proxy MUST perform graceful shutdown on SIGTERM/SIGINT: drain in-flight messages, close backend connection, notify agent
- **FR-010**: Agent MUST NOT be able to detect that Weir is proxying the connection — the transport interface to the agent MUST appear identical to a direct connection
- **FR-011**: Weir MUST expose a dedicated HTTP server on port 4000 for MCP proxy connections via SSE, isolated from the main API server on port 3000
- **FR-012**: The dedicated server MUST expose `GET /mcp/<name>` as an SSE (Server-Sent Events) endpoint that maintains a persistent connection for JSON-RPC streaming
- **FR-013**: The SSE endpoint MUST immediately send an `endpoint` event containing the message POST URL on successful connection
- **FR-014**: The dedicated server MUST expose `POST /mcp/<name>/message` for agents to send JSON-RPC messages to the active session
- **FR-015**: Each SSE session MUST create an independent proxy session with its own backend transport, message buffer, and reconnection state
- **FR-016**: `GET /mcp/<name>` for a non-existent MCP MUST return HTTP 404
- **FR-017**: The SSE stream MUST send status events (`connected`, `reconnecting`, `error`, `closed`) as the proxy session state changes
- **FR-018**: The SSE stream MUST clean up the proxy session when the agent disconnects (socket close)
- **FR-019**: The dedicated MCP port MUST be configurable via `WEIR_MCP_PORT` environment variable (default 4000); setting it to `0` or leaving it unset MUST start the main API only, without the dedicated server
- **FR-020**: The connection test flow MUST first determine whether the MCP requires authentication (OAuth2/Bearer token); if `initialize` responds with a 401 or an auth challenge, the flow MUST NOT report `connected`
- **FR-021**: When an auth-gated HTTP MCP has no valid access token, `testConnection` MUST return `status: "needsAuth"` and `needsAuth: true`, not `status: "connected"`
- **FR-022**: The dashboard card MUST display the `needsAuth` status with a warning icon (not a green check) when the MCP requires authentication but no token is available
- **FR-023**: When the card shows `needsAuth` status and an `authUrl` is available, the card MUST display an authenticate button/link to initiate OAuth
- **FR-024**: The auth detection logic MUST apply to all test-connection call sites: `POST /api/mcps/test`, `POST /api/mcps` (save-and-test), and the periodic SSE polling refresh
- **FR-025**: The cached MCP status MUST preserve the `needsAuth` flag so that after a page refresh or server restart, the card still shows the correct state

### Key Entities

- **Proxy Session**: A single agent-to-backend connection managed by Weir. Has state (CONNECTING, CONNECTED, RECONNECTING, BUFFERING, DRAINING, CLOSED).
- **MCP Backend**: The real MCP server (database, filesystem, etc.) that the agent needs to interact with. Can be stdio, SSE, or HTTP.
- **Message Buffer**: FIFO queue of JSON-RPC messages accumulated during backend disconnection. Configurable maximum size.
- **Transport Adapter**: Interface that translates between the agent's transport (stdio or SSE) and the backend's native transport (stdio, SSE, or HTTP).
- **MCP Port Server**: A separate HTTP server instance listening on port 4000 (configurable), serving only `/mcp/<name>` SSE endpoints, isolated from the main API.
- **SSE Session**: A persistent HTTP connection between an agent and Weir over Server-Sent Events, representing one MCP proxy session.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Agent can list tools and call tools through the proxy with identical results to a direct connection (verified by diffing responses)
- **SC-002**: After backend crash and recovery, agent resumes normal operation within 35 seconds (30s max backoff + reconnect time)
- **SC-003**: Two agents simultaneously connected to the same backend can both list tools and call tools without interference
- **SC-004**: Proxy works with all three backend transport types (stdio, SSE, HTTP)
- **SC-005**: Agent connection setup through proxy completes in under 2 seconds of wall-clock time
- **SC-006**: Buffered messages (up to 100) are delivered in order after backend reconnection
- **SC-007**: An agent can connect to any configured MCP backend via `http://localhost:4000/mcp/<name>` and receive tool lists and call results
- **SC-008**: Multiple SSE sessions (up to 10) can run concurrently on port 4000 without failures
- **SC-009**: The main API continues to serve all existing routes on port 3000 without interference from the MCP port server
- **SC-010**: An auth-gated HTTP MCP without a token shows `needsAuth` status (warning icon) in the dashboard instead of a green check — verifiable by running test-connection on Postman (or equivalent) without a token and observing the card status
- **SC-011**: After OAuth authorization, the same MCP shows `connected` status (green check) — verifiable by completing the OAuth flow and re-testing
- **SC-012**: A non-auth HTTP MCP continues to show `connected` regardless of whether a token is present — verifiable by testing a local HTTP MCP with and without a dummy token
- **SC-013**: The `needsAuth` status persists across page refreshes (no flicker to `connected`) — verifiable by refreshing the dashboard after the status is established

## Assumptions

- The agent communicates with Weir via stdio transport (`weir --mcp <name>`) OR via HTTP SSE (`GET /mcp/<name>` on port 4000) depending on the integration method
- SSE proxy sessions are stateful — each session maintains a persistent connection to the backend with its own transport, buffer, and state machine
- The dedicated MCP port does not need TLS/HTTPS in the first iteration (can be added later or handled by a reverse proxy)
- The `.mcp.json` configuration for MCPs already exists and contains the necessary connection parameters (command, args, URL, etc.)
- Backend disconnection is detectable via process exit code, socket close event, or SSE stream end — no out-of-band health check protocol is needed
- The backend is expected to eventually recover within a reasonable timeframe (hours, not days) — infinite reconnection attempts are allowed with user-configurable cap
- Multiple agents connecting to the same backend do not share proxy state — each proxy instance is independent
- Network latency between agent and Weir is negligible (same machine or same container)
- The auth detection applies to HTTP transport only (stdio and SSE transports have no auth-token concept in the same way)
- The MCP server responds to `initialize` with a 401 status when authentication is required; if the server responds with 200 to `initialize` but 401 only to `tools/list`, the initial `tools/list` response will catch the auth requirement
- The existing OAuth infrastructure (auth.routes.ts, auth-storage.ts) is correct and does not need modification — only the test-connection flow ordering needs adjustment
