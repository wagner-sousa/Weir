# Feature Specification: MCP Listing Performance

**Feature Branch**: `006-mcp-listing-performance`

**Created**: 2026-06-23

**Status**: Draft

**Input**: User description: "Notei que demora muito para atualizar a listagem de mcps quando cria, edita, ou quando autoriza o oAuth."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Fast Listing After Create (Priority: P1)

The user fills in a new MCP configuration in the Add MCP modal, clicks "Test Connection" (or "Save"), and the modal closes. The dashboard updates with the new MCP card visible in under 1 second after modal close, even when multiple MCPs are already configured. The user does not wait for connection tests on every existing MCP to see the updated list.

**Why this priority**: This is the primary pain point — after every MCP create, the user waits for all existing MCP connections to be re-tested before seeing the updated list.

**Independent Test**: Configure 5+ MCPs (including at least one HTTP MCP that returns 401), create a new MCP, close the modal, and measure the time until the new card appears in the grid.

**Acceptance Scenarios**:

1. **Given** the user has 5+ MCPs configured, **When** they create a new MCP and the modal closes, **Then** the new MCP card appears in the grid within 1 second.
2. **Given** the user has 5+ MCPs configured, **When** they edit an existing MCP and the modal closes, **Then** the updated card reflects the changes within 1 second.
3. **Given** the user has a mix of healthy, slow, and unreachable MCPs, **When** they create a new MCP, **Then** the listing update does not wait for the slow/unreachable MCPs.

---

### User Story 2 - Fast Listing After OAuth Authorization (Priority: P1)

The user clicks the shield icon on an MCP card, completes the OAuth2 authorization in the popup, and closes the popup. The card updates to show the authorized status within 1 second without re-testing all other MCP connections.

**Why this priority**: OAuth authorization is followed by an immediate full listing refresh, which is the most noticeable slow scenario since the user just completed an action on a single MCP.

**Independent Test**: Configure an HTTP MCP that requires OAuth2, complete the auth flow, and measure the time until the card status updates.

**Acceptance Scenarios**:

1. **Given** the user has 5+ MCPs configured, **When** they complete OAuth2 authorization for one MCP, **Then** the card updates to show the authorized status within 1 second.
2. **Given** the user has a slow/unreachable MCP, **When** they complete OAuth2 authorization for a different MCP, **Then** the card update is not delayed by the slow/unreachable MCP.

---

### User Story 3 - Page Load Shows Content Instantly (Priority: P2)

The user opens the dashboard for the first time or refreshes the page. The MCP cards appear immediately with their last-known status, and connection tests run in the background to update the status as results arrive.

**Why this priority**: First-time page load is the user's first impression. Waiting for all connection tests to complete before seeing any cards creates a poor experience.

**Independent Test**: Hard-refresh the dashboard page and measure the time until card content (names, transport types) appears versus the time until status icons update.

**Acceptance Scenarios**:

1. **Given** the user has MCPs configured, **When** the dashboard page loads, **Then** MCP cards appear within 1 second showing last-known status.
2. **Given** the cards appear with last-known status, **When** connection tests complete in the background, **Then** the card status updates automatically as each result arrives.
3. **Given** an MCP has never been tested (no cached status), **When** the page loads, **Then** the card shows a "testing..." indicator until the first test completes.

---

### User Story 4 - Dashboard Resists Slow/Unreachable MCPs (Priority: P2)

A user has an MCP that is unreachable (timeout) or very slow (e.g., an HTTP MCP behind a slow network). This MCP does not delay the display of other MCP cards or their status updates. Each MCP's status is independent.

**Why this priority**: A single problematic MCP should not degrade the experience for all other MCPs.

**Independent Test**: Configure an MCP that times out (points to a non-routable address), and verify that other MCPs update their status immediately.

**Acceptance Scenarios**:

1. **Given** the user has one MCP that consistently times out, **When** the dashboard loads, **Then** all other MCPs display their status without waiting for the timing-out MCP.
2. **Given** the user has one MCP that consistently times out, **When** a new MCP is created, **Then** the new MCP card appears without waiting for the timing-out MCP.
3. **Given** the SSE connection status stream is active, **When** one MCP is timing out, **Then** status updates for other MCPs arrive independently.

### Edge Cases

- What happens when there are no MCPs configured? → The dashboard shows an empty state immediately. No connection tests are performed.
- What happens when the `.mcp.json` file is malformed? → The listing returns an error message, no connection tests are attempted. The user is notified to fix the config file.
- What happens when a cached connection status is stale (e.g., an MCP went down since last test)? → The card shows the last-known status until the background test completes and updates it. The delay is at most the time of one test cycle.
- What happens when the user rapidly creates/deletes MCPs? → In-flight connection tests for removed MCPs are discarded. New creates appear immediately without waiting for unrelated test completions.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST return the MCP listing (names, transport types, configuration) without testing connections. Connection status and tool counts MUST NOT block the listing response.
- **FR-002**: The system MUST provide a separate mechanism to obtain connection status (health, tools) that does not block the initial listing display. Status updates MUST arrive asynchronously for each MCP independently.
- **FR-003**: Connection tests for different MCPs MUST be independent — a timeout or failure on one MCP MUST NOT delay status updates for other MCPs.
- **FR-004**: After an MCP is created, edited, or deleted, the dashboard MUST show the updated list within 1 second. Connection tests for unchanged MCPs MUST NOT delay this update.
- **FR-005**: After an OAuth2 authorization completes, the affected MCP's card MUST update to show the authorized status within 1 second. Connection tests for other MCPs MUST NOT delay this update.
- **FR-006**: The system MUST cache last-known connection status per MCP in server memory. Cached status MUST be used for initial page load display.
- **FR-007**: The system MUST update cached connection status in the background, streaming results to the frontend as each MCP test completes, without requiring a full page refetch.
- **FR-008**: When the system detects that an MCP's configuration has changed (created, edited, deleted), it MUST trigger a connection test for only the affected MCP, not all MCPs.
- **FR-009**: Cached connection status MUST have a configurable time-to-live (TTL). After the TTL expires, the status is considered stale and a new background test is triggered on the next access.
- **FR-010**: The initial page load MUST display MCP card content (name, transport, configuration) from the cached/static listing within 1 second, with status populated from cache or shown as "testing..." if no cache exists.

### Key Entities *(include if feature involves data)*

- **MCP Listing**: The list of MCP names, transport types, and configurations read from `.mcp.json`. Does not require connection testing.
- **Connection Status Cache**: Server-side in-memory cache storing last-known connection status per MCP. Keyed by MCP name. Contains: `status` (connected/error/needsAuth/unknown), `error` (optional string), `toolCount` (optional number), `lastTestedAt` (timestamp), and `ttl` (time-to-live).
- **Status Stream**: A mechanism (e.g., SSE or WebSocket messages) that streams per-MCP connection status updates from the server to the frontend as tests complete, without requiring a full listing refetch.
- **MCP Configuration Change Event**: An event emitted when an MCP is created, edited, or deleted. This event triggers a targeted update (only the affected MCP is tested, not all MCPs).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Dashboard listing with 10 configured MCPs loads and displays card content in under 1 second on initial page load.
- **SC-002**: After creating a new MCP, the new card appears in the grid within 1 second (regardless of how many other MCPs exist).
- **SC-003**: After completing OAuth2 authorization, the affected card updates within 1 second.
- **SC-004**: A single timing-out MCP (5s timeout) does not delay the status display of any other MCP by more than 100ms.
- **SC-005**: Background connection status updates for all 10 MCPs complete in under 30 seconds total, with statuses appearing incrementally as each MCP test finishes.
- **SC-006**: Cached status is used on page load — connection tests do not need to complete before the user sees card content and last-known status.

## Out of Scope

- Persistent connection status storage across server restarts (in-memory cache only; cache is rebuilt after restart on first access)
- Reducing individual connection test time (the 5s timeout per MCP test is unchanged — this spec addresses architectural caching and streaming, not transport-level optimization)
- Changing the `.mcp.json` data model
- Eliminating the 30-second SSE polling cycle entirely (it is kept but optimized to be per-MCP independent and non-blocking)
- Implementing HTTP caching headers (`Cache-Control`, `ETag`) on the listing endpoint

## Assumptions

- The `.mcp.json` file read is fast (< 50ms) and can be done on every listing request without performance concern.
- The in-memory cache is sufficient for a single-user dashboard running in Docker. No distributed cache or persistence is needed.
- Connection test failures/timeouts are the primary cause of slow listing. Configuration-only reads (without tests) are fast.
- The existing WebSocket connection for `config:changed` events can be reused or extended for streaming connection status updates.
- Background connection tests use the same timeout and test logic as current connection tests — the optimization is architectural, not per-test.
