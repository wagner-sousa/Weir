# Research: OAuth Storage Separate

## 1. AuthStorage Service Design

**Decision**: Create `backend/src/services/auth-storage.ts` with functions:
- `getAuthConfig(name)` — read auth data for an MCP
- `setAuthConfig(name, data)` — write auth data for an MCP
- `deleteAuthConfig(name)` — remove auth data
- `migrateFromMcpJson(mcpJsonPath)` — one-time migration from `.mcp.json`

**Rationale**:
- Centralizes all OAuth storage logic in one place
- File permissions set to 0600 on creation
- JSON format mirrors `.mcp.json` structure for familiarity

**Alternatives considered**:
- Environment variables — not practical for multiple MCPs
- System keychain — adds OS dependency, overkill for Docker single-user

## 2. Migration Strategy

**Decision**: On first `getAuthConfig()` call, check for inline OAuth data in `.mcp.json`. If found, copy to `.mcp-auth.json` and strip from `.mcp.json`.

**Rationale**:
- Lazy migration avoids a startup bottleneck
- `.mcp.json` is modified in-place (write back without OAuth fields)
- Migration is idempotent — if `.mcp-auth.json` already has data, skip

**Alternatives considered**:
- Migration on every startup — unnecessary I/O
- Background migration — adds complexity

## 3. File Permission 0600

**Decision**: Set `.mcp-auth.json` permissions to `0o600` (owner read/write only) using `fs.chmodSync`.

**Rationale**:
- Contains secrets (accessToken, clientSecret)
- Prevents other processes/users from reading tokens
- Linux Docker container default umask may leave file readable

## 4. Writer Changes

**Decision**: Before writing `.mcp.json`, strip `accessToken`, `auth`, `pendingCodeVerifier` from each entry.

**Rationale**:
- Ensures `.mcp.json` never contains secrets after migration
- Writer function is the single point where config is serialized
- Stripping is non-destructive — auth data lives in `.mcp-auth.json`

## 5. Library Decision: `conf`

**Decision**: Use the `conf` npm package (~15kB) for `.mcp-auth.json` storage instead of raw `fs` calls.

**Rationale**:
- Provides atomic writes, preventing corruption on crash
- Built-in schema validation for stored data
- Automatic file creation and JSON parsing
- Configurable file permissions (cwd, configName)
- Eliminates ~30 lines of custom code vs raw `fs`

**Alternatives considered**:
- Raw `fs` + `chmod` (custom) — < 50 lines, no dep, but no atomicity
- `cosmiconfig` — ~30kB, overkill for this use case

## 6. No Frontend Changes

**Decision**: Frontend is not affected — it never reads OAuth data directly, only through backend APIs.

**Rationale**:
- Frontend calls `GET /api/mcps` which doesn't expose tokens (FR-008 already)
- Frontend calls `POST /api/auth/:name/start` for auth URL — no token exposure
- All token handling is server-side
