# Research: OAuth2 MCP Auth

## 1. OAuth2 Well-Known Discovery

**Decision**: Fetch `/.well-known/oauth-authorization-server` from the MCP server's origin on 401.

**Rationale**:
- ClickUp MCP at `https://mcp.clickup.com/.well-known/oauth-authorization-server` returns valid OAuth2 metadata including `authorization_endpoint` and `token_endpoint`
- MCP OAuth2 spec defines this as the standard discovery mechanism
- No additional configuration needed from the user

**Alternatives considered**:
- Manual auth URL in `.mcp.json` — requires user configuration, prone to errors
- Parsing `WWW-Authenticate` header — less structured, MCP servers don't reliably return it

## 2. Token Exchange Strategy

**Decision**: Backend handles code exchange at the MCP's `token_endpoint` using native `fetch`.

**Rationale**:
- The OAuth2 flow: popup → authorization → redirect to callback → backend exchanges code → stores token
- Backend callback receives the `?code=` from the provider redirect
- Token stored as `accessToken` in the MCP entry (preserved as extra field by existing writer)
- No additional npm dependencies needed — native `fetch` supports all required HTTP

**Alternatives considered**:
- Frontend-only flow (implicit grant) — less secure, token exposed in URL
- Dedicated OAuth2 library — unnecessary complexity for a single endpoint call

## 3. Popup Management

**Decision**: `window.open` with dimensions 600x700, target `_blank`.

**Rationale**:
- Standard popup-based OAuth2 flow
- Dimensions fit most provider authorization pages (ClickUp, etc.)
- `window.open` returns a reference to monitor popup close

**Fallback**:
- If `window.open` returns null or throws, popup was blocked → show toast
- User must allow popups for the site

## 4. Bearer Token Usage

**Decision**: Read `accessToken` from the MCP entry in `.mcp.json`, pass it in `Authorization: Bearer` header.

**Rationale**:
- The loader already reads the full MCP entry (including extra fields)
- Need to pass the token through `TransportConfig` or extend `testConnection` to accept it
- Add optional `accessToken` field to `TransportConfig`

## 5. No Client Registration

**Decision**: User must register their app with the MCP provider separately. The `client_id` is stored in `.mcp.json` as `auth.clientId`.

**Rationale**:
- OAuth2 requires client registration for security
- Weir is a generic dashboard — it can't pre-register with every MCP provider
- The `registration_endpoint` from well-known metadata can be used for dynamic registration in future

## 6. Auth Route Design

**Decision**: Dedicated `auth.routes.ts` file for OAuth2 endpoints.

**Rationale**:
- Separates auth concern from MCP CRUD operations
- Keeps `mcp.routes.ts` focused on connection management
- Follows same Fastify route registration pattern

**Endpoints**:
- `POST /api/auth/:name/start` — returns the authorization URL with params
- `POST /api/auth/:name/callback` — receives code, exchanges for token, stores it
- `GET /api/auth/:name/callback` — handles provider redirect to callback
