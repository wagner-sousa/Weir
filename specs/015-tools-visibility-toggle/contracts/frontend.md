# Frontend Contract: Tools Modal

**Feature**: 015-tools-visibility-toggle

## Component: ToolsModal

A modal dialog (Radix UI Dialog) that displays the tools for a specific MCP and allows toggling their visibility.

### Props

```typescript
interface ToolsModalProps {
  open: boolean;
  mcpName: string;
  onClose: () => void;
}
```

### State

```typescript
interface ToolsModalState {
  tools: ToolWithVisibility[];  // fetched from API
  loading: boolean;
  error: string | null;
}
```

### Tool Row

Each tool is rendered as a row with:
- **Tool name** (bold text)
- **Description** (muted text, truncated)
- **Toggle button** (enabled: teal/green, disabled: gray/muted)
- **Visual state**: disabled tools have reduced opacity (`opacity-50`)

### Header

- MCP name
- Enabled/Total count: "7/10 tools enabled"
- Bulk actions: "Enable All" / "Disable All" buttons

### Interactions

| Action | Effect |
|--------|--------|
| Click toggle on tool | Toggles enabled/disabled, calls `PUT /api/mcps/:name/tools/visibility/:toolName` |
| Click "Enable All" | Sets all tools enabled, calls `PUT /api/mcps/:name/tools/visibility` with `{ enabled: true }` |
| Click "Disable All" | Sets all tools disabled, calls `PUT /api/mcps/:name/tools/visibility` with `{ enabled: false }` |
| Close modal | Returns to dashboard |

## API Functions (frontend/src/services/api.ts)

```typescript
// New functions to add:
getToolVisibility(name: string): Promise<ToolVisibilityResponse>
setToolVisibility(name: string, toolName: string, enabled: boolean): Promise<void>
setBulkToolVisibility(name: string, enabled: boolean): Promise<void>
getMCPTools(name: string, includeDisabled?: boolean): Promise<ToolsResponse>  // modified
```

### Types

```typescript
interface ToolVisibilityResponse {
  visibility: Record<string, boolean>;
  totalCount: number;
  enabledCount: number;
}

interface ToolWithVisibility {
  name: string;
  description?: string;
  enabled: boolean;
}
```

## React Query Hook

```typescript
// new hook: useToolVisibility(mcpName: string)
// - Query key: ['tool-visibility', mcpName]
// - Fetches tool visibility + tools list
// - Returns merged ToolWithVisibility[]
// - Mutations for toggle and bulk operations
```

## MCPCard Integration

Add a `Wrench` icon button to `MCPCard.tsx` that opens the ToolsModal. Only shown when `client.status === 'connected'` and `client.toolCount > 0`.
