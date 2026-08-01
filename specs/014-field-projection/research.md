# Research: Field Projection for Weir

## 1. MORPH `applyFieldSelection` — Reference Implementation

**Source**: `/home/desenvolvimento/Documentos/morph/src/projection/project.ts` (82 lines)

**Decision**: Port the algorithm directly — it's pure TypeScript, zero dependencies, proven in production (MORPH).

**Architecture**:
- `FieldSelection` interface: `{ mode: "include" | "exclude", fields: string[] }`
- `applyFieldSelection(input, sel)`: entry point — short-circuits on empty fields
  - `mode: "include"` → calls `includeNode(node, paths)` — builds new object keeping only specified dot-paths; arrays traversed element-wise
  - `mode: "exclude"` → `structuredClone(input)` then `removePath(clone, segments)` — removes specified paths in-place on clone; arrays traversed element-wise
- `includeNode(node, paths)`: groups paths by top-level key, recurses for nested paths; skips non-existent keys
- `removePath(node, segments)`: mutates in-place, recurses into arrays, deletes leaf key; no-op for non-existent keys
- Paths split on `"."` — pure dot-notation, no JSONPath parsing needed beyond that

**Key behaviors to replicate**:
- Non-existent paths silently skipped
- Include mode with no matching paths → returns `{}`
- Exclude mode with no matching paths → returns clone (effectively original)
- Non-object responses passed through unchanged
- Zero side-effects on input (include is copy-based; exclude clones first)

**JSONPath prefix normalization** (not in MORPH, needed for Weir):
- `$.field` → `field`
- `$[*].field` → `field`
- `$.a.b.c` → `a.b.c`
- `$[*].a.b` → `a.b`
- If input is an array (not object), paths without `$[*]` prefix work because the algorithm traverses arrays automatically

## 2. Weir Proxy Pipeline — Injection Point

**Source**: `backend/src/proxy/index.ts`

**Decision**: Inject field projection inside `sendOneMessage()`, in the `transport.onMessage` callback, between receiving the raw response and resolving it.

**Current flow** (simplified):
```
transport.onMessage((msg) => {     // line 192: raw JsonRpcMessage received
  clearTimeout(timeout);           // line 193
  transport.disconnect();          // line 194
  resolve(msg);                    // line 195: returned to caller as-is
});
```

**Target flow**:
```
transport.onMessage((msg) => {
  clearTimeout(timeout);
  transport.disconnect();
  // NEW: apply field projection
  if (msg.result && methodName === 'tools/call') {
    const sel = getFieldProjection(serverName, toolName);
    if (sel) msg.result = applyFieldSelection(msg.result, sel);
  }
  resolve(msg);
});
```

**Key considerations**:
- `methodName` is not available inside `onMessage` — need to capture `message.method` from the outgoing message (available in closure)
- Server name is the `name` parameter of `sendOneMessage` — used to resolve field projection config
- Tool name extracted from `message.method` (e.g., `"tools/call"` → tool name need `params.name` for `tools/call`, not the method itself)

Wait — let me re-read the spec. US1 says "sends tool calls through the Weir proxy". The method for tool calls is `tools/call`. The actual tool name is in `params.name`. So the field projection lookup is by tool name from `params.name`, not the JSON-RPC method.

Actually, looking at the prompt file: "Resolver por tool name (message.method é o nome da tool)". The prompt says `message.method` IS the tool name. But that doesn't seem right for MCP — `message.method` would be `"tools/call"`, and the tool name is in `params.name`.

Let me check how MCP works... In MCP protocol:
- `tools/call` is the method
- The tool name is in `params.name`

But the prompt file (fp-02-plan-prompt.md) says "Resolver por tool name (message.method é o nome da tool)". Let me re-read: line 23 says "Resolver por tool name (message.method é o nome da tool)". 

Hmm, this might be referring to a different message type — perhaps the Weir proxy has some internal routing where the tool name IS the method. But for `tools/call`, the method is `"tools/call"` and `params.name` is the tool.

Actually, I think there could be multiple MCP tools or a pattern where the proxy forwards messages and the tool name is part of the method path. Let me think about this differently.

Actually wait — maybe the config structure maps by tool name but the lookup happens differently. Let me keep the research accurate and note this for clarification.

Actually, looking again at the prompt file more carefully:
- Line 21: `sendOneMessage()` line 232 processes respostas tools/call com TOON converter
- Line 22: Projeção deve ser injetada ANTES do TOON converter  
- Line 23: Ler fieldSelection do .mcp.json (entry["fieldSelection"] como Record<string, { mode, fields }>)
- Line 24: **Resolver por tool name (message.method é o nome da tool)**

Hmm wait — this is from prompt file which says `message.method` é o nome da tool. But in MCP, `tools/call` has `params.name` for the tool name. Unless the Weir proxy uses a different convention where the method IS the tool name.

Actually, let me re-examine the messages. In some MCP implementations, tool calls might use method like `"tools/call"` with params.name. But maybe in Weir's proxy mode, tool methods are routed differently?

I should look at how sendOneMessage is called and what message.method typically is. But I don't have that info readily. Let me just note this as needing clarification in the research. But actually, the prompt file is the user's explicit direction — they say `message.method` is the tool name. I should respect that.

Actually, re-reading more carefully: The user's prompt file says the lookup is by tool name and `message.method` is the tool name. If the user says so, I'll go with it. Maybe in the Weir proxy context, messages are already pre-processed and the method field contains the tool name (e.g., when forwarding through proxy mode, the `tools/call` method might be rewritten or the proxy uses a different routing mechanism).

Let me just proceed with what the prompt says: `message.method` contains the tool name for lookup.

## 3. Config Loading — field-projection.json

**Source**: `backend/src/config/loader.ts`

**Decision**: Load `field-projection.json` from the same directory as `.mcp.json`, using `dirname(MCP_CONFIG_PATH)`. Validate against a dedicated Zod schema at load time. Extend `loadMCPConfig` or add parallel `loadFieldProjections()` function.

**Parallel loading pattern** (consistent with existing approach):
```typescript
const configDir = dirname(mcpConfigPath);
const fpPath = join(configDir, 'field-projection.json');
```

**Sidecar files precedent**: `mcp-cache.json` and `.mcp-auth.json` already follow this pattern (same directory as `.mcp.json`). See `status-cache.ts` and `auth-storage.ts`.

## 4. Existing Config Schemas

**Source**: `backend/src/config/schema.ts`

**Current entries** (`MCPServerEntry`):
```typescript
{
  transport: { type: "stdio"|"http"|"sse", command?, args?, url?, env? }
}
```

**Decision**: Add separate schema for field projection — NOT extending `MCPServerEntry`:
```typescript
export const FieldSelectionSchema = z.object({
  mode: z.enum(["include", "exclude"]),
  fields: z.array(z.string()).min(1),
});

export const FieldProjectionConfig = z.record(
  z.string(), // serverName
  z.record(z.string(), FieldSelectionSchema), // toolName → FieldSelection
);
```

No modifications to `MCPConfig` or `MCPServerEntry` schemas.

**Types** (`backend/src/config/types.ts`):
```typescript
export type FieldSelection = z.infer<typeof FieldSelectionSchema>;
export type FieldProjectionConfig = z.infer<typeof FieldProjectionConfig>;
```

Plus hand-written projection types:
```typescript
export interface ProjectionMap {
  [serverName: string]: {
    [toolName: string]: FieldSelection;
  };
}
```

## 5. JSONPath Normalization

**Decision**: Implement `normalizeJsonPath(path: string): string` — a simple string transformation:
- Strip leading `$.` if present
- Strip leading `$[*].` if present
- Return remaining path (which is already valid dot-notation)
- If path is bare `$` → error (invalid)
- If path is `$[*]` → error (invalid — wildcard-only not meaningful for include/exclude)

**Examples**:
| Input | Output |
|-------|--------|
| `$.field` | `field` |
| `$[*].field` | `field` |
| `$.a.b.c` | `a.b.c` |
| `$[*].a.b` | `a.b` |
| `field` | `field` (no change) |
| `a.b.c` | `a.b.c` (no change) |

**Validation** (loaded config, FR-010):
- Must not be empty string
- Must not be bare `$` or `$[*]`
- Must not contain JSONPath operators: `@`, `?`, `..`, `*` in non-`[*]` position
- Must have balanced brackets
- Must not start with `.` or end with `.`

## 6. Summary of Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Algorithm | Port MORPH `applyFieldSelection` | Proven, zero deps, pure TS |
| Config file | Separate `field-projection.json` | Don't pollute `.mcp.json` |
| Config load | Parallel load alongside `.mcp.json` | Consistent with sidecar pattern |
| Schema validation | Zod, at load time | FR-009, consistent with existing pattern |
| Injection point | Inside `sendOneMessage`, before resolve | Before any future TOON conversion |
| Projection logic | Pure module, no dependencies | < 80 lines, per Principle VII exemption |
| JSONPath normalization | Simple string prefix stripping | Only `$.` and `$[*].` prefixes needed |
