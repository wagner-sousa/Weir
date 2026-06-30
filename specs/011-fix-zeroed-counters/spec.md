# Feature Specification: Fix Zeroed Counters for Auth-Gated and Local HTTP MCPs

**Feature Branch**: `011-fix-zeroed-counters`

**Created**: 2026-06-30

**Status**: Draft

**Input**: User description: "Os contadores de tools do Serena e do Postman ainda estão zerados"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Auth-Gated HTTP MCP Shows Real Tool Count After OAuth (Priority: P1)

An administrator configures an auth-gated HTTP MCP via the dashboard,
authorizes via OAuth, and sees the tool count reflect the actual number of tools
returned by the MCP server, not zero.

**Why this priority**: Zero tool count after OAuth makes the dashboard unusable
for the most common OAuth-based MCP. This is the primary reported bug.

**Independent Test**: Complete the OAuth flow for an auth-gated HTTP MCP; after
the callback completes, verify the dashboard shows the correct tool count
matching the tools/list response.

**Acceptance Scenarios**:

1. **Given** an auth-gated HTTP MCP configured with OAuth, **When** the user
   completes the OAuth authorization flow, **Then** the dashboard displays the
   actual tool count (not 0) within 5 seconds of the callback completing.
2. **Given** an auth-gated HTTP MCP that has been authorized, **When** the
   dashboard polls for status, **Then** the tool count is preserved and not
   reset to 0.

---

### User Story 2 - Local HTTP MCP Shows Distinguishable Error or Tool Count (Priority: P1)

An administrator configures a local HTTP MCP via the dashboard and sees either:
- The correct tool count when the MCP is reachable, or
- A clear "unreachable" error message (not "0 tools") when unreachable

**Why this priority**: Zero tool count with no error message makes it impossible
to distinguish "server is down" from "server has no tools".

**Independent Test**: With the local HTTP MCP reachable, verify tool count is
correct. With the MCP unreachable, verify error message contains specific detail
(e.g., "Connection refused", "DNS resolution failed").

**Acceptance Scenarios**:

1. **Given** a reachable local HTTP MCP, **When** the dashboard displays its
   status, **Then** the tool count matches the actual number of tools.
2. **Given** an unreachable local HTTP MCP (connection refused), **When** the
   dashboard displays its status, **Then** the error message contains
   "Connection refused" and the tool count shows 0 (distinct from a successful
   connection with 0 tools).

---

### Edge Cases

- What happens when the OAuth token expires and the tool count returns to 0?
- How does the system handle an MCP that returns 0 tools legitimately?
- What happens when both an auth-gated and a local HTTP MCP are configured but
  only one is reachable?
- How does the system behave when the MCP server is slow (timeout vs connection
  refused)?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: After OAuth callback completes, the system MUST query the MCP's
  tools/list endpoint using the obtained access token before broadcasting the
  updated status.
- **FR-002**: The tool count displayed in the dashboard MUST come from the actual
  tools/list response, not a hardcoded default.
- **FR-003**: When an HTTP MCP is unreachable, the error message MUST distinguish
  between DNS resolution failure, connection refused, and timeout.
- **FR-004**: The system MUST retry the tools/list query at least once if it fails
  after OAuth, with a brief delay between attempts.
- **FR-005**: Periodic SSE polling (cache refresh) MUST call tools/list (not just
  testConnection) so tool counts stay current.
- **FR-006**: The dashboard MUST update the displayed tool count automatically
  after OAuth callback completes, without requiring manual page refresh.

### Key Entities

- **MCP Server Configuration**: Definition of an MCP backend (name, transport type,
  URL/command, auth config). Persisted in the configuration store.
- **OAuth Token**: Access token obtained via OAuth flow. Stored in the auth token
  store.
- **Cached Status**: Per-MCP status entry containing connection status, error
  message, tool count, and auth state. Shared across dashboard clients in real
  time.
- **Tool List**: Array of tool descriptors returned by an MCP's tools/list query.
  The count of this array is the "tool count" displayed in the UI.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After OAuth callback, the dashboard shows non-zero tool count
  matching the MCP's tools/list response within 5 seconds.
- **SC-002**: An unreachable HTTP MCP shows a specific error message (e.g.,
  "Connection refused") instead of a generic "Connection failed" or "0 tools".
- **SC-003**: A reachable HTTP MCP shows the correct tool count, distinguishing
  it from an unreachable MCP.
- **SC-004**: The fix works for both auth-gated HTTP MCPs and local HTTP MCPs.

## Assumptions

- The dashboard frontend already handles tool count display correctly — no
  frontend changes are needed.
- MORPH is a separate project and must not be modified.
- The MCP servers (e.g., Postman, Serena) are correctly configured and return
  valid tool lists when reachable.
- Existing OAuth infrastructure is correct and only the ordering of operations
  needs adjustment.
- Test environment uses simulated MCP servers; production environment uses real
  MCP servers.
