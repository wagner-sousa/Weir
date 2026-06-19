# Research: MCP Gateway Web

## Decisions

### Linguagem e Runtime
- **Decision**: TypeScript 5.7+ com Node.js >=22 (ESM)
- **Rationale**: Tipagem estatica para seguranca do schema .mcp.json,
  ESM nativo no Node 22, ecossistema maduro para ferramentas MCP
  (@modelcontextprotocol/sdk). Consistente com o projeto MORPH de referencia.
- **Alternatives considered**: Python (FastAPI) — ecossistema MCP menos maduro;
  Go — sem SDK MCP oficial.

### Servidor HTTP
- **Decision**: Fastify 5
- **Rationale**: Performatico, schema-based (serializacao/validacao),
  bom suporte a WebSocket, static files e CORS. Plugins oficiais para
  cada necessidade (@fastify/cors, @fastify/static, @fastify/websocket).
- **Alternatives considered**: Express — menos performatico, sem validacao
  nativa; Hono — mais novo, ecossistema menor.

### Schema Validation
- **Decision**: Zod 3.24
- **Rationale**: Fonte da verdade executavel para o schema .mcp.json.
  Tipos TypeScript inferidos automaticamente. Gera JSON Schema para
  documentacao. Padrao no MORPH.
- **Alternatives considered**: TypeBox — mais complexo; JSON Schema —
  sem inferencia de tipos nativa.

### File Watching
- **Decision**: chokidar 4
- **Rationale**: Maduro, confiavel em Linux/macOS/Windows, baixa latencia
  para deteccao de alteracoes. Usado no MORPH.
- **Alternatives considered**: fs.watch nativo — inconsistente entre
  plataformas; polling manual — menos eficiente.

### Frontend Framework
- **Decision**: React 19 + Vite 6 + Tailwind CSS 4
- **Rationale**: React e o padrao da industria para SPA. Vite e rapido
  no desenvolvimento (HMR) e build. Tailwind CSS 4 com utilitarios
  para design responsivo (3 colunas). Consistente com MORPH Studio.
- **Alternatives considered**: Vue + Vite — igualmente viavel, mas React
  tem ecossistema mais amplo para este caso.

### Cliente HTTP (Frontend)
- **Decision**: TanStack React Query 5 + fetch nativo
- **Rationale**: Cache, refetch automatico, polling para detectar
  alteracoes no .mcp.json. Simplifica o gerenciamento de estado servidor.
- **Alternatives considered**: SWR — similar; Redux — excessivo para SPA simples.

### Real-time Updates
- **Decision**: WebSocket para push de alteracoes + polling fallback
- **Rationale**: WebSocket permite notificacao instantanea quando o
  .mcp.json muda. Polling como fallback para ambientes restritos.
  Fastify tem suporte nativo a WebSocket.

### Logging
- **Decision**: pino 9
- **Rationale**: Logger estruturado, extremamente rapido, saida JSON.
  Padrao no ecossistema Fastify. Usado no MORPH.

### Docker
- **Decision**: Multi-stage build (frontend build + backend)
- **Rationale**: Imagem final unica e enxuta contendo backend + frontend
  compilado. Volume somente para .mcp.json.

## Dependencies

| Dependente | Versao | Uso |
|------------|--------|-----|
| Node.js | >=22 | Runtime ESM |
| TypeScript | 5.7+ | Linguagem |
| Fastify | 5 | Servidor HTTP |
| @fastify/cors | 11 | CORS |
| @fastify/static | 8 | Static files |
| @fastify/websocket | 11 | WebSocket |
| Zod | 3.24 | Schema validation |
| chokidar | 4 | File watcher |
| pino | 9 | Logging |
| pino-pretty | 13 | Dev logging |
| React | 19 | UI framework |
| Vite | 6 | Bundler |
| Tailwind CSS | 4 | Estilos |
| @tanstack/react-query | 5 | Server state |
| @tanstack/react-router | 1 | Roteamento |
| Vitest | 3 | Testes |
| @modelcontextprotocol/sdk | 1.29 | Conhecimento MCP |

## Architecture

```
Browser ──HTTP/WS──► Fastify ──► Router ──► MCPController
                        │                        │
                        │                   chokidar (file watch)
                        │                        │
                    static files             .mcp.json
                    (React SPA)

Fluxo:
1. Weir inicia → chokidar monitora .mcp.json
2. Fastify servve API REST + WebSocket + static files
3. Browser carrega React SPA via static serve
4. SPA busca GET /api/mcps → exibe cartoes
5. chokidar detecta alteracao → WebSocket broadcast → SPA atualiza
```
