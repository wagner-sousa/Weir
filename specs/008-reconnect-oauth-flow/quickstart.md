# Quickstart Validation: Reconnect OAuth Flow

## Prerequisites

- Running Weir instance (dev or production)
- An HTTP MCP configured that requires OAuth2 (e.g., ClickUp, MercadoPago)
- Popups allowed for the Weir site in the browser

## Setup

```bash
docker compose -f docker-compose.dev.yml up -d dev
```

## Validation Scenarios

### 1. Reconnect Opens OAuth Popup on HTTP + needsAuth

1. Open the Weir dashboard (http://localhost:5173)
2. Locate an HTTP MCP card with error status and shield icon (e.g., ClickUp)
3. Click "Reconnect"
4. **Expected**: OAuth2 authorization popup opens automatically
5. Complete the auth flow in the popup
6. **Expected**: After popup closes, card shows "connected" status

### 2. Reconnect Shows Error on Non-HTTP MCP

1. Locate a stdio MCP card (e.g., Bitbucket)
2. Click "Reconnect"
3. **Expected**: Connection test runs, toast shows success or error
4. **Expected**: No OAuth popup opens

### 3. Reconnect Shows Error on HTTP Without Auth

1. Configuring an HTTP MCP that returns a non-auth error (e.g., HTTP 500)
2. Click "Reconnect"
3. **Expected**: Error toast shown, no OAuth popup opens

### 4. Popup Blocked Handling

1. Block popups in the browser for the Weir site
2. Click "Reconnect" on an HTTP MCP with needsAuth
3. **Expected**: Toast "Popup blocked. Please allow popups for this site."

## Expected Outcomes

- HTTP MCPs with needsAuth trigger OAuth2 popup on Reconnect (1 click instead of 2)
- Non-HTTP MCPs and HTTP without auth continue using existing reconnect
- No backend changes required
