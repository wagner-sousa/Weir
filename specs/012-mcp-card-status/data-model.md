# Data Model: MCP Card Status Enhancement

## Status Icon Definitions

```typescript
interface StatusIcon {
  icon: ReactNode;   // lucide-react icon component
  color: string;     // Tailwind text color class
  label: string;     // Tooltip/label text
}
```

### Current statusIcons map (with additions)

| Status | Icon | Color | Label |
|--------|------|-------|-------|
| `connected` | CircleCheck | `text-green-500` | "Connected" |
| `error` | CircleX | `text-red-500` | "Error" (tooltip includes error detail) |
| `needsAuth` | ShieldAlert | `text-amber-500` | "Authentication required" |
| `connecting` | LoaderCircle (spinning) | `text-yellow-500` | "Connecting..." |
| `disconnected` | Circle | `text-gray-400` | "Disconnected" |
| `testing` | LoaderCircle (spinning) | `text-yellow-500` | "Testing..." |
| `unknown` | Circle | `text-gray-400` | "Unknown" |

## Transport Badge Variants

| Transport | Badge Variant | Tailwind Classes |
|-----------|---------------|-------------------|
| `http` | `http` (new) | `bg-blue-800 text-blue-200` |
| `stdio` | `stdio` (new) | `bg-purple-800 text-purple-200` |
| `sse` | `sse` (new) | `bg-cyan-800 text-cyan-200` |

## State Transitions

Status transitions for the status icon display:

```
connected ──► error
connected ──► needsAuth
needsAuth ──► connected
needsAuth ──► error
error ──────► connected
error ──────► needsAuth
disconnected ──► connected / error / needsAuth
unknown ───────► connected / error / needsAuth / disconnected
```

## Validation Rules

- `status` field in MCPClient must be one of the 7 valid status values
- `transport` field must be one of `'http'`, `'stdio'`, `'sse'`
- Error tooltip text is plain string; no special rendering needed
