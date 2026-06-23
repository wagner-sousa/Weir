# Research: Editar Configuração de MCP

## 1. Component Architecture: Edit vs Add Modal

**Decision**: Extend `AddMCPModal` to accept an optional `existingMCP` prop.

**Rationale**:
- The edit form is functionally identical to the add form (same fields, validation, test-connection, save flow)
- Differences are minimal: pre-populated fields, different title, update vs append on save
- A single component with conditional logic avoids code duplication and keeps behavior consistent
- No dedicated `EditMCPModal` component — the modal determines mode via prop presence

**When `existingMCP` is provided**:
- Title changes to "Edit MCP"
- All fields pre-populated from prop
- Save calls `PUT /api/mcps/:originalName` instead of `POST /api/mcps`
- Transport type change shows confirmation dialog before clearing type-specific fields
- Name uniqueness excludes the original name (self-rename allowed)

**Alternatives considered**:
- Dedicated `EditMCPModal` component — leads to code duplication, harder to maintain
- Generic `MCPForm` base component extracted from `AddMCPModal` — more refactoring than necessary; YAGNI

## 2. Writer: Update Entry Strategy

**Decision**: Add `updateEntry(originalName: string, data: MCPClient)` to writer.ts.

**Rationale**:
- When name changes: delete old key, write new key — atomic in a single write call
- When name unchanged: just update the value at the existing key
- Uses the same `writeMCPConfig` + validation flow as add/remove
- Triggers file watcher + WebSocket broadcast (`config:changed`) automatically

**Write steps**:
1. Read current .mcp.json via `loadMCPConfig()`
2. Validate name uniqueness (skip check against `originalName`)
3. Build updated `mcpServers` object:
   - If name changed: `delete config.mcpServers[originalName]`, set `config.mcpServers[newName] = data`
   - If name unchanged: `config.mcpServers[name] = data`
4. Write to .mcp.json (pretty-printed)
5. File watcher detects change → broadcast `config:changed`

**Error cases**:
- `originalName` not found → 404 "MCP not found"
- Permission error → 403 toast
- Validation failure → 400 with specific error

## 3. PUT Endpoint Schema

**Decision**: PUT /api/mcps/:name uses same body schema as POST /api/mcps (Zod-validated).

**Rationale**:
- The request body is identical to POST — full MCP entry with all fields
- Reuse existing Zod schemas from schema.ts (flat + nested normalization)
- The `:name` param in the URL is the original name (used to locate the old entry)
- The body's `name` field may differ from `:name` param (indicates rename intent)

**Endpoint**: `PUT /api/mcps/:name`
- Body: same as POST /api/mcps (name, transport/type/command/args/url/env)
- Response 200: `{ success: true, name: "new-name" }`
- Response 404: `{ success: false, error: "MCP 'old-name' not found." }`
- Response 409: `{ success: false, error: "An MCP with the name 'new-name' already exists." }`
- Response 400: validation errors
- Response 403: permission errors
- Response 503: backend unreachable

## 4. Frontend Flow for Edit

**Decision**: Edit flow follows the same mutation pattern as add.

1. User clicks Pencil icon on MCPCard
2. EditMCPModal opens (AddMCPModal with `existingMCP` prop)
3. Fields pre-populated from `existingMCP` data
4. User modifies fields
5. Click "Test Connection" → POST /api/mcps/test-connection (same as add)
6. Click "Save" → `PUT /api/mcps/:originalName` → invalidate query → refetch
7. On success: toast, modal closes, card grid refreshes
8. On error: toast, modal stays open

**Unsaved changes detection**: Same as AddMCPModal — tracks dirty state, shows confirmation dialog on close/escape.

**beforeunload**: Same as AddMCPModal — only active during connection test.

## 5. MCPCard Edit Button

**Decision**: Add a Pencil icon (lucide-react `Pencil`) to the existing MCPCard.

**Alternatives considered**:
- Card itself clickable for edit — conflicts with existing card interactions (status, reconnect, remove)
- Edit in a dropdown menu — unnecessary complexity for single action

**Position**: Bottom right of the card, next to the Remove button. Both are icon-only buttons of consistent size.

## 6. Name Change SSE Invalidation

**Decision**: When an MCP is renamed, the SSE stream treats the old name as removed and the new name as a new MCP.

**Rationale**:
- The frontend invalidates and refetches all MCPs after save
- The SSE `done` event triggers a full re-evaluation of all connections
- No need for special "rename" SSE event — the refetch + re-evaluation cycle handles it
- The status map clears the old name and populates the new name on next SSE batch
