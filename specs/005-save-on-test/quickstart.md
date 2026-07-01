# Quickstart Validation: Save on Test

## Prerequisites

- Running Weir instance (dev or production)
- An HTTP MCP server that returns 401 and supports OAuth2 (e.g., ClickUp MCP) — for OAuth2 scenarios
- A stdio command like `echo` for non-OAuth2 scenarios
- Popups allowed for the Weir site in the browser (for OAuth2 auto-popup)

## Setup

```bash
# Ensure dev environment is running
docker compose -f docker-compose.dev.yml up -d dev
```

## Validation Scenarios

### 1. Test Connection Auto-Saves on Success

1. Open the Weir dashboard (http://localhost:5173)
2. Click "Add MCP"
3. Fill: Name = "echo-test", Type = stdio, Command = "echo", Args = "hello"
4. Click "Test Connection"
5. **Expected**: Modal closes automatically after the test succeeds
6. **Expected**: "echo-test" card appears on the dashboard with "connected" status

### 2. Test Connection Auto-Saves on needsAuth

1. Click "Add MCP"
2. Fill: Name = "http-auth", Type = HTTP, URL = a URL that returns 401 with OAuth2 well-known
3. Click "Test Connection"
4. **Expected**: Modal closes automatically after test returns needsAuth
5. **Expected**: "http-auth" card appears with error status and shield icon

### 3. Test Connection Does NOT Auto-Save on Error

1. Click "Add MCP"
2. Fill: Name = "bad", Type = HTTP, URL = "http://localhost:1"
3. Click "Test Connection"
4. **Expected**: Modal stays open, error message shown in red
5. **Expected**: No MCP card created on dashboard

### 4. Save Triggers Auto-Test on Success

1. Click "Add MCP"
2. Fill: Name = "auto-test-ok", Type = stdio, Command = "echo"
3. Click "Save" (without testing first)
4. **Expected**: Auto-test runs, MCP is saved, modal closes
5. **Expected**: "auto-test-ok" card appears on dashboard

### 5. Save Triggers Auto-Test + OAuth2 Popup

1. Click "Add MCP"
2. Fill: Name = "auto-oauth", Type = HTTP, URL = a URL returning 401 with OAuth2
3. Ensure `auth.clientId` is configured in `.mcp.json` for this MCP (or use an MCP with registration endpoint)
4. Click "Save" (without testing first)
5. **Expected**: Auto-test runs, MCP is saved, modal closes
6. **Expected**: OAuth2 authorization popup opens automatically
7. Complete auth in popup → popup closes

### 6. Auto-Test on Save with Missing clientId

1. Click "Add MCP"
2. Fill: Name = "no-client", Type = HTTP, URL = a URL returning 401 with OAuth2
3. Ensure **no** `auth.clientId` is configured
4. Click "Save"
5. **Expected**: Auto-test runs, MCP is saved, modal closes
6. **Expected**: Warning toast: "OAuth2 client_id not configured. See card for details."
7. **Expected**: No popup opens automatically
8. **Expected**: Shield icon visible on the card

### 7. Auto-Test on Save Returns Error

1. Click "Add MCP"
2. Fill: Name = "auto-test-fail", Type = HTTP, URL = "http://localhost:1"
3. Click "Save" (without testing first)
4. **Expected**: Auto-test runs, error displayed in modal
5. **Expected**: Modal stays open, MCP is NOT saved
6. **Expected**: No card created on dashboard

### 8. Edit Mode — Test Auto-Saves

1. Click "Edit" on an existing MCP card
2. Change the command/URL
3. Click "Test Connection"
4. **Expected**: Modal closes, updated config saved
5. Verify: reopen the edit modal for that MCP, see updated values

### 9. Save Button Disabled During Auto-Test

1. Click "Add MCP"
2. Fill valid config, click "Save"
3. **Expected**: Save button text changes to "Testing..."
4. **Expected**: Save button is disabled
5. **Expected**: Test Connection button is also disabled

### 10. Click-Count Reduction (SC-001)

1. Open the Weir dashboard (http://localhost:5173)
2. Click "Add MCP"
3. Fill: Name = "click-test", Type = stdio, Command = "echo", Args = "hello"
4. Click "Test Connection"
5. **Expected**: Modal closes automatically (total clicks: 2 — fill form + test)
6. **Old flow**: 3 clicks (fill form + test + save) — this feature eliminates the extra "Save" click

## Expected Outcomes

- All user-facing text in English per Constitution III
- No new backend endpoints required
- No .mcp.json schema changes
- Auto-save on Test eliminates one click from the add flow (SC-001)
- OAuth2 popup opens automatically on Save with clientId (SC-002)
- Error cases display clear messages and do not save invalid configs
