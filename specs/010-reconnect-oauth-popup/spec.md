# Feature Specification: Reconnect OAuth Popup

**Feature Branch**: `010-reconnect-oauth-popup`

**Created**: 2026-06-23

**Status**: Draft

**Input**: User description: "Ao clicar em refresh e o tipo for http e necessitar autenticação, deve seguir o fluxo de autenticação (abrir pop-up, etc.)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Reconnect Triggers OAuth2 Popup for HTTP MCPs (Priority: P1)

The user has an HTTP MCP configured that requires OAuth2 authorization. The card shows an error status with a shield icon. Previously, clicking "Reconnect" would attempt the connection again, get a 401 error again, and show the same error — requiring the user to click the shield icon separately to authorize. Now, clicking "Reconnect" on an HTTP MCP with `needsAuth` status automatically triggers the OAuth2 authorization popup, streamlining the re-authentication flow.

**Why this priority**: This eliminates a redundant step (error → shield → popup → reconnect) and makes the Reconnect button actually resolve the issue it's meant to fix.

**Independent Test**: Configure an HTTP MCP returning 401. Click "Reconnect" — the OAuth2 authorization popup opens automatically, and after completing auth, the MCP connects successfully.

**Acceptance Scenarios**:

1. **Given** an HTTP MCP card showing error status with `needsAuth: true`, **When** the user clicks "Reconnect", **Then** the OAuth2 authorization popup opens automatically instead of attempting a reconnection.
2. **Given** an HTTP MCP card showing error status with `needsAuth: true`, **When** the OAuth2 popup opens and the user completes authorization, **Then** the MCP status updates to "connected" after the popup closes.
3. **Given** an HTTP MCP card showing error status with `needsAuth: true`, **When** the popup is blocked by the browser, **Then** a toast "Popup blocked. Please allow popups for this site." is displayed.
4. **Given** a non-HTTP MCP (stdio/SSE) showing error status, **When** the user clicks "Reconnect", **Then** the normal reconnection test is performed (not OAuth2 flow).
5. **Given** an HTTP MCP card showing error status without `needsAuth`, **When** the user clicks "Reconnect", **Then** the normal reconnection test is performed (not OAuth2 flow).

---

### Edge Cases

- What happens when OAuth2 client_id is not configured? → The reconnect triggers the auth flow anyway (POST /api/auth/:name/start will return an error with "No client_id configured"). A warning toast is shown. The shield icon remains for manual authorization later.
- What happens when the OAuth2 popup is already open (user clicked shield icon first, then refresh)? → The system should attempt to reconnect normally (detect that the auth flow is in progress or the MCP is already in needsAuth state). Default: attempt reconnect, if still 401 and needsAuth, open a new popup (user may have multiple tabs).
- What happens when reconnect is clicked multiple times? → The button is disabled while a reconnect or auth flow is in progress.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: When the user clicks "Reconnect" on an HTTP MCP card with `needsAuth: true` and `authUrl` present, the system MUST open the OAuth2 authorization popup instead of running a connection test.
- **FR-002**: When the user clicks "Reconnect" on a non-HTTP MCP or an HTTP MCP without `needsAuth`, the system MUST run the normal connection test.
- **FR-003**: If the OAuth2 popup is blocked by the browser, the system MUST display a toast: "Popup blocked. Please allow popups for this site."
- **FR-004**: The "Reconnect" button MUST be disabled while the auth popup is being opened (prevent double-click).
- **FR-005**: After the OAuth2 popup is opened and later closed, the MCP status MUST refresh automatically (re-fetch `GET /api/mcps`).
- **FR-006**: All user-facing messages (toasts, errors) MUST be in English (Constitution III).

### Key Entities *(include if feature involves data)*

No new entities. The feature reuses the existing MCP card, shield icon, and handleAuth flow from CardGrid.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can re-authenticate an HTTP MCP in 1 click (Reconnect) instead of 2 clicks (Shield → Authorize).
- **SC-002**: Non-HTTP MCPs and non-auth HTTP errors continue to use the normal reconnect flow (no regression).
- **SC-003**: The OAuth2 popup opens within 1 second of clicking Reconnect.
- **SC-004**: After popup close and auth completion, the card status updates to "connected" in under 2 seconds.

## Out of Scope

- Changing the shield icon behavior (shield icon continues to work as before)
- Modifying the backend reconnect or OAuth2 endpoints
- Multi-MCP batch reconnect
- Remembering popup position or size preferences

## Assumptions

- The `handleAuth` function in `CardGrid.tsx` already handles the OAuth2 popup correctly (from 004-oauth2-mcp-auth).
- The MCP card's `needsAuth` and `authUrl` fields are populated correctly by the backend (from 004-oauth2-mcp-auth).
- The "Reconnect" button is already implemented and calls `handleReconnect(client)` in `CardGrid.tsx`.
- For HTTP MCPs with `needsAuth`, the reconnect should call `handleAuth` instead of `handleReconnect`.
