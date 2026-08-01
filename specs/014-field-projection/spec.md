# Feature Specification: Field Projection

**Feature Branch**: `014-field-projection`

**Created**: 2026-07-06

**Status**: Draft

**Input**: User description: "Implementar Field Projection no Weir — projeção de campos por tool em respostas MCP, reduzindo payload antes da conversão TOON."

## Clarifications

### Session 2026-07-06

- Q: Which expression language should field paths use? → A: JSONPath dot-notation.
- Q: Deve ter `mode` (include/exclude)? → A: Sim. Cada tool tem `{mode, fields}`. Include mantém só os listados; exclude remove os listados.
- Q: Onde salvar a config de projeção? → A: Em arquivo separado (`field-projection.json`), nunca no `.mcp.json`. Estrutura é `{serverName: {toolName: {mode, fields}}}`.
- Q: Os paths em `fields` devem ser validados? → A: Sim. Cada path deve ser validado como JSONPath sintaticamente válido no load da config. Rejeitar paths malformados com erro.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Agent Receives Projected Responses (Priority: P1)

An AI agent sends tool calls through the Weir proxy and receives responses with only the fields the operator configured, reducing token consumption before any format conversion.

**Why this priority**: This is the core value — token reduction in the proxy pipeline directly improves agent efficiency and cost.

**Independent Test**: Can be fully tested by creating a `field-projection.json` with `{mode, fields}` for a tool on a local stdio MCP backend, sending a tool call, and verifying the response contains/omits the expected fields, with unchanged JSON-RPC structure.

**Acceptance Scenarios**:

1. **Given** a stdio MCP backend with a tool returning `{a:1, b:2, c:3}`, **When** projection is `{mode: "include", fields: ["a"]}`, **Then** the agent receives `{a:1}` — fields `b` and `c` are removed.
2. **Given** the same backend, **When** projection is `{mode: "exclude", fields: ["c"]}`, **Then** the agent receives `{a:1, b:2}` — field `c` is removed.
3. **Given** a tool that returns an array `[{id:1, name:"x"}, {id:2, name:"y"}]`, **When** projection is `{mode: "include", fields: ["id"]}`, **Then** the agent receives `[{id:1}, {id:2}]`.

---

### User Story 2 - Operator Configures Field Projection per Tool (Priority: P2)

An operator edits `field-projection.json` to define field projection per tool, with `mode` (include or exclude) and `fields` array. Grouped by MCP server name alongside `.mcp.json`. If the server name changes in `.mcp.json`, the operator updates it here too.

**Why this priority**: US1 depends on this configuration being in place. This is the setup story.

**Independent Test**: Can be tested by writing a `field-projection.json` with projections for a given server and tool, validating the schema rejects invalid paths, and verifying the proxy reads and applies the projection correctly.

**Acceptance Scenarios**:

1. **Given** a `field-projection.json` with `MyServer.getRepository = {mode: "include", fields: ["id", "name"]}`, **When** the proxy loads the config, **Then** it applies include-mode projection keeping only `id` and `name` for `getRepository`.
2. **Given** a `field-projection.json` with `MyServer.getSecureData = {mode: "exclude", fields: ["secret"]}`, **When** the proxy loads the config, **Then** it applies exclude-mode projection removing `secret` from `getSecureData`.
3. **Given** a `field-projection.json` with `MyServer.getData = {mode: "include", fields: [""]}`, **When** the proxy validates the config, **Then** it rejects the empty path.
4. **Given** a `field-projection.json` with `MyServer.getData = {mode: "include", fields: ["invalid[path"]}`, **When** the proxy validates the config, **Then** it rejects the malformed JSONPath.
5. **Given** a `field-projection.json` with `NonExistent = {getX: {mode: "include", fields: ["id"]}}`, **When** the proxy loads the config, **Then** it silently ignores entries for servers not present in `.mcp.json`.

---

### User Story 3 - Automatic File Creation on First Use (Priority: P3)

An operator configures field projection for a tool via the API or UI, and the system automatically creates `field-projection.json` if it does not yet exist, without requiring manual file creation.

**Why this priority**: Reduces friction for first-time users — they don't need to manually create the file before configuring projections. The file is created on-demand when the first projection is configured.

**Independent Test**: Can be tested by deleting `field-projection.json`, configuring a field projection via API, and verifying the file is created with the correct structure.

**Acceptance Scenarios**:

1. **Given** `field-projection.json` does not exist, **When** the operator configures a projection for `MyServer.getRepository = {mode: "include", fields: ["id"]}` via API, **Then** the system creates `field-projection.json` with the new configuration.
2. **Given** `field-projection.json` already exists with other projections, **When** the operator adds a new projection, **Then** the system appends to the existing file without overwriting other entries.
3. **Given** `field-projection.json` does not exist and the operator removes a projection, **When** the removal is processed, **Then** no file is created (file is only created on add/update, not on remove of non-existent entries).

### Edge Cases

- What happens when mode is `include` and a path does not exist? The path is silently skipped; remaining paths are processed.
- What happens when mode is `include` and all paths are missing? The response becomes `{}`.
- What happens when mode is `exclude` and a path does not exist? The path is silently skipped; remaining paths are processed.
- What happens when mode is `exclude` and all paths are missing? The original response passes through unchanged.
- What happens when the tool response is not an object (e.g., a string or number)? Projection is skipped and the original value passes through unchanged.
- What happens when the tool is not configured in fieldProjection? No projection is applied; the response passes unchanged.
- What happens when `field-projection.json` does not exist? The proxy starts normally — projection is simply skipped for all tools.
- What happens when `field-projection.json` exists but references servers not in `.mcp.json`? Those entries are silently ignored.
- What happens when `field-projection.json` does not exist and a projection is configured via API? The file is created automatically with the new projection.
- What happens when `field-projection.json` exists and a new projection is added? The existing entries are preserved; the new projection is merged into the file.
- What happens when the directory for `field-projection.json` is read-only? The API returns an error indicating the file could not be created.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST read field projection configuration from a separate file (`field-projection.json`) located in the same directory as `.mcp.json`.
- **FR-002**: System MUST NOT modify or read fieldSelection from `.mcp.json` — `.mcp.json` remains in its standard Claude/MCP format untouched.
- **FR-003**: The `field-projection.json` file MUST use the structure `{serverName: {toolName: {mode: "include"|"exclude", fields: string[]}}}` — top-level keys are MCP server names.
- **FR-004**: System MUST support two modes per tool: `include` (keep only specified fields) and `exclude` (remove specified fields, keep the rest).
- **FR-005**: System MUST support JSONPath dot-notation field paths: simple names (`full_name`), nested (`author.display_name`), array wildcard prefix (`[*].id`), and bracket notation for index access (`items[0].name`).
- **FR-006**: System MUST NOT mutate the original response object — the projected result is a newly constructed object (include) or a clone with removed fields (exclude).
- **FR-007**: System MUST NOT alter the JSON-RPC envelope structure — only the `result` content is projected; message id, jsonrpc version, and error fields are preserved.
- **FR-008**: System MUST silently skip missing paths — if a path does not exist in the response, it is ignored and remaining paths are still processed. If no paths match: include → `{}`, exclude → original unchanged.
- **FR-009**: System MUST validate `field-projection.json` against a Zod schema at load time: `z.record(z.string(), z.record(z.string(), z.object({ mode: z.enum(["include", "exclude"]), fields: z.array(z.string()).min(1) })))`, rejecting invalid modes, empty fields, or malformed JSON.
- **FR-010**: System MUST validate each field path string in `fields` as syntactically valid JSONPath — rejecting paths with invalid characters, malformed dot-notation, unbalanced brackets, or unsupported operators.
- **FR-011**: System MUST automatically create `field-projection.json` when a field projection is configured via API and the file does not yet exist.
- **FR-012**: System MUST preserve existing entries in `field-projection.json` when adding or updating a projection — the file is merged, not overwritten.
- **FR-013**: System MUST NOT create `field-projection.json` on read operations or when no projections are configured — the file is only created on first write.

### Key Entities *(include if feature involves data)*

- **FieldProjectionFile**: File `field-projection.json` alongside `.mcp.json`, containing `{serverName: {toolName: {mode, fields}}}`.
- **FieldSelectionConfig**: Per-tool configuration — `{mode: "include"|"exclude", fields: string[]}` keyed by `{serverName}.{toolName}`.
- **ProjectionResult**: The projected response — a new object with only included fields, or a clone with excluded fields removed.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Operators can create `field-projection.json` with `{mode, fields}` for any MCP server and tool, and the proxy reads it without error.
- **SC-002**: Include mode produces a response containing only the specified fields; exclude mode removes only the specified fields.
- **SC-003**: Invalid modes (not "include"/"exclude"), empty fields arrays, malformed JSONPath syntax, and malformed JSON are rejected at load time.
- **SC-004**: Projection is applied before TOON conversion in the pipeline — a tool with both fieldProjection and TOON enabled will have field projection applied first, then the projected result is converted to TOON.
- **SC-005**: Missing paths do not cause projection to fail — they are silently skipped.
- **SC-006**: Responses from tools without fieldProjection configuration pass through unmodified — zero overhead for unconfigured tools.
- **SC-007**: `.mcp.json` remains completely untouched — no fieldProjection keys are added to it.
- **SC-008**: Operators can configure field projection without manually creating `field-projection.json` — the file is created automatically on first use.

## Assumptions

- Field projection applies only to the `result` field of a successful JSON-RPC response, not to errors or notifications.
- The proxy pipeline applies field projection before TOON conversion, in a single synchronous step per message.
- The operator is responsible for ensuring field paths match the actual response structure; there is no schema introspection or discovery.
- Paths use dot-notation JSONPath: `field` for top-level, `parent.child` for nested, `[*]` prefix for array traversal, `items[0]` for index access. Each path is validated for syntactic correctness at config load time.
- Server names in `field-projection.json` MUST match server names in `.mcp.json` for projection to apply. Mismatched names are silently ignored.
- The feature does not introduce any new endpoints or change the MCP port behavior.
- The `field-projection.json` file is created automatically when the first projection is configured via API. The directory is derived from the `MCP_CONFIG_PATH` environment variable.
