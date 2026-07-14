# Quickstart: Tools Visibility Toggle

**Feature**: 015-tools-visibility-toggle
**Date**: 2026-07-14

## Prerequisites

- Weir backend running (`docker compose -f docker-compose.dev.yml up dev` or `npm run dev`)
- Weir frontend running (separate terminal or via Docker)
- At least one MCP configured and connected in `.mcp.json`
- MCP has at least 2 tools available

## Validation Scenarios

### V1: Toggle Individual Tool

1. Open the dashboard in a browser
2. Find a connected MCP card with tools (wrench icon visible)
3. Click the wrench icon to open the Tools Modal
4. Verify all tools are listed and all toggles show "enabled"
5. Click the toggle on one tool to disable it
6. Verify the tool's row becomes visually muted/dimmed
7. Close the modal
8. Click the wrench icon again
9. Verify the previously disabled tool is still disabled (persistence check)
10. **Expected**: Disabled tool remains disabled after modal close/reopen

### V2: API Filtering

1. With a tool disabled (from V1), call the tools endpoint:
   ```bash
   curl http://localhost:3000/api/mcps/<name>/tools
   ```
2. **Expected**: Disabled tool is NOT in the response
3. Call with `includeDisabled=true`:
   ```bash
   curl http://localhost:3000/api/mcps/<name>/tools?includeDisabled=true
   ```
4. **Expected**: All tools listed, disabled tool has `"enabled": false`

### V3: Bulk Actions

1. Open the Tools Modal for an MCP
2. Click "Disable All"
3. **Expected**: All tool toggles switch to disabled, all rows become muted
4. Click "Enable All"
5. **Expected**: All tool toggles switch to enabled, all rows return to normal

### V4: Persistence Across Restart

1. Disable a tool in the Tools Modal
2. Restart the backend (`docker compose -f docker-compose.dev.yml restart backend` or restart `npm run dev`)
3. Open the Tools Modal again
4. **Expected**: The tool is still disabled

### V5: New Tool Defaults

1. Note the current tool list for an MCP
2. Add a new tool to the MCP backend (if possible)
3. Refresh the dashboard
4. Open the Tools Modal
5. **Expected**: The new tool appears with enabled=true (not in visibility config)

### V6: Corrupted Config

1. Manually edit `tool-visibility.json` and introduce invalid JSON
2. Restart the backend
3. Open the Tools Modal
4. **Expected**: All tools show as enabled (fallback), no crash

## Expected Artifacts Created

After running `/speckit.tasks` and `/speckit.implement`:

- `backend/src/tool-visibility/` — visibility module (load, save, filter)
- `backend/src/api/mcp.routes.ts` — new endpoints added
- `backend/src/proxy/index.ts` — tools/list filtering in sendOneMessage
- `backend/src/mcp/mcp.routes.ts` — tools/list filtering in SSE sessions
- `frontend/src/components/ToolsModal.tsx` — new modal component
- `frontend/src/components/MCPCard.tsx` — wrench button added
- `frontend/src/services/api.ts` — new API functions
- `frontend/src/hooks/useToolVisibility.ts` — new React Query hook
