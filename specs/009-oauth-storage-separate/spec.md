# Feature Specification: OAuth Storage Separate

**Feature Branch**: `009-oauth-storage-separate`

**Created**: 2026-06-23

**Status**: Draft

**Input**: User description: "Ajustar para os dados do oAuth, não ficarem em .mcp.json"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - OAuth Data Moved to Separate Storage (Priority: P1)

The user configures an HTTP MCP with OAuth2 auth. The `auth.clientId` and `accessToken` are stored in a separate file (`.mcp-auth.json`) instead of `.mcp.json`. After authorizing via the OAuth2 popup, the token is saved to the new file. The `.mcp.json` file contains only transport configuration — no secrets.

**Why this priority**: Keeping OAuth2 credentials in `.mcp.json` violates security best practices and prevents sharing `.mcp.json` across environments. This is the core of the feature.

**Independent Test**: Configure an HTTP MCP requiring OAuth2, complete the auth flow, then inspect `.mcp.json` — it must NOT contain `accessToken`, `auth.clientId`, or `auth.clientSecret`. The separate file must contain the credentials.

**Acceptance Scenarios**:

1. **Given** an HTTP MCP with OAuth2 auth is configured, **When** the user completes the authorization flow, **Then** the `accessToken` is stored in `.mcp-auth.json` and NOT in `.mcp.json`.
2. **Given** an HTTP MCP has `auth.clientId` configured, **When** the config is loaded, **Then** `auth.clientId` is read from `.mcp-auth.json`, not `.mcp.json`.
3. **Given** a user has an existing `.mcp.json` with inline `accessToken`, **When** the system starts, **Then** the token is migrated to `.mcp-auth.json` and removed from `.mcp.json`.
4. **Given** the authorization popup opens and completes, **When** the callback stores the token, **Then** the token is written only to `.mcp-auth.json`.
5. **Given** `.mcp-auth.json` exists with stored tokens, **When** `GET /api/mcps` is called, **Then** the Bearer token is still sent in requests (functionality unchanged).

---

### User Story 2 - Backward Compatibility with Migration (Priority: P1)

Existing users who have OAuth2 data in their `.mcp.json` must have their data automatically migrated to the new file on first access. No manual intervention required.

**Why this priority**: Without migration, all existing OAuth2-authenticated MCPs would break after update.

**Independent Test**: Create a `.mcp.json` with inline `accessToken` and `auth.clientId`, start the backend, then verify the data moved to `.mcp-auth.json` and was removed from `.mcp.json`.

**Acceptance Scenarios**:

1. **Given** `.mcp.json` contains `accessToken` on an MCP entry, **When** the backend loads the config, **Then** the token is moved to `.mcp-auth.json` and removed from `.mcp.json`.
2. **Given** `.mcp.json` contains `auth` with `clientId`, **When** the backend loads the config, **Then** the `auth` block is moved to `.mcp-auth.json` and removed from `.mcp.json`.
3. **Given** `.mcp-auth.json` already has data for an MCP, **When** the backend loads the config, **Then** `.mcp-auth.json` takes precedence over any leftover OAuth fields in `.mcp.json`.

---

### Edge Cases

- What happens if `.mcp-auth.json` is corrupted or unreadable? → The system logs a warning and treats the MCP as unauthenticated (no token). The `.mcp.json` inline fields are treated as fallback.
- What happens when `.mcp-auth.json` has data for an MCP that no longer exists in `.mcp.json`? → Orphaned entries are ignored.
- What happens if the migration writes both files and the write to `.mcp-auth.json` fails? → The operation is rolled back (token stays in `.mcp.json`).
- What happens if `.mcp-auth.json` is world-readable? → The file should have restricted permissions (0600) since it contains secrets.
- What happens to the `pendingCodeVerifier` field? → Also moved to `.mcp-auth.json` as it is OAuth2-internal state.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST store OAuth2 tokens (`accessToken`) in a separate file (`.mcp-auth.json`) instead of `.mcp.json`.
- **FR-002**: The system MUST store OAuth2 client credentials (`auth.clientId`, `auth.clientSecret`) in `.mcp-auth.json` instead of `.mcp.json`.
- **FR-003**: The system MUST store OAuth2 ephemeral state (`pendingCodeVerifier`) in `.mcp-auth.json`.
- **FR-004**: On first access after upgrade, the system MUST automatically migrate any OAuth2 data found in `.mcp.json` to `.mcp-auth.json` and remove it from `.mcp.json`.
- **FR-005**: The system MUST continue to read `accessToken` from the new file when making authenticated MCP requests.
- **FR-006**: The system MUST set file permissions of `.mcp-auth.json` to 0600 (owner read/write only).
- **FR-007**: If `.mcp-auth.json` is corrupted or unreadable, the system MUST fall back to any inline OAuth2 data in `.mcp.json` and log a warning.
- **FR-008**: The `GET /api/mcps` response MUST NOT expose `accessToken` or `auth` fields.
- **FR-009**: The `.mcp.json` writer MUST strip `accessToken`, `auth`, and `pendingCodeVerifier` fields before writing to `.mcp.json`.
- **FR-010**: The `.mcp-auth.json` writer MUST NOT include transport configuration (type, command, args, url, env).

### Key Entities *(include if feature involves data)*

- **AuthStorage**: A new file `.mcp-auth.json` mapping MCP names to their OAuth2 credentials (`accessToken`, `auth.clientId`, `auth.clientSecret`, `pendingCodeVerifier`). Structure: `{ "mcpServers": { "[name]": { "accessToken": "...", "auth": { "clientId": "...", "clientSecret": "..." }, "pendingCodeVerifier": "..." } } }`.
- **MCPEntry (updated)**: The `.mcp.json` entry no longer contains `accessToken`, `auth`, or `pendingCodeVerifier`. Those fields are stripped on write and migrated on read.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After migration, `.mcp.json` contains zero OAuth2-related fields across all MCPs.
- **SC-002**: Authenticated HTTP MCP requests continue to work after migration (same Bearer token behavior).
- **SC-003**: New OAuth2 authorization flows store tokens exclusively in `.mcp-auth.json`, never in `.mcp.json`.
- **SC-004`: Migration completes in under 100ms for up to 50 MCPs.
- **SC-005**: File permissions of `.mcp-auth.json` are verified as 0600 after creation.

## Out of Scope

- Encrypting the `.mcp-auth.json` file contents (future enhancement)
- Using a system keychain or secret store (future enhancement)
- Multi-user/multi-tenant secret isolation
- Changes to the OAuth2 well-known discovery or authorization popup flow
- Changes to the frontend UI — only backend storage layer changes

## Assumptions

- The `.mcp-auth.json` file lives at the same directory as `.mcp.json` (configurable via `MCP_AUTH_CONFIG_PATH` env var with default derived from `MCP_CONFIG_PATH`).
- Existing `.mcp.json` files may contain `accessToken`, `auth`, and `pendingCodeVerifier` fields that need migration.
- The backend always reads the raw config file to extract OAuth2 data — a new reader abstraction will centralize this.
- No frontend changes are needed since the frontend never reads OAuth2 data directly — it goes through the backend API.
