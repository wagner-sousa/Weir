Gerar tasks para implementação da conversão JSON→TOON no Weir, baseado na spec (specs/013-json-toon-conversion/spec.md) e plan (specs/013-json-toon-conversion/plan.md).

2 User Stories independentes:
- US1 (P1) MVP: Agente recebe resposta otimizada — ToonConverter integrado no pipeline do proxy
- US2 (P2): Operador configura TOON — outputMode per-backend (via .mcp.json) + env vars globais, sem restart

Fases e tarefas:

Phase 1 - Setup:
- Instalar @toon-format/toon em backend/package.json (npm install)
- Criar backend/src/toon/

Phase 2 - Foundational (BLOQUEIA tudo):
- Schemas Zod: OutputMode, ToonOptions adicionados em backend/src/config/schema.ts
- Tipos inferidos em backend/src/config/types.ts
- outputMode opcional no MCPServerEntry schema
- WEIR_TOON_* vars adicionadas no EnvConfig (AUTO_CONVERT, DELIMITER, INDENT, FLATTEN_DEPTH, THRESHOLD, OUTPUT_MODE)

Phase 3 - US1 (P1):
Testes (escrever primeiro, devem falhar):
- stats.test.ts: estimateTokens(vazio=0, 1char=1, 4chars=1, 5chars=2), estimateSavings(idêntico=zero, TOON menor=positivo, TOON maior=negativo)
- optimizer.test.ts: isUniformArray(uniforme=true, não-uniforme=false, vazio=false, primitivo=false), maxDepth(flat=2, nested=5, null=1), decideConvert(threshold skip, primitive skip, depth>=6 skip, uniform convert)
- toon-converter.test.ts: convertResult(array uniforme grande com savings, JSON pequeno convertido, non-JSON text passa, non-text ignora, guard dinâmico mantém JSON, convertForced sempre converte)

Implementação:
- stats.ts: estimateTokens, estimateSavings, TokenSavings interface
- optimizer.ts: maxDepth, isUniformArray, decideConvert, OptimizerDecision
- converter.ts: ToonConverter(encode, decode, convertResult com guard dinâmico, convertForced). Anexa _meta no content: { "morph/format", "morph/originalTokens", "morph/toonTokens", "morph/savingsPercent" }. Loga savings via pino.info()
- Integrar no proxy: import ToonConverter em backend/src/proxy/index.ts, instanciar com ToonOptions do config, interceptar respostas tools/call após receber do backend e antes de enviar ao agente. Fallback silencioso em erro (log pino.warn, retorna JSON original)

Phase 4 - US2 (P2):
- Leitura de outputMode per-backend no proxy (MCPServerEntry.outputMode > env WEIR_TOON_OUTPUT_MODE > default 'dynamic')
- Hot-read: ToonOptions lê de env vars + .mcp.json a cada requisição (sem watcher)
- Garantir que mudanças no .mcp.json (outputMode) ou env vars entrem em vigor na próxima chamada

Phase 5 - Polish:
- Barrel exports em backend/src/toon/index.ts
- npm run typecheck
- npm test (suite completa)
- npm run lint

Path: backend/src/ e backend/tests/. moduleResolution NodeNext: extensão .js nos imports.
Sem SQLite, sem dashboard, sem métricas agregadas. Savings apenas logados via pino.
Template tasks: .specify/templates/tasks-template.md.
Salvar em specs/013-json-toon-conversion/tasks.md.