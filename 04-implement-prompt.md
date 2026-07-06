Implementar conversão JSON→TOON no Weir seguindo as tasks em specs/013-json-toon-conversion/tasks.md. Usar contracts em specs/013-json-toon-conversion/contracts/ como guia.

Implementar na ordem: stats → optimizer → converter → schema → proxy.

stats.ts (backend/src/toon/stats.ts):
- estimateTokens(text): Math.ceil(text.length / 4)
- estimateSavings(original, toon): { originalBytes, toonBytes, originalTokens, toonTokens, percent }
- Interface TokenSavings

optimizer.ts (backend/src/toon/optimizer.ts):
- maxDepth(value, current=1): recursivo, objetos/arrays incrementam depth, null retorna 1
- isUniformArray(value): array de objetos plain com mesmas sorted keys; false para vazio/primitivos/não-array
- decideConvert(rawText, parsed, options): text.length < threshold → skip ("below size threshold"), parsed não é object/array → skip ("primitive value"), maxDepth >= 6 → skip ("deeply nested"), isUniformArray → convert ("high TOON benefit"), else → convert ("eligible")
- Interface OptimizerDecision { convert: boolean, reason: string }
- OptimizerOptions { threshold: number } (default 100)

converter.ts (backend/src/toon/converter.ts):
- ToonConverter class wrapping @toon-format/toon
- constructor(options: ToonOptions), setOptions(options) para hot-reload
- encode(data): string — wrapper para @toon-format/toon encode() com indent, delimiter, flattenDepth
- decode(toon): unknown — wrapper para @toon-format/toon decode()
- convertResult(result: CallToolResult): ConversionResult
  - Itera result.content[], só processa type === "text"
  - Tenta JSON.parse(text), se falhar passa direto
  - Chama optimizer.decideConvert(), se aprovado chama this.encode(parsed)
  - Guard dinâmico: se toonStr.length >= text.length, mantém original
  - Anexa _meta no content: { "morph/format": "toon", "morph/originalTokens": N, "morph/toonTokens": N, "morph/savingsPercent": N }
  - Loga savings via pino.info() quando converte
  - Retorna ConversionResult com savings se pelo menos 1 item convertido
- convertForced(result): igual mas ignora guard dinâmico (sempre retorna TOON)
- Interface ConversionResult { result: CallToolResult, savings?: TokenSavings, converted: boolean }

Schema (backend/src/config/schema.ts):
- OutputMode = z.enum(['dynamic', 'json', 'toon'])
- ToonOptions = z.object({
    delimiter: z.enum(['comma', 'tab', 'pipe']).default('comma'),
    indent: z.number().int().min(0).max(8).default(2),
    flattenDepth: z.number().int().min(0).default(4),
    threshold: z.number().int().min(0).default(100),
    outputMode: OutputMode.default('dynamic'),
  })
- MCPServerEntry: + outputMode: OutputMode.optional()
- EnvConfig: + WEIR_TOON_AUTO_CONVERT (boolean), WEIR_TOON_DELIMITER, WEIR_TOON_INDENT, WEIR_TOON_FLATTEN_DEPTH, WEIR_TOON_THRESHOLD, WEIR_TOON_OUTPUT_MODE

Types (backend/src/config/types.ts):
- type OutputMode = z.infer<typeof OutputMode>
- type ToonOptions = z.infer<typeof ToonOptions>

Proxy (backend/src/proxy/index.ts):
- Importar ToonConverter de ../toon/converter.js
- Instanciar com ToonOptions: ler de env vars (WEIR_TOON_*) com defaults, mergear com outputMode do .mcp.json
- No pipeline de resposta: após receber JSON-RPC response do backend, verificar:
  - É resposta de tools/call (método) e outputMode !== 'json'?
  - Sim: passar pelo ToonConverter.convertResult()
  - Usar resultado convertido (ou original em caso de erro)
- Fallback: try/catch no convertResult, log pino.warn do erro, retornar JSON original
- OutputMode resolution: MCPServerEntry.outputMode ?? env WEIR_TOON_OUTPUT_MODE ?? 'dynamic'
- Hot-read: ler config a cada chamada (sem watcher, sem cache)

Não implementar: SQLite, dashboard, métricas agregadas (sem metrics.ts, sem ToonMetrics). Savings apenas logados via pino.info.

Testes:
- stats.test.ts: 4-5 testes — estimateTokens com várias strings, estimateSavings positivo/negativo/zero
- optimizer.test.ts: 8-10 testes — isUniformArray(true/false/vazio/primitivo), maxDepth(flat/nested/null), decideConvert(cada condição)
- toon-converter.test.ts: 6 testes — array uniforme grande com savings, JSON pequeno, non-JSON text passa, non-text ignora, guard dinâmico mantém JSON, convertForced

Referência direta: /home/desenvolvimento/Documentos/morph/src/toon/converter.ts (127 linhas)
Referência optimizer: /home/desenvolvimento/Documentos/morph/src/toon/optimizer.ts (83 linhas)
Referência stats: /home/desenvolvimento/Documentos/morph/src/toon/stats.ts (36 linhas)
Referência testes: /home/desenvolvimento/Documentos/morph/tests/unit/toon-converter.test.ts

Padrões do Weir: ESM com moduleResolution NodeNext (extensão .js nos imports), Zod para schemas, pino para logging, Vitest 3 para testes. SDD: schema Zod primeiro, teste falhando, implementação.