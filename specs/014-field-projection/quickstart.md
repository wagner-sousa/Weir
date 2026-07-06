# Quickstart: Field Projection

## Prerequisites

- Docker + Docker Compose
- Running Weir instance (dev or production)
- A configured MCP server in `.mcp.json`

## Setup

### 1. Create `field-projection.json`

Place `field-projection.json` in the same directory as `.mcp.json` (typically the project root or `MCP_CONFIG_PATH` directory).

**Example: include mode** — keep only `id` and `name` from `getRepository`:
```json
{
  "myServer": {
    "getRepository": {
      "mode": "include",
      "fields": ["id", "name"]
    }
  }
}
```

**Example: exclude mode** — remove `secret` from `getSecureData`:
```json
{
  "myServer": {
    "getSecureData": {
      "mode": "exclude",
      "fields": ["secret"]
    }
  }
}
```

### 2. Validate the file

The proxy validates `field-projection.json` at load time. Check startup logs for:
- `"Field projection config loaded"` on success
- `"Field projection validation error: <details>"` on schema/JSONPath errors

## Testing

### Unit Tests

Run the field projection unit tests in isolation:

```bash
npx vitest run backend/tests/unit/projection.test.ts
```

These test the pure projection logic (normalizeJsonPath, applyFieldSelection) without any Weir infrastructure.

### Integration Test (Manual)

1. Start Weir with an MCP backend that has a `get_data` tool returning:
   ```json
   { "a": 1, "b": 2, "c": 3 }
   ```

2. Create `field-projection.json`:
   ```json
   {
     "testServer": {
       "get_data": {
         "mode": "include",
         "fields": ["a"]
       }
     }
   }
   ```

3. Send a `tools/call` request through Weir:
   ```bash
   curl -X POST http://localhost:3000/mcp/testServer \
     -H 'Content-Type: application/json' \
     -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_data","arguments":{}}}'
   ```

4. Expected response:
   ```json
   { "jsonrpc": "2.0", "id": 1, "result": { "a": 1 } }
   ```
   Fields `b` and `c` are removed. JSON-RPC envelope preserved.

5. Change mode to `"exclude"` with `fields: ["c"]` and re-test:
   ```json
   { "jsonrpc": "2.0", "id": 1, "result": { "a": 1, "b": 2 } }
   ```

### Edge Case Tests

| Test | Config | Response | Expected |
|------|--------|----------|----------|
| Include all paths missing | `{mode:"include", fields:["nonexistent"]}` | `{a:1}` | `{}` |
| Exclude all paths missing | `{mode:"exclude", fields:["nonexistent"]}` | `{a:1}` | `{a:1}` (unchanged) |
| Non-object response | `{mode:"include", fields:["a"]}` | `"hello"` | `"hello"` (pass-through) |
| No config for tool | — | `{a:1}` | `{a:1}` (pass-through) |
| No field-projection.json | — | `{a:1}` | `{a:1}` (pass-through) |

## Verification Checklist

- [ ] Unit tests pass (`npx vitest run backend/tests/unit/projection.test.ts`)
- [ ] Include mode keeps only specified fields
- [ ] Exclude mode removes only specified fields
- [ ] JSON-RPC envelope (id, jsonrpc) preserved
- [ ] Non-object responses pass through unchanged
- [ ] Missing paths silently skipped
- [ ] No field-projection.json → proxy starts normally
- [ ] Invalid schema → clear error logged, proxy continues
- [ ] Server not in `.mcp.json` → entry silently ignored
