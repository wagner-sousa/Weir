# Data Model: MCP Connection Manager

## Entities

### MCPEntry

Represents a single MCP server in `.mcp.json`.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | Yes | Unique identifier/key in `mcpServers` object |
| `transport` | `object` | Yes (flat mode) | Transport configuration |
| `transport.type` | `"stdio" \| "http" \| "sse"` | Yes | Transport protocol |
| `transport.command` | `string` | If stdio | Executable command |
| `transport.args` | `string[]` | No | Command arguments |
| `transport.env` | `Record<string, string>` | No | Environment variables (stdio only) |
| `transport.url` | `string` | If http/sse | Endpoint URL |

**Flat format alias**: When `transport` is absent at the MCP client level,
fields `type`, `command`, `args`, `env`, `url` are promoted from the MCP client
object (normalized by `z.preprocess()` in schema.ts).

**Validation rules** (from spec FR-003 to FR-005, FR-020, FR-004):
- `name` must be unique within `mcpServers`
- `name` allowed characters: letters, numbers, spaces, hyphens, underscores (Unicode)
- stdio requires `command` (non-empty string)
- http/sse require `url` (valid URL starting with `http://` or `https://`)
- `env` keys MUST match regex `[a-zA-Z_][a-zA-Z0-9_]*`, values can be any string (including empty)
- Type must be one of: `stdio`, `http`, `sse`

### ConnectionState

Runtime state of an MCP connection (not persisted).

| Field | Type | Description |
|-------|------|-------------|
| `status` | `"connecting" \| "connected" \| "error" \| "disconnected" \| "testing" \| "unknown"` | Current connection state |
| `error` | `string \| null` | Error message if status is "error" |
| `tools` | `string[]` | List of tool names advertised by the MCP |
| `toolCount` | `number` | Count of available tools |
| `lastChecked` | `ISO timestamp` | When the connection was last verified |
| `needsAuth` | `boolean` | Whether the connection requires authorization |

**State transitions**:
```
disconnected → connecting → connected
                          → error
error → connecting → connected
connected → disconnected
```
The "connecting" state times out after the connection test timeout (default 5s, configurable via MCP_CONNECTION_TIMEOUT), transitioning to "error".

### MCPConfigFile

The on-disk representation.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `mcpServers` | `Record<string, MCPEntry>` | Yes | Map of MCP name to entry |

Empty `mcpServers` (`{}`) is valid — represents "no configured servers".

## API Data Contracts

See [contracts/api.md](./contracts/api.md) for full request/response schemas.

## File Operations

### Write (Add MCP)

1. Read current .mcp.json via `loadMCPConfig()`
2. Validate name uniqueness (FR-020)
3. Merge new entry into `mcpServers` object
4. Write to .mcp.json (pretty-printed)
5. File watcher detects change → broadcast `config:changed`

### Delete (Remove MCP)

1. Read current .mcp.json
2. Delete key from `mcpServers` object
3. Write to .mcp.json
4. File watcher detects change → broadcast `config:changed`
