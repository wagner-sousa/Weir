# Feature Specification: Transparent MCP Proxy

**Feature Branch**: `010-mcp-transparent-proxy`

**Created**: 2026-06-26

**Status**: Draft

**Input**: User description from speckit.specify.args.md

## User Scenarios & Testing

### User Story 1 - Agent Connects to MCP Through Proxy (Priority: P1)

An AI agent (e.g., Claude, Cline) needs to interact with an MCP backend (e.g., a database, a file system). Instead of configuring a direct connection, the agent's `.mcp.json` points to `weir --proxy <name>`. The agent sends a `tools/list` request and receives the backend's tool list as if connected directly.

**Why this priority**: This is the core value proposition — if the agent cannot connect transparently through Weir, the feature has no purpose.

**Independent Test**: A test agent configured with `weir --proxy test-db` can list tools and call a tool, receiving the same results as a direct connection to the same backend.

**Acceptance Scenarios**:

1. **Given** a running MCP backend, **When** an agent connects via `weir --proxy <name>`, **Then** the agent receives the backend's tool list
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

Two different AI agents (e.g., Claude and Cline) both need to access the same PostgreSQL MCP backend. Each agent runs its own `weir --proxy postgres-db` session. Both agents can list tools and call tools independently without interfering with each other.

**Why this priority**: Multi-agent concurrency is important for team workflows but is a refinement on the basic proxy capability.

**Independent Test**: Two processes run `weir --proxy postgres-db` simultaneously. Each lists tools and calls a tool. Both receive correct results.

**Acceptance Scenarios**:

1. **Given** two agent sessions proxying the same backend, **When** both list tools simultaneously, **Then** both receive identical tool lists
2. **Given** two agent sessions proxying the same backend, **When** one agent calls a read tool and the other calls a write tool, **Then** both operations complete correctly

---

### User Story 4 - Application Connects to MCP via HTTP Endpoint (Priority: P1)

An external application (e.g., a web service, a script, another microservice) needs to interact with an MCP backend without spawning a child process. Instead of using `weir --proxy <name>` via CLI, the application sends HTTP POST requests to `http://<weir-host>/api/proxy/<name>`, where `<name>` is the MCP server key defined in `.mcp.json`. The request body is a JSON-RPC 2.0 message, and the response contains the JSON-RPC result.

The proxy endpoint:
- Reads the MCP backend config from `.mcp.json` using the `<name>` path segment
- Establishes a connection to the backend (stdio, SSE, or HTTP)
- Forwards the JSON-RPC message
- Returns the backend's JSON-RPC response as the HTTP response
- Closes the connection after responding (stateless per request)

**Why this priority**: This enables non-CLI integrations — web apps, REST clients, and external services to use MCP tools via standard HTTP without being tied to Node.js child process model.

**Independent Test**: A `curl POST http://localhost:3000/api/proxy/test-db` with a valid JSON-RPC body returns the same result as a direct connection to the backend via `weir --proxy test-db`.

**Acceptance Scenarios**:

1. **Given** a running Weir server, **When** a client sends `POST /api/proxy/<name>` with a valid JSON-RPC body, **Then** the response contains the backend's JSON-RPC response
2. **Given** a running Weir server, **When** a client sends `POST /api/proxy/<name>` with an invalid JSON-RPC body, **Then** the server returns HTTP 400 with an error description
3. **Given** a running Weir server, **When** a client sends `POST /api/proxy/<nonexistent>`, **Then** the server returns HTTP 404 with message "MCP '<name>' not found"
4. **Given** a running Weir server with an unreachable backend, **When** a client sends `POST /api/proxy/<name>`, **Then** the server returns HTTP 502 with a connection error message
5. **Given** a running Weir server, **When** a client sends `GET /api/proxy` or any non-POST method, **Then** the server returns HTTP 405 Method Not Allowed

---

### Edge Cases

- What happens when the agent disconnects while the backend is reconnecting? Weir should clean up the proxy session gracefully.
- How does the proxy handle a backend that sends malformed JSON-RPC responses? Malformed messages should be logged and forwarded if possible.
- What happens when the message buffer exceeds its limit? Oldest buffered messages are dropped with a warning.
- How does the proxy behave when the backend URL is unreachable from the start? It should report a clear connection error immediately.
- What happens during simultaneous shutdown of agent and backend? Weir should handle partial shutdown without hanging.
- How does the HTTP endpoint behave under concurrent requests to the same backend? Each request opens an independent connection — no shared state.
- What happens when the HTTP request body exceeds a reasonable size (e.g., > 1MB)? Server should return HTTP 413 Payload Too Large.
- How does the HTTP endpoint handle backends that take longer than the HTTP timeout? The endpoint should use a configurable timeout consistent with backend expectations.

## Requirements

### Functional Requirements

- **FR-001**: Agent MUST be able to establish a transparent proxy session via `weir --proxy <name>`, where `<name>` is an MCP defined in `.mcp.json`
- **FR-002**: All JSON-RPC messages from agent to backend MUST be forwarded bidirectionally through the proxy without modification to message content
- **FR-003**: Proxy MUST detect when the backend disconnects (process exit, socket close, SSE stream end)
- **FR-004**: Proxy MUST attempt reconnection with exponential backoff: first attempt within 1-2 seconds, doubling each attempt, capped at 30 seconds maximum interval
- **FR-005**: Messages received from the agent during a disconnection MUST be buffered in FIFO order up to a configurable limit
- **FR-006**: Multiple concurrent proxy instances MUST be able to connect to the same MCP backend simultaneously
- **FR-007**: Proxy MUST support three backend transport types: stdio (child process), SSE (Server-Sent Events), and HTTP (REST-like requests)
- **FR-008**: When running in server mode (integrated with Fastify), the proxy SHOULD report periodic health status (connected, reconnecting, error, closed) via the Weir WebSocket interface. In standalone `--proxy` mode, health status is reported via stderr logs.
- **FR-009**: Proxy MUST perform graceful shutdown on SIGTERM/SIGINT: drain in-flight messages, close backend connection, notify agent
- **FR-010**: Agent MUST NOT be able to detect that Weir is proxying the connection — the transport interface to the agent MUST appear identical to a direct connection
- **FR-011**: The Weir web server MUST expose an HTTP endpoint `POST /api/proxy/<name>` where `<name>` is an MCP server key defined in `.mcp.json`
- **FR-012**: The HTTP endpoint MUST accept a JSON-RPC 2.0 request body and return the backend's JSON-RPC response in the HTTP response body
- **FR-013**: The HTTP endpoint MUST return HTTP 404 with descriptive message when `<name>` does not exist in `.mcp.json`
- **FR-014**: The HTTP endpoint MUST return HTTP 400 when the request body is not valid JSON-RPC 2.0
- **FR-015**: The HTTP endpoint MUST return HTTP 502 when the backend connection fails or returns an error
- **FR-016**: The HTTP endpoint MUST return HTTP 405 for any HTTP method other than POST
- **FR-017**: *(Coberto por FR-007 e FR-011 — o HTTP endpoint usa o mesmo core de transportes do proxy CLI)*
- **FR-018**: The HTTP endpoint MUST reject request bodies larger than 1 MB with HTTP 413 Payload Too Large
- **FR-019**: The HTTP endpoint MUST enforce a configurable timeout for backend requests (default 30s), returning HTTP 504 Gateway Timeout on expiry

### Key Entities

- **Proxy Session**: A single agent-to-backend connection managed by Weir. Has state (CONNECTING, CONNECTED, RECONNECTING, BUFFERING, DRAINING, CLOSED).
- **MCP Backend**: The real MCP server (database, filesystem, etc.) that the agent needs to interact with. Can be stdio, SSE, or HTTP.
- **Message Buffer**: FIFO queue of JSON-RPC messages accumulated during backend disconnection. Configurable maximum size.
- **Transport Adapter**: Interface that translates between the agent's stdio transport and the backend's native transport (stdio, SSE, or HTTP).
- **HTTP Proxy Route**: A REST endpoint at `/api/proxy/<name>` that bridges HTTP requests to MCP backend connections. Each request is independent and stateless.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Agent can list tools and call tools through the proxy with identical results to a direct connection (verified by diffing responses)
- **SC-002**: After backend crash and recovery, agent resumes normal operation within 35 seconds (30s max backoff + reconnect time)
- **SC-003**: Two agents simultaneously connected to the same backend can both list tools and call tools without interference
- **SC-004**: Proxy works with all three backend transport types (stdio, SSE, HTTP)
- **SC-005**: Agent connection setup through proxy completes in under 2 seconds of wall-clock time
- **SC-006**: Buffered messages (up to 100) are delivered in order after backend reconnection
- **SC-007**: A client can send a JSON-RPC request via `POST /api/proxy/<name>` and receive the correct response in under 5 seconds (including backend connection time)
- **SC-008**: The HTTP endpoint correctly returns HTTP 404, 400, 502, and 405 for their respective error conditions
- **SC-009**: The HTTP endpoint works with all three backend transport types (stdio, SSE, HTTP)

## Assumptions

- The agent communicates with Weir via stdio transport (`weir --proxy <name>`) OR via HTTP (`POST /api/proxy/<name>`) depending on the integration method
- HTTP proxy requests are stateless — each request creates a fresh connection to the backend, forwards one message, and returns the response
- The `.mcp.json` configuration for MCPs already exists and contains the necessary connection parameters (command, args, URL, etc.)
- Backend disconnection is detectable via process exit code, socket close event, or SSE stream end — no out-of-band health check protocol is needed
- The backend is expected to eventually recover within a reasonable timeframe (hours, not days) — infinite reconnection attempts are allowed with user-configurable cap
- Multiple agents connecting to the same backend do not share proxy state — each proxy instance is independent
- Network latency between agent and Weir is negligible (same machine or same container)
