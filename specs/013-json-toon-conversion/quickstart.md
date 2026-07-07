# Quickstart: JSON-to-TOON Response Conversion

## Prerequisites

- Docker + Docker Compose
- Weir dev environment running via `docker compose -f docker-compose.dev.yml up -d`

## Install New Dependency

```bash
docker compose -f docker-compose.dev.yml run --rm setup
```

The `@toon-format/toon` and `gpt-tokenizer` packages are added to `backend/package.json` and installed automatically during setup.

## Validation Scenarios

### Scenario 1: Dynamic mode (default) — TOON more compact

1. Start Weir: `docker compose -f docker-compose.dev.yml up -d`
2. Configure a backend with a large JSON response in `.mcp.json`
3. Call a tool on that backend
4. **Expected**: Response arrives in TOON format; log shows `savings.percent > 0`

### Scenario 2: Dynamic mode — JSON more compact

1. Use same setup as Scenario 1
2. Call a tool that returns a very small JSON response (< 100 chars)
3. **Expected**: Response arrives as plain JSON (optimizer's threshold rule skips conversion)

### Scenario 3: `toon` mode (forced)

1. Set `WEIR_TOON_OUTPUT_MODE=toon` in `docker-compose.dev.yml`
2. Restart container (or wait for hot-read)
3. Call a tool on any backend
4. **Expected**: Response is always TOON-encoded even when larger than JSON

### Scenario 4: `json` mode (disabled)

1. Set `WEIR_TOON_OUTPUT_MODE=json` or set `outputMode: json` on a specific backend
2. Call a tool
3. **Expected**: Response is always plain JSON regardless of size

### Scenario 5: Per-backend override

1. Set `WEIR_TOON_OUTPUT_MODE=dynamic` globally
2. Set `outputMode: json` on one specific backend entry in `.mcp.json`
3. Call tools on both backends
4. **Expected**: Overridden backend returns JSON; others return optimized responses

### Scenario 6: Non-JSON response passthrough

1. Configure a backend that returns binary or plain text responses
2. Call a tool on it
3. **Expected**: Response passes through unchanged in all output modes

### Scenario 7: Conversion failure fallback

1. Introduce an error in the TOON library (e.g., invalid options)
2. Call a tool
3. **Expected**: Response is delivered as plain JSON; error logged via pino; no agent-visible error

## Running Tests

```bash
docker compose -f docker-compose.dev.yml exec dev sh -c "cd /app/backend && npx vitest run tests/unit/toon-converter.test.ts tests/unit/optimizer.test.ts tests/unit/stats.test.ts"
```

## Checking Logs

TOON conversion events are logged at `info` level with the pattern:

```
TOON: converted {name} item {index}: {originalTokens}→{toonTokens} tok ({percent}% savings)
```

Or for dynamic mode where JSON was kept:

```
TOON: skipped {name} item {index}: JSON more compact ({percent}% larger as TOON)
```

## Data Model Reference

See [data-model.md](data-model.md) for full schema definitions.

## Contract Reference

- [Converter contract](contracts/converter.ts) — `ToonConverter` class interface
- [Optimizer contract](contracts/optimizer.ts) — `decideConvert`, `maxDepth`, `isUniformArray`
