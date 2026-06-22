# Quickstart Validation: OAuth2 MCP Auth

## Prerequisites

- Running Weir instance (dev or production)
- An HTTP MCP server that returns 401 and supports OAuth2 well-known discovery (e.g., ClickUp MCP)
- The MCP must be configured in `.mcp.json`
- A registered OAuth2 client with the MCP provider (client_id stored in `auth.clientId` in `.mcp.json`)
- All prerequisites from [specs/003-edit-mcp-config/quickstart.md](../../003-edit-mcp-config/quickstart.md)

## Setup

```bash
# Ensure dev environment is running
docker compose -f docker-compose.dev.yml up

# Verify ClickUp MCP is configured (should return 401)
curl -s http://localhost:3000/api/mcps | python3 -m json.tool
```

## Validation Scenarios

### 1. Shield Button Appears on 401

1. Open the Weir dashboard (http://localhost:5173)
2. Locate an HTTP MCP card with error status (e.g., ClickUp)
3. Verify the card shows a shield icon (ShieldAlert) in the footer
4. Verify tooltip shows "OAuth2 authorization required"

### 2. Shield Button Opens Popup

1. Click the shield button
2. Verify a popup window opens with the OAuth2 authorization URL
3. Verify the popup URL contains `response_type=code` and `redirect_uri`

### 3. OAuth2 Authorization Flow

1. In the popup, log in and authorize the application
2. After authorization, the popup should redirect to the Weir callback page
3. The callback page should display "Authorization successful" and auto-close
4. The popup should close automatically

### 4. Post-Auth Connection

1. After popup closes, click the Reconnect button on the card
2. Verify the connection now succeeds (status changes to "connected")
3. Verify the `.mcp.json` file now contains an `accessToken` field for the MCP

### 5. Token Persistence on Reload

1. Reload the dashboard page
2. Verify the MCP card still shows "connected" status
3. Verify the `accessToken` is still present in `.mcp.json`

### 6. Token Expiry / Re-auth

1. Manually remove or invalidate the `accessToken` from `.mcp.json`
2. Reload the dashboard
3. Verify the card shows error status again
4. Verify the shield button reappears
5. Repeat the authorization flow to obtain a new token

### 7. Popup Blocked

1. In browser settings, block popups for the Weir site
2. Click the shield button
3. Verify a toast appears: "Popup blocked. Please allow popups for this site."

## Expected Outcomes

- All auth UI elements in English per Constitution III
- Shield icon from lucide-react (ShieldAlert) per Constitution VI
- Token stored in `.mcp.json` — no parallel config
- OAuth2 discovery works without manual configuration for well-known-compliant MCPs
- Backend API endpoints conform to contracts defined in [contracts/api.md](./contracts/api.md)
- Data model follows [data-model.md](./data-model.md)
