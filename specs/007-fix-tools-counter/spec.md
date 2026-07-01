# Feature Specification: Fix Tools Counter

**Feature Branch**: `007-fix-tools-counter`

**Created**: 2026-06-23

**Status**: Draft

**Input**: User description: "Por que o contador de tools sempre está zerado?"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Tool Count Shows Actual Tools (Priority: P1)

A user configures an MCP server that provides tools (e.g., filesystem, database, API connectors). After adding the MCP, the dashboard card displays the actual number of tools available from that server instead of always showing 0. The tool count updates correctly when the MCP is reconnected or the page is refreshed.

**Why this priority**: The tool counter is a key indicator of MCP functionality. Always showing 0 makes the dashboard misleading and reduces user trust in the system.

**Independent Test**: Configure a stdio MCP server that exposes 10+ tools (e.g., `@modelcontextprotocol/server-filesystem`), add it via the dashboard, and verify the card shows the correct tool count.

**Acceptance Scenarios**:

1. **Given** a stdio MCP server with 10 tools, **When** the user adds it to the dashboard, **Then** the card displays tool count of 10.
2. **Given** an HTTP MCP server with 5 tools, **When** the user adds it to the dashboard, **Then** the card displays tool count of 5.
3. **Given** the dashboard is refreshed, **When** the page reloads, **Then** the tool count for each MCP matches the actual tools provided by that server.
4. **Given** an MCP server provides 0 tools, **When** the user views its card, **Then** the card displays "0" (not "?").

---

### User Story 2 - Tool Count Survives SSE Status Updates (Priority: P1)

The dashboard maintains the correct tool count even as the SSE/WebSocket stream delivers periodic connection status updates. The tool count is not reset to 0 or null by background status polling.

**Why this priority**: Background status polling should not overwrite correct tool count data from the main listing.

**Independent Test**: Configure an MCP with tools, wait for an SSE status update cycle, and verify the tool count remains correct.

**Acceptance Scenarios**:

1. **Given** an MCP card shows a correct tool count (e.g., 10), **When** an SSE status event arrives for that MCP, **Then** the tool count remains at 10.
2. **Given** the page has been open for several minutes, **When** multiple SSE status cycles complete, **Then** the displayed tool counts do not degrade to 0.

---

### User Story 3 - Tool Count After Reconnection (Priority: P2)

The user clicks "Reconnect" on an MCP card that was previously disconnected. After the reconnection succeeds, the card shows the correct tool count.

**Why this priority**: The tool count is useful for verifying the MCP is fully operational after a reconnection.

**Independent Test**: Simulate a disconnection, click "Reconnect", and verify the tool count appears after success.

**Acceptance Scenarios**:

1. **Given** a disconnected MCP card, **When** the user clicks "Reconnect" and it succeeds, **Then** the card shows the correct tool count.
2. **Given** a reconnection fails, **When** the user views the card, **Then** the tool count is not displayed (or shows "?").

### Edge Cases

- What happens when the MCP server does not support `tools/list`? → The tool count shows 0 and the card does not display an error. No regression from current behavior.
- What happens when the `tools/list` request times out? → The tool count shows 0 for that MCP. Other MCPs are unaffected.
- What happens when the MCP server only supports stdio transport? → The tool count is correctly obtained using the MCP initialization sequence before querying tools.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST correctly query the list of tools from each MCP server and display the count on the dashboard card.
- **FR-002**: For stdio transport MCPs, the system MUST follow the MCP protocol initialization sequence (send `initialize`, receive response) before querying tools with `tools/list`.
- **FR-003**: Background SSE status updates MUST NOT overwrite or reset the tool count obtained from the main listing query.
- **FR-004**: The tool count MUST be re-queried when the user explicitly triggers a reconnection on an MCP card.
- **FR-005**: If `tools/list` fails (timeout, error, or empty response), the tool count MUST display as 0. The card status is not affected by a failed tools query.
- **FR-006**: The tool count display MUST differentiate between "0 tools available" (the server reported 0 tools) and "unknown" (the query failed or timed out) by showing "0" or hiding the counter respectively.

### Key Entities *(include if feature involves data)*

- **MCP Server Tool List**: The list of tools exposed by an MCP server via the `tools/list` JSON-RPC method. Returned as an array of tool objects with `name`, `description`, and `inputSchema` fields.
- **Tool Count**: The number of elements in the tool list. Displayed as a badge on the MCP card in the dashboard.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Stdio MCP servers with tools display the correct tool count (matching the tools they declare) on the dashboard card.
- **SC-002**: HTTP MCP servers with tools display the correct tool count on the dashboard card.
- **SC-003**: Tool count remains stable across SSE status update cycles — no count degradation over 5 minutes of continuous observation.
- **SC-004**: No regression in MCP connection test success rate — fixing the tools query does not break existing connection workflows.

## Out of Scope

- Adding a separate endpoint or UI for browsing tool details (only the count is displayed)
- Changing the SSE endpoint to include tool counts in its events (it remains focused on connection status only)
- Persistent caching of tool counts between page loads (tool counts are re-queried on each page load)
- Performance optimization of tools query (the existing timeout and parallelization are unchanged)

## Assumptions

- MCP servers that support tools implement the `tools/list` JSON-RPC method according to the MCP specification.
- For stdio MCP servers, the protocol requires an `initialize` handshake before `tools/list`. Without it, the server may ignore or reject the request.
- For HTTP/SSE MCP servers, `tools/list` can be sent as an independent JSON-RPC request via POST without a prior `initialize` handshake.
- The `testConnection` function already correctly performs the `initialize` handshake for all transport types.
