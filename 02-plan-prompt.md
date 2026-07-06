Gerar plano de implementação para conversão JSON→TOON no Weir, baseado na spec em specs/013-json-toon-conversion/spec.md.

Pesquisar e documentar:
1. @toon-format/toon: API encode(input, options?)/decode(input, options?), options (indent, delimiter, keyFolding, flattenDepth). Ver /home/desenvolvimento/Documentos/morph/src/toon/converter.ts
2. Otimizador estrutural: maxDepth, isUniformArray, decideConvert com threshold=100, pular primitivos, pular depth>=6, converter uniform arrays. Ver /home/desenvolvimento/Documentos/morph/src/toon/optimizer.ts
3. Estimativa de tokens: ~4 chars/token (Math.ceil(text.length/4)). Ver /home/desenvolvimento/Documentos/morph/src/toon/stats.ts
4. Pipeline do Weir: backend/src/proxy/index.ts (forwarding bidirecional stdin/stdout), backend/src/proxy/proxy.ts, backend/src/services/mcp-client.ts
5. Schemas existentes: backend/src/config/schema.ts (TransportConfig, MCPServerEntry, MCPConfig, EnvConfig), backend/src/config/types.ts
6. Dependência nova: @toon-format/toon (npm install, adicionar em backend/package.json)

Data model (schemas Zod):
- OutputMode = z.enum(['dynamic', 'json', 'toon'])
- ToonOptions = z.object({ delimiter: enum comma/tab/pipe (default comma), indent: 0-8 (default 2), flattenDepth: >=0 (default 4), threshold: >=0 (default 100), outputMode: OutputMode (default dynamic) })
- MCPServerEntry ganha campo opcional outputMode?: OutputMode
- EnvConfig ganha WEIR_TOON_* vars: AUTO_CONVERT (boolean), DELIMITER, INDENT, FLATTEN_DEPTH, THRESHOLD, OUTPUT_MODE
- Tipos inferidos: type OutputMode, type ToonOptions (z.infer)

Contracts em specs/013-json-toon-conversion/contracts/:
- converter.ts: ToonConverter class (constructor com ToonOptions, setOptions, encode, decode, convertResult com guard dinâmico, convertForced). ConversionResult { result, savings?, converted }. TokenSavings { originalBytes, toonBytes, originalTokens, toonTokens, percent }
- optimizer.ts: OptimizerDecision { convert, reason }, maxDepth, isUniformArray, decideConvert

Fora de escopo: SQLite, dashboard, métricas agregadas (sem metrics.ts). Savings são apenas logados via pino.info().

Estrutura final:
backend/src/toon/ (converter.ts, optimizer.ts, stats.ts) + backend/src/config/schema.ts (+OutputMode/ToonOptions)
backend/tests/unit/ (toon-converter.test.ts, optimizer.test.ts, stats.test.ts)

Salvar em specs/013-json-toon-conversion/: research.md, data-model.md, quickstart.md, contracts/converter.ts, contracts/optimizer.ts