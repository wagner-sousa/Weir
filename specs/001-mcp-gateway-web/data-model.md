# Data Model: MCP Gateway Web

## Entities

### MCPClient (Primary Entity)

Represents an MCP server configured in .mcp.json.

**Attributes:**

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| name | string | mcpServers key | Unique MCP name |
| transport | TransportType | .transport.type | Transport type |
| command | string? | .transport.command | Stdio command (stdio only) |
| args | string[]? | .transport.args | Arguments (stdio only) |
| url | string? | .transport.url | HTTP/SSE URL (http/sse only) |

**TransportType** (enum):
- `stdio` — child process (command + args)
- `http` — REST request
- `sse` — Server-Sent Events (streaming)
- `unknown` — any other unrecognized type

### MCPConfig (Aggregator)

Represents the complete .mcp.json file.

**Attributes:**

| Field | Type | Description |
|-------|------|-------------|
| mcpServers | Record<string, MCPServerEntry> | Name → config map |

### MCPServerEntry

Structure of each entry in mcpServers.

| Field | Type | Description |
|-------|------|-------------|
| transport | TransportConfig | Transport configuration |

### TransportConfig

| Field | Type | Description |
|-------|------|-------------|
| type | "stdio" \| "http" \| "sse" | Transport type |
| command | string? | Command (stdio) |
| args | string[]? | Arguments (stdio) |
| url | string? | URL (http/sse) |

## Zod Schema (Source of Truth)

See `backend/src/config/schema.ts` for the definitive Zod schema.
The schema defines `TransportType`, `TransportConfig`, `MCPServerEntry`,
and `MCPConfig` using `z.enum`, `z.object`, and `z.record`.

## Validation Rules

- The `mcpServers` field is required and MUST be a non-empty object
- Each key in mcpServers MUST be a unique (non-empty) name
- `stdio` requires `command` (required string)
- `http`/`sse` requires `url` (valid URL required)
- Unknown transport types are accepted as `unknown` and displayed as "Unknown"

## States

The system does not manage MCP state — it only reads the file.
Presentation states:

- **Loading**: Waiting for initial .mcp.json read
- **Empty**: .mcp.json not found or no servers configured
- **Displaying**: List of cards with valid MCPs
- **Error**: Invalid or malformed .mcp.json
- **Updating**: Change detected, reloading data
