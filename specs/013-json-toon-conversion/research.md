# Research: JSON-to-TOON Response Conversion

## 1. @toon-format/toon API

**Decision**: Use `@toon-format/toon ^2.3` npm package.

**API Surface**:
- `encode(data, options?)` — encodes JS value to TOON string
- `decode(input)` — decodes TOON string to JS value

**Options**:
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `indent` | number | 2 | Indentation spaces (0-8) |
| `delimiter` | `'comma' \| 'tab' \| 'pipe'` | `'comma'` | Key-value delimiter |
| `keyFolding` | boolean | inferred from flattenDepth | Fold repeated keys |
| `flattenDepth` | number | 4 | Max flatten depth (>=0) |

**Rationale**: Proven library, already used in MORPH reference implementation. Fits Dependency First principle.

## 2. Structural Optimizer

**Decision**: Pre-encoding heuristic to skip payloads unlikely to benefit from TOON.

**Rules** (from MORPH reference):
| Rule | Condition | Action |
|------|-----------|--------|
| Threshold | `rawText.length < 100` | Skip (too small for savings) |
| Primitive | `typeof parsed !== 'object' \|\| parsed === null` | Skip (not an object/array) |
| Depth | `maxDepth(parsed) >= 6` | Skip (deeply nested, minimal TOON benefit) |
| Uniform array | `isUniformArray(parsed)` | Convert (high TOON benefit) |
| Fallthrough | Everything else | Convert (eligible for evaluation) |

**Rationale**: Avoids unnecessary `encode()` calls for payloads where TOON provides no benefit. Reference implementation already validated these heuristics.

## 3. Token Counting

**Decision**: Use `gpt-tokenizer ^3.4` npm package for accurate BPE token counting.

**API Surface**:
- `encode(text: string): number[]` — encodes text to token IDs
- `decode(tokens: number[]): string` — decodes tokens back to text
- `.length` of encoded array gives exact token count

**Usage**: `encode(text).length` returns the exact token count for the selected encoding (cl100k_base for GPT-4, o200k_base for GPT-4o, etc.)

**Rationale**: Accurate token counting instead of heuristic estimation. Pure TypeScript, ESM-native, no WASM required. Aligns with Dependency First principle (Principle VII) — proven library > custom heuristic.

**Interface**: `TokenSavings { originalBytes, toonBytes, originalTokens, toonTokens, percent }`

## 4. Weir Proxy Pipeline Integration

**Decision**: Integrate TOON conversion in `backend/src/proxy/index.ts`.

**Integration points**:
- After receiving a JSON-RPC response from the MCP backend (in the response forwarding path)
- Before sending the response back to the agent via stdin/stdout
- Only for `tools/call` responses (not for `initialize`, `tools/list`, etc.)
- Only for `type: "text"` content items whose text is valid JSON

**Pipeline flow**:
```
Backend response (JSON-RPC) → Parse response → Extract tool result → 
ToonConverter.convertResult() → Rebuild JSON-RPC → Forward to agent
```

**Rationale**: Minimal changes to existing proxy code. Single integration point in the response forwarding path. Non-JSON responses pass through untouched.

## 5. Existing Schemas (`backend/src/config/schema.ts`)

**Current state**:
- `TransportType`: `z.enum(['stdio', 'http', 'sse'])`
- `TransportConfig`: transport config with type, command, args, url, env
- `MCPServerEntry`: wraps transport config (preprocess for flat format)
- `MCPConfig`: `z.object({ mcpServers: z.record(z.string(), MCPServerEntry) })`
- `EnvConfig`: existing WEIR_* env vars with defaults

**Additions needed**:
- `OutputMode = z.enum(['dynamic', 'json', 'toon'])`
- `ToonOptions = z.object({ delimiter, indent, flattenDepth, threshold, outputMode })`
- `MCPServerEntry` gains optional `outputMode?: OutputMode`
- `EnvConfig` gains `WEIR_TOON_*` vars

## 6. New Dependency

**Decision**: Add `"@toon-format/toon": "^2.3.0"` to `backend/package.json` dependencies.

**Rationale**: Required by FR-001, FR-002, FR-003, FR-010. No suitable alternative exists. Library is focused on the exact use case.

## 7. New Dependency: gpt-tokenizer

**Decision**: Add `"gpt-tokenizer": "^3.4.0"` to `backend/package.json` dependencies.

**Usage in stats.ts**:
```typescript
import { encode } from 'gpt-tokenizer';

export function countTokens(text: string): number {
  return encode(text).length;
}
```

**Rationale**: Accurate BPE token counting matching OpenAI model behavior. Pure TypeScript, ESM-compatible, well-maintained (v3.4.0). Single-purpose library that does exactly what's needed.

## Alternatives Considered

| Alternative | Rejected Because |
|-------------|-----------------|
| Custom TOON encoder | Violates Dependency First (Principle VII); would require >50 lines for comparable quality |
| Heuristic ~4 chars/token | User requested real token counting library instead of estimation |
| tiktoken (WASM) | Requires WASM build step; heavier integration for same result |
| @anthropic-ai/sdk | CommonJS module, conflicts with Weir's ESM setup |
| Skip optimizer entirely | Would waste CPU encoding payloads that gain nothing; reference implementation proved value |
