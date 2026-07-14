# Research: Tools Visibility Toggle

**Feature**: 015-tools-visibility-toggle
**Date**: 2026-07-14

## R1: Tool Visibility Storage Pattern

**Decision**: Store tool visibility in a standalone `tool-visibility.json` file in the same directory as `.mcp.json`.

**Rationale**: The project already uses `field-projection.json` as a standalone config file for per-MCP, per-tool settings. Following the same pattern keeps concerns separated from `.mcp.json` (which is the MCP server registry). The file is simple JSON, read/written synchronously, and listed in `.gitignore` (user-specific config).

**Alternatives considered**:
- Storing in `.mcp.json` entries (like `fieldSelection`): Rejected because `.mcp.json` is the MCP server registry and mixing visibility settings there complicates the schema and the `loadMCPConfig()` Zod validation pipeline.
- Using `conf` (npm package): Rejected because `conf` is already used for `mcp-cache.json` (runtime cache), not user-managed config. Tool visibility is user-managed and should be inspectable/editable.

## R2: Proxy Filtering Strategy

**Decision**: Filter `tools/list` responses in three locations: the `GET /api/mcps/:name/tools` endpoint, the `sendOneMessage()` function, and the SSE session `onMessage` handler.

**Rationale**: There are three code paths where `tools/list` responses flow:
1. **Dashboard API** (`GET /api/mcps/:name/tools`): Used by the frontend to display tools. Filter here so the UI shows only enabled tools by default.
2. **MCP port POST** (`sendOneMessage` in `proxy/index.ts`): Used for one-shot JSON-RPC forwarding. Filter the `tools/list` result before returning.
3. **MCP port SSE session** (`onMessage` in `mcp.routes.ts`): Used for persistent SSE sessions. Filter `tools/list` results before writing to the SSE stream.

The stdio proxy (`proxy.ts`) reads from stdin and writes to stdout — it does NOT intercept `tools/list` responses (it only applies TOON conversion to `tools/call` results). Tool filtering for stdio proxy clients happens at the MCP port level since clients connect via the MCP port, not directly to the stdio process.

**Alternatives considered**:
- Filter only at the API level: Rejected because MCP port clients (LLM agents) would still see disabled tools.
- Filter at the transport layer: Rejected because transport adapters are generic JSON-RPC pipes; adding business logic there violates separation of concerns.

## R3: Frontend UI Pattern for Toggle

**Decision**: Use a simple button/toggle per tool row in the new ToolsModal, following the existing segmented-button pattern (used for include/exclude and transport mode).

**Rationale**: The project has no `@radix-ui/react-switch` or dedicated toggle component. The existing UI uses styled buttons for state toggling. Adding a new dependency for a single toggle is not justified per Constitution Principle VII (Dependency First) — a simple styled button is sufficient and consistent.

**Alternatives considered**:
- Add `@radix-ui/react-switch`: Rejected per Principle VII — overkill for a binary toggle when the existing button pattern works.
- Checkbox: Rejected because it doesn't match the visual language of the existing segmented controls.

## R4: Bulk Actions Implementation

**Decision**: Implement "enable all" / "disable all" as a single API call that sets all tools for an MCP to the same state, rather than individual toggle calls.

**Rationale**: Bulk operations as individual calls would be N requests for N tools. A single bulk endpoint is more efficient and provides atomic behavior. The backend can write the entire visibility map for an MCP in one operation.

**Alternatives considered**:
- Send N individual toggle requests: Rejected for performance and atomicity reasons.
- Client-side only bulk: Rejected because it would still require N API calls.

## R5: toolCount Badge Accuracy

**Decision**: The `toolCount` in `CachedStatus` should reflect the total tool count (including disabled) so the badge shows the real MCP capability count. The frontend ToolsModal shows enabled/total breakdown.

**Rationale**: The `toolCount` is set during connection testing via `queryTools()` which returns all tools from the MCP backend. Filtering at this point would lose information about how many tools the MCP actually has. The enabled count is a separate concern managed by the visibility system.

**Alternatives considered**:
- Filter toolCount at cache time: Rejected because it would hide the total from the dashboard, making it harder to understand the MCP's full capability.
