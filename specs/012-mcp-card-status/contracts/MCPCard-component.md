# Component Contract: MCPCard

## Props

```typescript
interface MCPCardProps {
  client: MCPClient;
  onRemove: (client: MCPClient) => void;
  onEdit: (client: MCPClient) => void;
  onReconnect: (client: MCPClient) => void;
  onAuth: (client: MCPClient) => void;
  onConfig: (client: MCPClient) => void;
  removing: boolean;
  reconnecting: boolean;
}
```

## Behavior

- **Status icon**: Renders icon based on `client.status`. Three primary states:
  - `connected` → CircleCheck (green), title: "Connected"
  - `needsAuth` → ShieldAlert (amber), title: "Authentication required"
  - `error` → CircleX (red), title: "Error: {error message}" or just "Error" if no error detail
- **Transport badge**: Renders `Badge` with variant mapped from `client.transport`:
  - `http` → `http` variant (blue)
  - `stdio` → `stdio` variant (purple)
  - `sse` → `sse` variant (cyan)
- **Error display**: No inline error text on card body for error-status MCPs. Error info is only in the status icon `title`.
- **Existing functionality**: Action buttons (Reconnect, Auth, Config, Edit, Remove) remain unchanged.

## States

| Status | Icon | Color | Title Attribute |
|--------|------|-------|-----------------|
| `connected` | CircleCheck | `text-green-500` | "Connected" |
| `error` | CircleX | `text-red-500` | "Error: {client.error}" or "Error" |
| `needsAuth` | ShieldAlert | `text-amber-500` | "Authentication required" |
| `connecting` | LoaderCircle (spinning) | `text-yellow-500` | "Connecting..." |
| `disconnected` | Circle | `text-gray-400` | "Disconnected" |
| `testing` | LoaderCircle (spinning) | `text-yellow-500` | "Testing..." |
| `unknown` | Circle | `text-gray-400` | "Unknown" |
