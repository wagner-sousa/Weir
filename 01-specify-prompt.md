Implementar conversão de respostas JSON para TOON (Token-Oriented Object Notation) no Weir, reduzindo tokens em 30-60% para agentes de IA.

O Weir é um gateway MCP transparente (modo --proxy) que faz forwarding bidirecional de mensagens JSON-RPC entre agentes e backends MCP via stdin/stdout. A conversão TOON deve se encaixar no sentido backend→agent (respostas), sem afetar requisições.

A conversão TOON deve:
- Avaliar cada resposta JSON de MCP tool call em ambos formatos (JSON e TOON)
- Entregar o formato mais compacto (menos bytes), de forma transparente ao agente
- Fallback silencioso para JSON original se a conversão falhar
- Suportar 3 modos de saída: dynamic (escolhe o menor), json (nunca converte), toon (sempre converte)
- Apenas processar respostas JSON text (não binário, streaming, non-JSON)
- Não alterar o conteúdo lógico — apenas o formato wire muda

Configurável via: variáveis de ambiente WEIR_TOON_* (AUTO_CONVERT, DELIMITER, INDENT, FLATTEN_DEPTH, THRESHOLD, OUTPUT_MODE) e campo outputMode opcional por entry no .mcp.json, com hot-read (lê env vars em cada inicialização de conversão, sem watcher).

Usar @toon-format/toon (encode/decode TOON). Heurística ~4 chars/token para estimativa. Otimizador estrutural: threshold mínimo (100 chars), pular primitivos, pular profundidade >=6, converter arrays uniformes (maior benefício).

Stack: TypeScript ESM (NodeNext, extensão .js nos imports), Zod 3.24 (schemas), pino (logging), Vitest 3 (testes). Schemas Zod em backend/src/config/schema.ts com tipos inferidos em backend/src/config/types.ts. SDD: schemas primeiro, depois testes falhando, depois implementação. Módulo TOON em backend/src/toon/ (converter.ts, optimizer.ts, stats.ts).

Fora de escopo: persistência SQLite, dashboard frontend, métricas agregadas por backend. O Weir não tem banco de dados — savings são apenas logados via pino.

User stories:
US1 (P1): Agente conectado ao Weir recebe respostas otimizadas — o proxy avalia JSON e TOON e retorna o mais compacto, sem alterações no agente.
US2 (P2): Operador habilita/desabilita TOON por backend via outputMode no .mcp.json + env vars globais, sem restart.

Referência: /home/desenvolvimento/Documentos/morph/src/toon/ (implementação funcional do MORPH).
Spec existente para refinar: specs/013-json-toon-conversion/spec.md.