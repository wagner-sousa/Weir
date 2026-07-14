# Data Model: Tools Visibility Toggle

**Feature**: 015-tools-visibility-toggle
**Date**: 2026-07-14

## Entities

### ToolVisibilityConfig

Persisted in `<configDir>/tool-visibility.json`. Top-level keys are MCP server names. Values are maps of tool names to booleans (`true` = enabled, `false` = disabled).

```json
{
  "Bitbucket": {
    "getPullRequests": true,
    "getPullRequest": false,
    "createPullRequest": true
  },
  "ClickUp": {
    "clickup_get_task": false
  }
}
```

**Schema** (Zod):
```typescript
const ToolVisibilityConfig = z.record(
  z.string(),                              // MCP server name
  z.record(z.string(), z.boolean()),       // tool name → enabled
);
```

**TypeScript type**:
```typescript
type ToolVisibilityMap = Record<string, Record<string, boolean>>;
```

### ToolWithVisibility

Derived type combining raw tool data from the MCP backend with the user's visibility setting.

```typescript
interface ToolWithVisibility {
  name: string;
  description?: string;
  enabled: boolean;  // from ToolVisibilityMap, defaults to true
}
```

## State Transitions

### Tool Visibility Toggle

```
[enabled: true] ──toggle off──▶ [enabled: false]
[enabled: false] ──toggle on──▶ [enabled: true]
```

### Bulk Operations

```
"All enabled" ──disable all──▶ "All disabled"
"All disabled" ──enable all──▶ "All enabled"
"Mixed state" ──disable all──▶ "All disabled"
"Mixed state" ──enable all──▶ "All enabled"
```

### New Tool Discovery

```
New tool appears on MCP (not in visibility map) ──default──▶ [enabled: true]
```

## Validation Rules

| Rule | Description |
|------|-------------|
| VR-001 | Tool visibility config MUST be a valid JSON object with string keys |
| VR-002 | Each MCP entry MUST be a record of tool names to booleans |
| VR-003 | Corrupted or invalid config MUST be handled by falling back to all tools enabled |
| VR-004 | Empty MCP entries (all tools removed from visibility map) are allowed |

## File Location

- **Path**: `<configDir>/tool-visibility.json` (same directory as `.mcp.json`)
- **Gitignored**: Yes (user-specific config)
- **Format**: Pretty-printed JSON with 2-space indent

## Relationships

```
ToolVisibilityConfig ──per MCP name──▶ .mcp.json mcpServers entries
ToolVisibilityConfig ──per tool name──▶ tools/list JSON-RPC response tools
```

Tool visibility is independent of field projections. A tool can be:
- Enabled + no projection (full tool exposed)
- Enabled + with projection (tool exposed with filtered fields)
- Disabled (tool completely hidden from clients)
