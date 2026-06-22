# Data Model: Editar Configuração de MCP

## Entities

The same entities defined in [specs/002-mcp-connection-manager/data-model.md](../002-mcp-connection-manager/data-model.md)
apply here. This document only describes additions and modifications for the edit operation.

### MCPEntry — Edit Operation

The edit operation adds a new transition on the `MCPEntry` lifecycle:

```
add → edit (name unchanged) → status reset NOT required
add → edit (name changed)    → status reset to "disconnected" (key changed)
add → edit (transport changed) → status reset to "disconnected" + type-specific fields cleared
```

**Validation rules specific to edit** (from spec FR-004):
- Name uniqueness is checked against ALL MCPs EXCEPT the one being edited
- Changing to the same name is always allowed
- Changing to another MCP's existing name is blocked (409 response)

**Field transitions on transport type change** (from spec FR-003):

| From → To | Fields Cleared | Fields Preserved |
|-----------|---------------|-----------------|
| stdio → http/sse | command, args, env | name, transport type |
| http/sse → stdio | url | name, transport type |
| stdio → stdio | none | all |
| http/sse → http/sse | none | all |

### File Operations — Update

**Update (Edit MCP)**:

1. Read current .mcp.json via `loadMCPConfig()`
2. Verify `originalName` exists in `mcpServers` (404 if not found)
3. Validate name uniqueness against all keys EXCEPT `originalName`
4. Build updated `mcpServers`:
   - If name changed: `delete mcpServers[originalName]`, set `mcpServers[newName] = normalizedData`
   - If name unchanged: set `mcpServers[name] = normalizedData`
5. Write to .mcp.json (pretty-printed, atomic)
6. File watcher detects change → broadcast `config:changed`
7. SSE batch re-evaluates all connections on next cycle

**Error cases**:
- `originalName` not found → 404
- Permission denied → 403 toast
- Validation failure → 400 with specific field error
- Backend unreachable → 503 toast
