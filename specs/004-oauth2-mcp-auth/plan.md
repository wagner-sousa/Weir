# Implementation Plan: OAuth2 MCP Auth

**Branch**: `004-oauth2-mcp-auth` | **Date**: 2026-06-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-oauth2-mcp-auth/spec.md`

## Summary

Allow users to authenticate HTTP MCP servers that require OAuth2 directly from the Weir dashboard. When an MCP returns 401, the backend auto-discovers OAuth2 configuration from the server's `/.well-known/oauth-authorization-server` endpoint. The frontend shows a shield icon button on the card; clicking it opens a popup to the authorization URL. After the user completes the OAuth2 flow, the token is stored in a separate auth storage file (`.mcp-auth.json`) and used for all subsequent requests. Keeping auth data separate from `.mcp.json` prevents token loss on config edits.

## Technical Context

**Language/Version**: Node.js 22, TypeScript 5.x (moduleResolution nodenext)

**Primary Dependencies**:
- Backend: Fastify + chokidar + zod (fetch for OAuth2 well-known discovery + token exchange)
- Frontend: React 18 + TanStack React Query + Vite
- Test: Vitest + supertest

**Storage**: Two files — `.mcp.json` for user-editable MCP configuration, `.mcp-auth.json` for OAuth2 runtime state (accessToken, refreshToken, expiresAt). Token data kept separate to prevent config edits from erasing auth state.

**Testing**: Vitest (unit + integration), supertest for API, mock OAuth2 discovery

**Target Platform**: Linux Docker container (existing docker-compose setup)

**Project Type**: Web application (backend API + React SPA)

**Performance Goals**:
- OAuth2 well-known discovery < 5s (SC-002)
- Post-auth connection test with Bearer token < 5s (SC-003)
- All auth UI interactions respond within 1s of user action

**Constraints**:
- No parallel config — .mcp.json is the single source of truth (Constitution IV)
- All dev commands via docker-compose (Dev Workflow 6)
- Lint before every commit (Dev Workflow 8)
- Docs updated in same commit (Dev Workflow 9)
- All user-facing text in English (Constitution III)
- All icons from lucide-react (Constitution VI)
- OAuth2 discovery and token exchange use native fetch (no new npm dependencies)

**Discovered OAuth2 Metadata**:
- Well-known URL: `https://{mcp-server-origin}/.well-known/oauth-authorization-server`
- Returned fields: authorization_endpoint, token_endpoint, registration_endpoint (optional), scopes_supported
- Discovery happens lazily on 401 — results cached for session only

**Token Flow**:
1. 401 received → discover well-known → return authUrl to frontend
2. User clicks shield → popup opens to authUrl + params (client_id, redirect_uri, response_type=code)
3. User authorizes → provider redirects to backend callback with `?code=...`
4. Backend exchanges code at token_endpoint → receives access_token
5. Backend stores access_token in `.mcp-auth.json` (auth storage, separate from config)
6. Subsequent requests include `Authorization: Bearer <token>` header

**Scale/Scope**: Single-user dashboard, file-based config, HTTP-transport MCPs only

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Assessment | Status |
|-----------|-----------|--------|
| I. SDD | OAuth2 callback endpoint needs schema; token stored as extra field (already supported) | ✅ Pass |
| II. Test-First | All new code needs tests before implementation | ✅ Pass |
| III. English UI | All toasts, labels, tooltips must be English | ✅ Pass |
| IV. .mcp.json Truth | Token stored in separate `.mcp-auth.json` — justified: prevents config edits (PUT/DELETE) from erasing auth state; `.mcp.json` remains the source of truth for user-editable config; auth data is runtime state not user configuration | ⚠️ Deviation (documented in spec/data-model) |
| V. Simplicity | Reuse existing fetch for discovery; no new npm deps | ✅ Pass |
| VI. Icon Library | Shield icon from lucide-react (ShieldAlert) | ✅ Pass |
| Dev Workflow 7 | No new config env vars needed | ✅ Pass |
| Dev Workflow 8 | Lint before commit | ✅ Pass |
| Dev Workflow 9 | Docs updated in same commit | ✅ Pass |

**No violations found.**

## Project Structure

### Documentation (this feature)

```text
specs/004-oauth2-mcp-auth/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── api.md            # API contracts (auth callback endpoint)
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── api/
│   │   ├── mcp.routes.ts       # EXTENDED: auth fields in /api/mcps response
│   │   └── auth.routes.ts      # NEW: OAuth2 callback endpoints
│   ├── config/
│   │   └── writer.ts           # No changes needed (preserves extra fields)
│   └── services/
│       └── mcp-client.ts       # EXTENDED: OAuth2 discovery, Bearer token support
├── tests/
│   ├── unit/
│   │   └── writer.test.ts      # No changes
│   └── integration/
│       └── auth.test.ts        # NEW: OAuth2 endpoint tests

frontend/
├── src/
│   ├── components/
│   │   ├── MCPCard.tsx         # EXTENDED: shield button when needsAuth
│   │   └── CardGrid.tsx        # EXTENDED: auth popup handling
│   ├── services/
│   │   └── api.ts              # EXTENDED: MCPClient type with needsAuth/authUrl
│   └── hooks/
│       └── useMCPs.ts          # No changes
```

**Structure Decision**: Web application structure (Option 2) as established by the existing project. New auth.routes.ts follows the same pattern as mcp.routes.ts.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| IV. .mcp.json Truth (separate auth storage) | OAuth2 access tokens are runtime state, not user configuration. Storing them inline in `.mcp.json` causes token loss when users edit config via PUT/DELETE. The `writer.ts` `stripOAuthFields()` ensures tokens never leak into `.mcp.json`. | Storing in `.mcp.json` directly would require the writer to round-trip unknown fields — fragile and contrary to the principle of keeping the user-editable config clean of machine-managed state. |
