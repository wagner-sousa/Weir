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
2. Click the "Adicionar MCP" button at top right
3. Select transport type "stdio"
4. Fill "Comando" with `npx`, "Argumentos" with `-y @modelcontextprotocol/server-filesystem /tmp`
5. Click "Testar Conexão" — verify success indicator
6. Click "Salvar" — verify success toast and card appears in grid
7. Verify `.mcp.json` now contains the new entry (flat format)

### 2. Remove MCP

1. On the MCP card just created, click "Remover" in the card footer
2. Verify success toast "removido" appears
3. Verify card is removed from grid
4. Verify `.mcp.json` no longer contains the entry

### 3. Connection Status

1. Add an MCP with an invalid command (e.g., `command: "nonexistent-binary"`)
2. Verify red connection icon appears at top right of card
3. Hover the icon — verify tooltip shows error reason
4. Refresh the page — verify status updates via SSE

### 4. Tool Count Badge

1. After adding a valid MCP (e.g., filesystem server), wait for connection
2. Verify card footer shows a badge with tool count (e.g., "5 ferramentas")

### 5. Modal Validation

1. Open "Adicionar MCP" modal
2. Select "http" transport type
3. Verify "Comando" field is hidden and "URL" field is shown
4. Click "Salvar" with empty URL — verify validation error
5. Fill invalid URL (e.g., "not-a-url") — verify validation error

### 6. Modal Close & Confirmation

1. Open "Adicionar MCP" modal and start a connection test
2. Attempt to close the browser tab — verify `beforeunload` warning "Alterações não salvas serão perdidas. Continuar?"
3. Dismiss warning — verify modal stays open
4. Close the modal via the X button — no confirmation dialog (only beforeunload protects during test)

### 7. Args Field

1. Open "Adicionar MCP" modal, select "stdio"
2. In the "Argumentos" field, type `-y @modelcontextprotocol/server-filesystem /tmp`
3. Verify args are space-separated (no chip/tag UI)
4. Save — verify `.mcp.json` contains `"args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"]`

### 8. Environment Variables (stdio)

1. Open "Adicionar MCP" modal, select "stdio"
2. Verify env section is visible below args
3. Click "+ Adicionar variável" — verify two fields appear (variable name + value)
4. Fill name "MY_TOKEN" and value "secret123"
5. Add another variable "DEBUG" with value "true"
6. Verify both rows are shown with inline editing
7. Remove one variable via delete button — verify row disappears
8. Save the MCP — verify `.mcp.json` contains the `env` object with the entered variables

### 9. Duplicate Name Handling

1. Add an MCP named "test-server"
2. Open modal and try to add another MCP named "test-server"
3. Verify error toast about duplicate name and save is prevented

### 10. Connection States (Connecting / Disconnected)

1. Add an MCP with a slow-to-respond URL
2. Verify yellow hourglass icon appears during connection attempt
3. After timeout (5s), verify hourglass turns to red error icon
4. Create a fresh page load without checking any MCP — verify all status icons are muted/gray
5. Verify tool count badge shows "?" for disconnected MCPs

### 11. Card Footer Layout

1. Add any MCP that connects successfully
2. Verify footer order: tool count badge (left), Remover (right)

### 12. File Permission Errors

1. Make `.mcp.json` read-only: `chmod 444 .mcp.json`
2. Try to add a new MCP — verify toast "Erro ao adicionar MCP"
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

### 15. SSE Status Updates

1. Open two browser tabs to the dashboard
2. Add/remove MCPs in one tab
3. Verify the other tab receives status updates via SSE within 30s

## Expected Outcomes

- All toasts appear in English
- .mcp.json is the single source of truth (changes reflected immediately)
- No parallel configuration mechanism exists
- Backend API endpoints conform to contracts defined in [contracts/api.md](./contracts/api.md)
- Data model follows [data-model.md](./data-model.md)
