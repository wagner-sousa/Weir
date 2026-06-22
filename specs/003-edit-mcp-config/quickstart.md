# Quickstart Validation: Editar Configuração de MCP

## Prerequisites

- Running Weir instance (dev or production)
- `.mcp.json` file at project root with at least one configured MCP
- All prerequisites from [specs/002-mcp-connection-manager/quickstart.md](../../002-mcp-connection-manager/quickstart.md)

## Setup

```bash
# Ensure dev environment is running
docker compose -f docker-compose.dev.yml up
```

## Validation Scenarios

### 1. Edit MCP via Modal

1. Open the Weir dashboard (http://localhost:5173 in dev)
2. Locate an existing MCP card
3. Click the Pencil icon (Edit) on the card
4. Verify the edit modal opens with all fields pre-populated:
   - Name field shows the current MCP name
   - Transport type selector shows the current type
   - For stdio: command, args (as chips), and env vars are pre-filled
   - For http/sse: URL is pre-filled
5. Change a field (e.g., modify the command)
6. Click "Save"
7. Verify success toast appears and card reflects the new values
8. Verify `.mcp.json` contains the updated entry

### 2. Edit and Rename

1. Open edit modal for an MCP named "server-a"
2. Change the name to "server-b"
3. Click "Save"
4. Verify success toast appears
5. Verify the card now shows "server-b"
6. Verify `.mcp.json` has `"server-b"` key and `"server-a"` key is removed

### 3. Edit with Transport Type Change

1. Open edit modal for a stdio MCP
2. Change transport type from "stdio" to "http"
3. Verify confirmation dialog appears: "Changing transport type will clear type-specific fields. Continue?"
4. Click "Continue"
5. Verify command/args/env fields are replaced by URL field
6. Fill a valid URL (e.g., `http://localhost:3101`)
7. Click "Save"
8. Verify `.mcp.json` now has http transport with URL (no command/args/env)

### 4. Cancel Transport Type Change

1. Open edit modal for a stdio MCP
2. Change transport type to "http"
3. When confirmation appears, click "Cancel"
4. Verify transport type reverts to "stdio"
5. Verify command/args/env fields remain intact with original values

### 5. Duplicate Name Validation

1. Ensure two MCPs exist: "server-a" and "server-b"
2. Open edit modal for "server-a"
3. Change the name to "server-b" (same as the other MCP)
4. Verify inline validation error below the name field
5. Verify "Save" button is disabled
6. Verify the modal does not close

### 6. Self-Rename Allowed

1. Open edit modal for "server-a"
2. Change name to "server-a" (same name) or any variation
3. Verify no validation error (same name is always allowed)
4. Click "Save" — verify success

### 7. Cancel Edit Reverts No Changes

1. Open edit modal for an MCP
2. Change several fields
3. Click "Cancel"
4. Verify confirmation dialog: "Unsaved changes will be lost. Continue?"
5. Click "Continue"
6. Verify `.mcp.json` is unchanged
7. Verify card still displays original values

### 8. Edit Deleted MCP

1. Open edit modal for an MCP
2. While modal is open, manually delete the MCP from `.mcp.json` (simulate external deletion)
3. Click "Save" in the modal
4. Verify toast error: "MCP not found. It may have been removed."
5. Verify modal closes and grid refreshes

### 9. Connection Test During Edit

1. Open edit modal for an MCP
2. Modify the URL or command
3. Click "Test Connection"
4. Verify spinner on Test Connection button, Save button disabled
5. On success: verify green check indicator
6. On failure: verify error reason displayed inline
7. Click "Save" — verify edit saves successfully

### 10. Beforeunload During Edit Test

1. Open edit modal, start a connection test
2. Attempt to close the browser tab
3. Verify `beforeunload` warning appears
4. Dismiss the warning
5. Verify test continues and completes

### 11. Edit MCPCard UI

1. Verify each MCP card has a Pencil icon (Edit button) at a consistent position
2. Click the Pencil icon — verify edit modal opens
3. Verify the Pencil icon has an accessible aria-label

## Expected Outcomes

- All toasts, labels, and validation messages in English (Constitution III)
- Edit icon from lucide-react (`Pencil`) (Constitution VI)
- `.mcp.json` is the single source of truth — changes reflected immediately
- Backend API endpoints conform to contracts defined in [contracts/api.md](./contracts/api.md)
- Data model follows [data-model.md](./data-model.md)
