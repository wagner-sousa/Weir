# Feature Specification: Save on Test

**Feature Branch**: `005-save-on-test`

**Created**: 2026-06-22

**Status**: Draft

**Input**: User description: "Ao criar/editar um mcp, o usuário pode primeiro testar a conexão, e ao fazer isso, já deve ser salvo o token e salvo o mcp. Caso contrário, se o usuário salvar e ainda não tiver testado a conexão, deve ser executado o processo de testar a conexão (independente do tipo de mcp). No caso de mcps do tipo http e necessitar de oAuth, o sistema irá abrir a pop-up de autenticação."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Test Then Auto-Save (Priority: P1)

The user opens the Add/Edit MCP modal, fills in the transport details, and clicks "Test Connection". The connection succeeds (or fails with needsAuth). The MCP is automatically saved with the configuration, and if an OAuth2 token was obtained during the flow, it is persisted. The modal closes and the user returns to the dashboard seeing the MCP listed.

**Why this priority**: This eliminates the extra "Save" click and ensures the MCP is always persisted when a test is performed, preventing data loss.

**Independent Test**: Fill in a valid MCP config, click "Test Connection", confirm the MCP appears in the dashboard list after the modal closes.

**Acceptance Scenarios**:

1. **Given** the Add MCP modal is open with valid transport configuration, **When** the user clicks "Test Connection" and the test succeeds, **Then** the MCP is automatically saved to `.mcp.json` and the modal closes.
2. **Given** the Add MCP modal is open with valid transport configuration, **When** the user clicks "Test Connection" and the test returns `needsAuth: true`, **Then** the MCP is automatically saved to `.mcp.json`, the modal closes, and a shield icon appears on the card for OAuth2 authorization.
3. **Given** the Edit MCP modal is open for an existing MCP, **When** the user clicks "Test Connection" and the test succeeds, **Then** the updated configuration is saved and the modal closes.
4. **Given** the Edit MCP modal is open, **When** the user clicks "Test Connection" and the test fails with a non-auth error, **Then** the MCP is NOT saved and the error is displayed.

---

### User Story 2 - Save Triggers Auto-Test (Priority: P1)

The user opens the Add/Edit MCP modal, fills in the details, and clicks "Save" without having clicked "Test Connection" first. The system automatically runs the connection test. If the test succeeds, the MCP is saved. If the test fails with `needsAuth: true` (HTTP MCP with OAuth2), the system saves the MCP and opens the OAuth2 authorization popup automatically. If the test fails with an error, the user is shown the error and the MCP is not saved.

**Why this priority**: This ensures every saved MCP has a validated connection. For HTTP MCPs requiring OAuth2, the auth popup appears immediately, streamlining the setup flow.

**Independent Test**: Fill in a valid HTTP MCP config that requires OAuth2, click "Save" directly (without testing first), confirm the OAuth2 popup opens automatically.

**Acceptance Scenarios**:

1. **Given** the Add MCP modal is open with valid transport configuration, **When** the user clicks "Save" without testing first, **Then** a connection test is automatically executed.
2. **Given** the auto-test succeeds, **When** the test completes, **Then** the MCP is saved and the modal closes.
3. **Given** the auto-test returns `needsAuth: true` (HTTP MCP requiring OAuth2), **When** the test completes, **Then** the MCP is saved, the modal closes, and the OAuth2 authorization popup opens automatically.
4. **Given** the auto-test fails with a non-auth error, **When** the test completes, **Then** the MCP is NOT saved, the error is displayed in the modal, and the user can correct the configuration.
5. **Given** the user is editing an existing MCP, **When** the user clicks "Save" and the auto-test returns `needsAuth: true`, **Then** the updated config is saved and the OAuth2 popup opens automatically.

---

### Edge Cases

- What happens when the user fills in an HTTP MCP transport but no OAuth2 client_id is configured? → The auto-test returns `needsAuth: true`. The MCP is saved. The shield icon appears on the card. No popup opens automatically (since client_id is missing). A warning toast is shown: "OAuth2 client_id not configured. See card for details."
- What happens when the test times out? → The MCP is not saved. An error is displayed: "Connection timed out."
- What happens when the user closes the modal during auto-test? → The test continues in the background. On completion, if success: MCP is saved. If failure: nothing happens (the user already closed).
- What happens when the modal already has unsaved changes and the user clicks Save? → Same flow: auto-test runs, then save on success.
- What happens when the OAuth2 popup is blocked by the browser? → A toast "Popup blocked. Please allow popups for this site." is displayed.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: When "Test Connection" is clicked and returns success (or `needsAuth: true`), the system MUST automatically save the MCP configuration and close the modal.
- **FR-002**: When "Test Connection" is clicked and returns a non-auth error, the system MUST NOT save the MCP. The error MUST be displayed in the modal.
- **FR-003**: When "Save" is clicked without a prior test, the system MUST automatically execute a connection test before saving.
- **FR-004**: If the auto-triggered test (FR-003) returns `needsAuth: true` for an HTTP MCP, the system MUST save the MCP, close the modal, and automatically open the OAuth2 authorization popup.
- **FR-005**: If the auto-triggered test (FR-003) returns a non-auth error, the system MUST NOT save the MCP. The error MUST be displayed in the modal.
- **FR-006**: The "Save" button text MUST change to "Testing..." while the auto-test is in progress, and be disabled to prevent double-submission.
- **FR-007**: If the OAuth2 popup is blocked by the browser, the system MUST show a toast: "Popup blocked. Please allow popups for this site."
- **FR-008**: If the auto-triggered test returns `needsAuth: true` but no `clientId` is configured, the system MUST NOT open the popup automatically. A toast MUST be shown: "OAuth2 client_id not configured. See card for details."
- **FR-009**: The automatic save on test (FR-001) MUST NOT require additional user confirmation beyond the initial "Test Connection" click.
- **FR-010**: All user-facing messages (toasts, errors, button labels) MUST be in English (Constitution III).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can add a new MCP in at most 2 clicks (fill form + test) instead of 3 (fill form + test + save).
- **SC-002**: For HTTP MCPs requiring OAuth2 with clientId configured, the authorization popup opens automatically upon Save with no additional user action.
- **SC-003**: Error cases (timeout, invalid config, blocked popup) display a clear message and do not save invalid configurations.
- **SC-004**: The auto-test completes in under the configured timeout (default 5s for connection, 30s for add).
- **SC-005**: After saving via auto-test with `needsAuth`, the MCP card appears on the dashboard with the shield icon visible.

## Out of Scope

- Modifying the `.mcp.json` data model (no new fields required — only changes to the save/workflow logic)
- OAuth2 token refresh (handled by existing re-authentication via shield icon)
- Batch operations (this applies to one MCP at a time)

## Assumptions

- The connection test endpoint (`POST /api/mcps/test-connection`) already exists and returns the correct response shape including `needsAuth` and `authUrl` for OAuth2-requiring MCPs.
- The OAuth2 auth popup flow (`POST /api/auth/:name/start`) already exists and opens the correct authorization URL.
- The MCP configuration is valid enough to attempt a connection test (type, url/command are provided).
- For HTTP MCPs, the OAuth2 well-known discovery is already implemented and returns the authorization endpoint correctly.
