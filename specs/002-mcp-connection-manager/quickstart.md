# Quickstart Validation: MCP Connection Manager

## Prerequisites

- Running Weir instance (dev or production)
- `.mcp.json` file at project root (can be empty: `{ "mcpServers": {} }`)

## Setup

```bash
# Ensure dev environment is running
docker compose -f docker-compose.dev.yml up

# Or in production
docker compose up
```

## Validation Scenarios

### 1. Add MCP via Modal

1. Open the Weir dashboard (http://localhost:5173 in dev, http://localhost:3000 in prod)
2. Click the "Add MCP" button at top right
3. Select transport type "stdio"
4. Fill "command" with `npx`, "args" with `["-y", "@modelcontextprotocol/server-filesystem", "/tmp"]`
5. Click "Test Connection" — verify success indicator
6. Click "Save" — verify success toast and card appears in grid
7. Verify `.mcp.json` now contains the new entry (flat format)

### 2. Remove MCP

1. On the MCP card just created, click "Remove" in the card footer
2. Verify success toast appears
3. Verify card is removed from grid
4. Verify `.mcp.json` no longer contains the entry

### 3. Connection Status

1. Add an MCP with an invalid command (e.g., `command: "nonexistent-binary"`)
2. Verify red connection icon appears at top right of card
3. Hover the icon — verify tooltip shows error reason
4. Click "Reconnect" — verify status updates

### 4. Tool Count Badge

1. After adding a valid MCP (e.g., filesystem server), wait for connection
2. Verify card footer shows a badge with tool count (e.g., "5 tools")

### 5. Modal Validation

1. Open "Add MCP" modal
2. Select "http" transport type
3. Verify "command" field is hidden and "url" field is shown
4. Click "Save" with empty URL — verify validation error
5. Fill invalid URL (e.g., "not-a-url") — verify validation error

### 6. Modal Close & Confirmation

1. Open "Add MCP" modal and fill some fields
2. Press Esc — verify confirmation dialog "Alterações não salvas serão perdidas. Continuar?"
3. Click Cancel — verify modal stays open
4. Click X close button — verify confirmation again
5. Click outside modal — verify confirmation again
6. Fill nothing and press Esc — verify modal closes without confirmation

### 7. args Chips UI

1. Open "Add MCP" modal, select "stdio"
2. In the args field, type "-y" and click "Add"
3. Verify chip/tag appears with "-y" and an X to remove
4. Add "bitbucket-mcp@latest" — verify second chip
5. Click X on "-y" chip — verify it is removed
6. Save — verify `.mcp.json` contains `"args": ["bitbucket-mcp@latest"]`

### 8. Environment Variables (stdio)

1. Open "Add MCP" modal, select "stdio"
2. Verify env section is visible below args
3. Click "Add variable" — verify two fields appear (variable name + value)
4. Fill name "MY_TOKEN" and value "secret123"
5. Add another variable "DEBUG" with value "true"
6. Verify table shows both rows with inline editing
7. Remove one variable via delete button — verify row disappears
8. Save the MCP — verify `.mcp.json` contains the `env` object with the entered variables

### 9. Duplicate Name Handling

1. Add an MCP named "test-server"
2. Open modal and try to add another MCP named "test-server"
3. Verify error message about duplicate name and save is prevented

### 10. Connection States (Connecting / Disconnected)

1. Add an MCP with a slow-to-respond URL
2. Verify amber/yellow spinner appears during connection attempt
3. After timeout (5s), verify spinner turns to red error icon
4. Create a fresh page load without checking any MCP — verify all status icons are muted/gray
5. Verify tool count badge shows "?" for disconnected MCPs

### 11. Card Footer Layout

1. Add any MCP that connects successfully
2. Verify footer order: tool count badge (left), Reconnect (center), Remove (right)

### 12. File Permission Errors

1. Make `.mcp.json` read-only: `chmod 444 .mcp.json`
2. Try to add a new MCP — verify toast "Arquivo não pôde ser lido/escrito"
3. Restore permissions: `chmod 644 .mcp.json`

### 13. Malformed .mcp.json on Load

1. Replace `.mcp.json` with invalid JSON: `echo "{invalid" > .mcp.json`
2. Refresh the dashboard — verify toast with error and raw JSON displayed
3. Restore valid `.mcp.json`
4. Replace with empty config: `echo '{"mcpServers":{}}' > .mcp.json`
5. Refresh — verify empty grid with no toast

### 14. Browser Refresh During Test

1. Open modal, start a connection test
2. Before test completes, attempt to refresh — verify `beforeunload` warning
3. Dismiss warning — verify test continues

### 15. CI Test for SC-001

1. Set `MCP_ADD_TIMEOUT=5000` env var
2. Run automated UI test: add MCP via API → verify completion under 5s

## Expected Outcomes

- All toasts appear in pt-BR
- .mcp.json is the single source of truth (changes reflected immediately)
- No parallel configuration mechanism exists
- Backend API endpoints conform to contracts defined in [contracts/api.md](./contracts/api.md)
- Data model follows [data-model.md](./data-model.md)
