# Data Model: JSON-to-TOON Response Conversion

## OutputMode

```typescript
z.enum(['dynamic', 'json', 'toon'])
```

- **dynamic**: evaluate both formats, return the more compact one (fewer tokens)
- **json**: never convert, pass through as plain JSON
- **toon**: always convert to TOON

Default when unset: `dynamic`

## ToonOptions

```typescript
ToonOptions = {
  delimiter: 'comma' | 'tab' | 'pipe'      // default: 'comma'
  indent: 0-8                                // default: 2
  flattenDepth: >=0                          // default: 4
  threshold: >=0 (chars)                     // default: 100
  outputMode: OutputMode                     // default: 'dynamic'
}
```

Used to configure `@toon-format/toon` encoding behavior and optimization guard.
- `delimiter`: key-value separator in TOON output
- `indent`: indentation spaces for readability
- `flattenDepth`: maximum nesting depth for TOON's key folding
- `threshold`: minimum JSON string length in chars to attempt TOON conversion
- `outputMode`: determines conversion strategy

## MCPServerEntry (extended)

Existing schema gains optional field:

```typescript
MCPServerEntry = {
  transport: TransportConfig
  outputMode?: OutputMode   // NEW — overrides WEIR_TOON_OUTPUT_MODE per backend
}
```

If `outputMode` is absent, the backend inherits the global `WEIR_TOON_OUTPUT_MODE`.

## EnvConfig (extended)

Existing env var schema gains:

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `WEIR_TOON_AUTO_CONVERT` | boolean | `true` | Enable TOON conversion globally |
| `WEIR_TOON_DELIMITER` | `'comma' \| 'tab' \| 'pipe'` | `'comma'` | TOON key-value delimiter |
| `WEIR_TOON_INDENT` | number (0-8) | `2` | TOON indentation |
| `WEIR_TOON_FLATTEN_DEPTH` | number (>=0) | `4` | TOON flatten depth |
| `WEIR_TOON_THRESHOLD` | number (>=0) | `100` | Min JSON chars to attempt conversion |
| `WEIR_TOON_OUTPUT_MODE` | `'dynamic' \| 'json' \| 'toon'` | `'dynamic'` | Default output mode |

**Resolution order** (highest to lowest priority):
1. Per-backend `outputMode` in `.mcp.json`
2. Global `WEIR_TOON_OUTPUT_MODE` env var
3. Default: `dynamic`

## TokenSavings

```typescript
TokenSavings = {
  originalBytes: number      // JSON string length in bytes
  toonBytes: number          // TOON string length in bytes
  originalTokens: number     // exact tokens in JSON (via gpt-tokenizer encode)
  toonTokens: number         // exact tokens in TOON (via gpt-tokenizer encode)
  percent: number            // savings percent (can be negative if TOON is larger)
}
```

Logged via `pino.info()` per converted response. No persistence or aggregation.

## ConversionResult

```typescript
ConversionResult = {
  result: unknown            // the converted/passthrough JSON-RPC response
  savings?: TokenSavings     // token savings if conversion was evaluated
  converted: boolean         // true if TOON was the chosen/forced format
}
```

## OptimizerDecision

```typescript
OptimizerDecision = {
  convert: boolean           // whether TOON conversion is recommended
  reason: string             // human-readable reason for the decision
}
```

## Relationships

```
EnvConfig (global defaults)
      │
      ▼
ToonOptions (resolved per-conversion)
      │
      ├──► Optimizer.decideConvert() → pre-encode guard
      │
      └──► @toon-format/toon.encode() + Stats.estimateSavings()
                │
                ▼
           ConversionResult { result, savings, converted }
                │
                ▼
           pino.info() log (no persistence)
```
