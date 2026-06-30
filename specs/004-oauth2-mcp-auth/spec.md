# Feature Specification: OAuth2 MCP Auth

**Feature Branch**: `004-oauth2-mcp-auth`

**Created**: 2026-06-22

**Status**: Draft

**Input**: User description: "Implemente a autenticação oauth2 para os tipos de mcp http se necessário. Para isso deve ser aberto uma pop-up. Se a conexão ficar 401, o card deve apresentar um botão com ícone de escudo e ao clicar abrirá a pop-up."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Basic Auth Shield (Priority: P1)

The user views an HTTP MCP card that failed to connect with a 401 error. The card displays a shield icon button. The user clicks the shield, and a popup opens to the OAuth2 authorization URL discovered from the MCP server's well-known metadata. After completing authorization in the popup, the user closes it and clicks Reconnect to verify the connection works.

**Why this priority**: Without the shield button, users have no way to initiate OAuth2 flows from the dashboard. This is the primary entry point for authentication.

**Independent Test**: Can be tested by adding an HTTP MCP that returns 401 (e.g., ClickUp MCP), verifying the shield button appears, clicking it, and confirming a popup opens to the authorization URL.

**Acceptance Scenarios**:

1. **Given** an HTTP MCP card with status "error" and error message containing "401", **When** the user views the card, **Then** a shield icon button (ShieldAlert from lucide-react) is displayed at the top of the card footer.
2. **Given** the shield button is visible, **When** the user clicks it, **Then** a popup window opens to the MCP server's OAuth2 authorization endpoint.
3. **Given** the popup is open to the authorization URL, **When** the user completes the OAuth2 flow, **Then** the popup redirects to the configured callback URL.
4. **Given** the OAuth2 flow completed, **When** the user clicks "Reconnect" on the card, **Then** the connection test uses the obtained token and returns success.

---

### User Story 2 - Automatic OAuth2 Discovery (Priority: P1)

When an HTTP MCP connection returns 401, the backend automatically discovers the OAuth2 authorization server metadata from the MCP server's `/.well-known/oauth-authorization-server` endpoint. This provides the authorization URL, token URL, and supported scopes without manual configuration.

**Why this priority**: Automatic discovery eliminates the need for users to manually configure OAuth2 URLs for each MCP server.

**Independent Test**: Can be tested by connecting to an MCP server that supports OAuth2 well-known discovery (e.g., ClickUp MCP at `https://mcp.clickup.com/.well-known/oauth-authorization-server`).

**Acceptance Scenarios**:

1. **Given** an HTTP MCP returns 401, **When** the backend processes the response, **Then** it fetches `/.well-known/oauth-authorization-server` from the MCP's origin.
2. **Given** the well-known endpoint responds with valid metadata, **When** parsing is complete, **Then** the `authorization_endpoint` and `token_endpoint` are extracted and returned to the frontend.
3. **Given** the well-known endpoint is unreachable or returns invalid data, **When** the connection test completes, **Then** the shield button is not shown (fallback to generic error).

---

### User Story 3 - Token Persistence (Priority: P2)

After successful OAuth2 authorization, the access token is stored in the MCP configuration. Subsequent connection tests and tool queries include the token as a Bearer token in the Authorization header.

**Why this priority**: Token persistence ensures the user doesn't need to re-authenticate on every page load or connection test.

**Independent Test**: Can be tested by completing the OAuth2 flow, reloading the page, and verifying the connection no longer returns 401.

**Acceptance Scenarios**:

1. **Given** the OAuth2 flow completed successfully, **When** the token is received, **Then** it is stored in the `.mcp.json` file as an `accessToken` field on the MCP entry.
2. **Given** an MCP entry has an `accessToken` field, **When** the backend performs a connection test or tools query, **Then** the token is included in the `Authorization: Bearer <token>` header.
3. **Given** the token expires (server returns 401 again), **When** the connection test detects the 401, **Then** the shield button reappears for re-authentication.

---

### Edge Cases

- What happens when the MCP server's OAuth2 well-known endpoint is unreachable? → The backend falls back to returning a generic 401 error without the shield button. The user can manually configure the auth URL in the MCP entry.
- What happens when the user closes the popup without completing authorization? → The auth flow is cancelled. The card remains in its current state. The user can click the shield again to retry.
- What happens when the token is revoked or expires? → The next connection test returns 401, the shield button reappears, and the user can re-authenticate.
- How does the system handle multiple OAuth2 flows for different MCPs? → Each MCP has its own auth configuration stored independently. Tokens are stored per-MCP entry.
- What happens when the popup is blocked by the browser? → A toast notification "Popup blocked. Please allow popups for this site." is displayed.
- Does the system support OAuth2 for stdio MCPs? → No. OAuth2 is only relevant for HTTP transport MCPs.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: When an HTTP MCP connection test returns HTTP 401, the backend MUST attempt to discover OAuth2 metadata from the server's `/.well-known/oauth-authorization-server` endpoint.
- **FR-002**: If OAuth2 discovery succeeds, the backend MUST return `needsAuth: true` and the discovered `authorizationEndpoint` as `authUrl` in the connection result.
- **FR-003**: The MCP card component MUST display a shield icon button (ShieldAlert from lucide-react) when `needsAuth` is true. The button MUST have `aria-label="Authorize MCP"`.
- **FR-004**: Clicking the shield button MUST open a popup window (`window.open`) to the `authUrl` with a target of `_blank` and popup dimensions of 600x700.
- **FR-005**: The backend MUST provide a callback endpoint that receives the OAuth2 authorization code, exchanges it for an access token at the MCP's token endpoint, and stores the token in the corresponding MCP entry within `.mcp.json`.
- **FR-006**: The stored access token MUST be included as a Bearer token in the `Authorization` header of all subsequent connection tests and tool queries for that MCP.
- **FR-007**: If the popup is blocked by the browser, the system MUST show a toast: "Popup blocked. Please allow popups for this site."
- **FR-008**: All OAuth2-related UI elements (shield icon, popup, toasts) MUST use English for user-facing text (Constitution III).
- **FR-009**: All icons MUST use lucide-react (ShieldAlert) per Constitution VI.
- **FR-010**: When generating the OAuth2 authorization URL, the `scope` parameter MUST only be included if `scopesSupported` is a non-empty array of non-empty strings.
- **FR-011**: If `scopesSupported` is undefined, null, or an empty array, the `scope` parameter MUST be omitted entirely from the authorization URL.
- **FR-012**: Empty or whitespace-only strings within `scopesSupported` MUST be filtered out before constructing the scope parameter.

### Key Entities *(include if feature involves data)*

- **MCP Connection**: Existing entity extended with `needsAuth` (boolean) and `authUrl` (string) fields for runtime state.
- **MCP Configuration (.mcp.json)**: Existing file extended with optional `accessToken` field per MCP entry for token persistence.
- **OAuth2 Auth Config**: The discovered well-known metadata (authorization endpoint, token endpoint, scopes, registration endpoint). Not persisted — discovered at runtime.
- **OAuth2 Token**: The access token obtained from the OAuth2 flow. Stored in `.mcp.json` as `accessToken`. Can expire or be revoked, requiring re-authentication.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can initiate OAuth2 authorization for any HTTP MCP returning 401 in under 2 clicks (shield button + authorization).
- **SC-002**: The OAuth2 well-known discovery completes in under 5 seconds for any MCP server.
- **SC-003**: After successful authorization, subsequent connection tests include the Bearer token and succeed in under 5 seconds.
- **SC-004**: Token persistence survives page reloads — the card shows "connected" status on reload if the token is still valid.
- **SC-005**: Expired/revoked tokens are handled gracefully — the shield button reappears for re-authentication.
- **SC-006**: Stripe MCP OAuth flow completes without `invalid_scope` error when `scopes_supported` is absent from well-known metadata.
- **SC-007**: No authorization URL contains `scope=undefined` for any MCP server — verified across all MCPs in the configuration.

### User Story 4 - Stripe MCP OAuth Scope Fix (Priority: P1)

The user configures an HTTP MCP pointing to `https://mcp.stripe.com` which requires OAuth2 authentication. The MCP's `.well-known/oauth-authorization-server` does not include `scopes_supported`. When the auth popup opens, Stripe's authorization server must NOT receive a `scope` parameter with an invalid value, otherwise it returns `invalid_scope`.

**Why this priority**: Without this fix, Stripe MCP authentication is completely broken — the popup immediately fails with `Authorization failed: invalid_scope` and no token exchange is possible.

**Independent Test**: Configure an HTTP MCP for `https://mcp.stripe.com`, click the shield button, and verify the popup URL does NOT contain `scope=undefined` and the OAuth flow completes without `invalid_scope` error.

**Acceptance Scenarios**:

1. **Given** Stripe MCP's well-known metadata does not include `scopes_supported`, **When** the authorization URL is generated, **Then** the `scope` parameter MUST be omitted entirely from the URL (not set to `undefined` or empty).
2. **Given** Stripe MCP's well-known metadata includes `scopes_supported`, **When** the authorization URL is generated, **Then** the scopes are joined with spaces and included as the `scope` parameter.
3. **Given** the authorization popup opens without `scope` parameter, **When** Stripe's authorization server processes it, **Then** Stripe uses its default scopes and the popup completes successfully.

---

### User Story 5 - Graceful Scope Handling for All MCPs (Priority: P2)

Any MCP server that omits `scopes_supported` from its well-known metadata must be handled gracefully — the scope parameter is simply omitted from the authorization URL rather than sending an invalid value.

**Why this priority**: Other MCP servers may also omit `scopes_supported`; the fix should be generic, not Stripe-specific.

**Independent Test**: Mock a well-known endpoint that omits `scopes_supported`, initiate OAuth flow, and verify the authorization URL contains no `scope` parameter.

**Acceptance Scenarios**:

1. **Given** any MCP server's well-known endpoint returns metadata without `scopes_supported`, **When** the authorization URL is built, **Then** no `scope` query parameter is present.
2. **Given** any MCP server's well-known endpoint returns `scopes_supported: []` (empty array), **When** the authorization URL is built, **Then** no `scope` query parameter is present.
3. **Given** any MCP server's well-known endpoint returns `scopes_supported: ["read", "write"]`, **When** the authorization URL is built, **Then** `scope=read%20write` is present in the URL.

---

### Edge Cases (Stripe Auth)

- What if the Stripe well-known endpoint is unreachable? → The shield button won't appear; generic 401 error displayed. (Handled by existing logic.)
- What if Stripe's authorization server requires specific scopes that are not discoverable? → The user can manually configure scopes in the MCP config's `auth.scopes` field. Feature assumes Stripe's server works with default (omitted) scopes.
- Does this affect non-HTTPS MCPs? → No, OAuth2 is only applicable to HTTPS MCP endpoints.
- What if `scopes_supported` contains an empty string? → Filtered out before joining; empty strings produce no scope parameter.

---


- Manual OAuth2 configuration UI (auth URLs must be discovered automatically or configured manually in `.mcp.json`)
- OAuth2 client registration (the user must register their app with the MCP provider separately)
- Refresh token handling (if the token expires, the user re-authenticates via the shield button)
- OAuth2 for stdio transport MCPs
- Multiple simultaneous OAuth2 flows from the same popup

## Assumptions

- MCP HTTP servers that require OAuth2 follow the MCP OAuth2 specification and expose `/.well-known/oauth-authorization-server`.
- The OAuth2 authorization server supports the Authorization Code flow with PKCE or similar.
- The user has registered their Weir instance with the MCP provider and obtained a client_id, which is stored in the MCP config's `auth.clientId` field.
- The popup callback URL points to the Weir backend's callback endpoint, which completes the token exchange.
- Token storage in `.mcp.json` is secure enough for a single-user dashboard running locally or in Docker.
