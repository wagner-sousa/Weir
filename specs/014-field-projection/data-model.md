# Data Model: Field Projection

## Entities

### FieldProjectionFile

A JSON file named `field-projection.json` located in the same directory as `.mcp.json`.

**Structure**:
```
{
  "<serverName>": {
    "<toolName>": {
      "mode": "include" | "exclude",
      "fields": ["<jsonpath>", ...]
    }
  }
}
```

- **serverName**: string — MUST match a key in `.mcp.json::mcpServers`. Mismatched entries are silently ignored.
- **toolName**: string — the MCP tool name. For `tools/call`, extracted from `message.params?.name`; for non-standard methods, falls back to `message.method`. Each tool has exactly one `FieldSelection`.
- **fields**: `string[]` — array of JSONPath dot-notation paths. MUST have at least 1 element. Each element MUST be syntactically valid JSONPath.

### FieldSelectionConfig

Per-tool projection configuration.

| Field | Type | Description |
|-------|------|-------------|
| `mode` | `"include"` \| `"exclude"` | Include: keep only listed fields. Exclude: remove listed fields. |
| `fields` | `string[]` | JSONPath dot-notation paths. Min 1 element. |

**Validation rules**:
- `mode` must be exactly `"include"` or `"exclude"`
- `fields` must have at least 1 entry
- Each field entry must be a syntactically valid JSONPath
- Empty strings, bare `$`, bare `$[*]`, and paths with unbalanced brackets are rejected
- Malformed JSON in the file is rejected

### ProjectionResult

The projected response object.

| Scenario | Behavior |
|----------|----------|
| Include mode, paths found | New object with only included paths |
| Include mode, no paths found | `{}` |
| Exclude mode, paths found | `structuredClone` of input with paths removed |
| Exclude mode, no paths found | Clone of original (effectively same) |
| Input is non-object (`string`, `number`, `null`) | Input passed through unchanged |
| No projection configured for this tool | Input passed through unchanged |

## State Transitions (Config Lifecycle)

```
File on disk ──load──▶ Validated Config ──▶ Schema Check ──▶ Projection Map (in-memory)
                           │                     │
                           │ (fail)              │ (fail)
                           ▼                     ▼
                        Log error           Reject load
```

- Load happens once at proxy startup (or config reload)
- Validation at load time only — no runtime validation per message
- Silent skip for servers not in `.mcp.json`

## Key Functions

| Function | Input | Output | Side Effects |
|----------|-------|--------|-------------|
| `normalizeJsonPath(path)` | JSONPath string | Dot-notation string | None |
| `applyFieldSelection(input, sel)` | `(unknown, FieldSelection)` | `unknown` (projected) | None |
| `loadFieldProjections(configDir)` | Directory path | `ProjectionMap \| null` | File read, Zod validation |
| *(inlined in proxy/index.ts)* `projectionMap?.[serverName]?.[toolName]` | `(ProjectionMap \| null, string, string)` | `FieldSelection \| undefined` | None |
