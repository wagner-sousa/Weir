# Research: Reconnect OAuth Flow

## 1. When to Open Popup vs Test Connection

**Decision**: In `handleReconnect`, check `client.needsAuth && client.transport === 'http'` before deciding flow.

**Rationale**:
- `client.needsAuth` is set by the backend when the MCP returns 401 and OAuth2 discovery succeeds
- `client.transport === 'http'` ensures only HTTP MCPs trigger auth popup (stdio/SSE don't support OAuth2)
- If both conditions true: call `handleAuth(client)` which opens popup
- Otherwise: call existing `POST /api/mcps/test-connection` flow

**Alternatives considered**:
- Let reconnect always test, then check result for needsAuth — extra network round-trip
- Check only needsAuth (ignore transport type) — could attempt OAuth2 for non-HTTP MCPs

## 2. Reusing handleAuth

**Decision**: Call the existing `handleAuth(client)` directly. No new API calls needed.

**Rationale**:
- `handleAuth` already handles: fetch auth URL, window.open, popup monitoring, toast on blocked
- No need to duplicate this logic
- The function is already defined in CardGrid.tsx

## 3. Loading State During Auth

**Decision**: While auth popup is opening, keep the reconnecting state (button shows spinner). Reset after popup opens.

**Rationale**:
- `setReconnectingName(client.name)` already sets the loading state
- The auth popup opens asynchronously — keep spinner until `window.open` is called
- After popup opens, reset reconnecting state
