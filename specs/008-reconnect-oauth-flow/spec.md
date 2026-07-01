# Feature Specification: Reconnect OAuth Flow

**Feature Branch**: `008-reconnect-oauth-flow`

**Created**: 2026-06-23

**Status**: Draft

**Input**: User description: "Ao clicar em reconnectar e o mcp for do tipo http, possuir autenticação e retornar 404, o sistema, seguirá o fluxo de autenticação oAuth (abrir pop-up, etc)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Reconnect Triggers OAuth Popup (Priority: P1)

The user has an HTTP MCP card that shows an error status due to failed authentication (e.g., expired token, server requiring new auth). The user clicks "Reconnect" on the card. The system detects that the connection failed because authentication is needed, and instead of just showing an error message, it opens the OAuth2 authorization popup so the user can re-authenticate.

**Why this priority**: Currently, clicking Reconnect on an auth-failed MCP only shows an error toast, leaving the user with no clear next step. After this feature, the user is guided directly to re-authentication, reducing friction.

**Independent Test**: Configure an HTTP MCP that requires OAuth2, let the token expire, click Reconnect, and verify the OAuth2 popup opens.

**Acceptance Scenarios**:

1. **Given** an HTTP MCP card with `needsAuth: true`, **When** the user clicks "Reconnect", **Then** the OAuth2 authorization popup opens automatically (same as clicking the shield icon).
2. **Given** an HTTP MCP card with `needsAuth: true`, **When** the OAuth2 authorization popup completes successfully, **Then** the card shows "connected" status.
3. **Given** an HTTP MCP card with `needsAuth: true`, **When** the OAuth2 popup is blocked by the browser, **Then** a toast "Popup blocked. Please allow popups for this site." is displayed.
4. **Given** an HTTP MCP card that fails with a non-auth error (e.g., connection refused), **When** the user clicks "Reconnect", **Then** the existing error toast is shown and no popup opens.

---

### User Story 2 - Reconnect Without Auth Shows Error (Priority: P2)

The user has a non-HTTP MCP (stdio, sse) or an HTTP MCP that fails for reasons unrelated to authentication. Clicking Reconnect shows the existing error toast and does not attempt to open an OAuth popup.

**Why this priority**: The OAuth flow should only trigger for HTTP MCPs that specifically indicate authentication is needed. Other errors should behave as before.

**Independent Test**: Configure a stdio MCP with an invalid command, click Reconnect, and verify only an error toast is shown (no popup).

**Acceptance Scenarios**:

1. **Given** a stdio MCP card that fails to connect, **When** the user clicks "Reconnect", **Then** an error toast is shown and no OAuth popup opens.
2. **Given** an HTTP MCP card that fails with a non-auth error (e.g., HTTP 500), **When** the user clicks "Reconnect", **Then** an error toast is shown and no OAuth popup opens.

---

### User Story 3 - Reconnect Button Shows Correct State During OAuth (Priority: P2)

While the reconnection and OAuth flow are in progress, the Reconnect button shows a loading indicator and is disabled to prevent multiple simultaneous attempts.

**Why this priority**: Clear loading state prevents duplicate actions and provides visual feedback.

**Independent Test**: Click Reconnect on an auth-needing MCP and verify the button shows a spinner and is disabled until the flow completes or the popup opens.

**Acceptance Scenarios**:

1. **Given** the Reconnect button is clicked and OAuth flow starts, **When** the popup opens, **Then** the button returns to its normal state.
2. **Given** the Reconnect button is clicked and the connection test fails (non-auth), **When** the error toast is shown, **Then** the button returns to its normal state.

### Edge Cases

- What happens when the backend returns `needsAuth: true` but no `authUrl`? → The OAuth popup is not opened. A toast shows: "OAuth2 authorization URL not available."
- What happens when the user closes the OAuth popup without completing authorization? → The card remains in its current state. The user can click Reconnect again to retry or click the shield icon.
- What happens when reconnect times out? → An error toast is shown: "Connection timed out." No popup opens.
- What happens when the MCP has auth token but the server returns 401/404 anyway (token expired)? → Reconnect triggers OAuth flow, opens popup for re-authentication.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: When "Reconnect" is clicked on an HTTP MCP and the connection test returns `needsAuth: true` with an `authUrl`, the system MUST open the OAuth2 authorization popup with that URL.
- **FR-002**: The OAuth popup opened by Reconnect MUST behave identically to the shield icon click flow (same popup dimensions, same callback handling, same token storage).
- **FR-003**: When "Reconnect" is clicked and the connection test returns `needsAuth: true` but no `authUrl` is available, the system MUST NOT open a popup. A toast MUST be shown: "OAuth2 authorization URL not available."
- **FR-004**: When "Reconnect" is clicked and the connection test fails for reasons other than auth (`needsAuth` is false or absent), the system MUST show the error toast as before and MUST NOT open an OAuth popup.
- **FR-005**: The Reconnect button MUST show a loading spinner and be disabled from the moment it is clicked until the flow resolves (popup opens, error toast, or timeout).
- **FR-006**: After the OAuth popup (triggered by Reconnect) completes successfully, the system MUST invalidate the MCP listing so the card status updates to "connected".
- **FR-007**: If the OAuth popup is blocked by the browser, the system MUST show a toast: "Popup blocked. Please allow popups for this site."

### Key Entities *(include if feature involves data)*

- **Reconnect Action**: The user-initiated flow that tests an existing MCP connection. If the test returns `needsAuth: true`, the flow branches into OAuth2 authorization instead of displaying an error.
- **Test Connection Result**: The backend response containing `success`, `error`, `needsAuth`, and `authUrl`. The `needsAuth` field is the trigger for entering the OAuth flow from reconnect.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can re-authenticate an HTTP MCP with expired/needed auth in 2 clicks (Reconnect + authorize in popup) instead of the current dead-end error toast.
- **SC-002**: The OAuth popup opens within 2 seconds of clicking Reconnect when the test returns `needsAuth: true`.
- **SC-003**: Non-auth reconnect errors continue to show error toasts and never open an OAuth popup.
- **SC-004**: The Reconnect button indicates loading state during the entire flow (reconnecting + popup opening), preventing duplicate clicks.

## Out of Scope

- Modifying the backend `testConnection` endpoint or the HTTP status codes it checks (401/404 detection remains as-is)
- Adding new UI elements for the reconnect flow (reuses the existing shield icon popup flow)
- Persisting "reconnecting" state across page reloads
- Batch reconnect operations

## Assumptions

- The backend `POST /api/mcps/test-connection` endpoint already returns `needsAuth` and `authUrl` fields when the MCP server responds with HTTP 401 or 404 and OAuth2 discovery succeeds.
- The existing OAuth2 popup flow (`POST /api/auth/:name/start`, popup monitoring, token storage) works correctly for shield-icon-initiated auth.
- The frontend can reuse the same `handleAuth` logic from the shield icon for the Reconnect-initiated OAuth flow.
- For stdio and sse transport types, `needsAuth` is never returned, so the OAuth flow is never triggered.
