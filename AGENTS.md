<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan at specs/003-edit-mcp-config/plan.md
<!-- SPECKIT END -->

## Conhecidos Pitfalls (Docker & ESM)

### Dev service subshell
O servico `dev` no `docker-compose.dev.yml` usa `sh -c` com `&` para rodar backend e frontend no mesmo container. Isso faz com que Ctrl+C mate apenas o processo em foreground. Use `docker compose down` para parar.

### Anonymous volumes para node_modules
`/app/backend/node_modules` e `/app/frontend/node_modules` sao anonymous volumes para evitar sobrescrita pelo bind mount. Ao trocar de branch, rode `docker compose -f docker-compose.dev.yml run --rm setup` para reinstalar dependencias.

### moduleResolution nodenext
O tsconfig usa `"module": "NodeNext"` e `"moduleResolution": "nodenext"`. Isso exige extensoes `.js` nos imports mesmo para arquivos `.ts`. Esquecer a extensao causa erro `Cannot find module`.

### MCP_CONFIG_PATH
O backend le `MCP_CONFIG_PATH` para localizar o `.mcp.json`. No `docker-compose.dev.yml` o valor e `/app/.mcp.json`. O `docker-compose.yml` de producao usa `MCP_CONFIG_SOURCE` para o caminho host.

### Modo proxy (`--proxy <name>`)
O Weir suporta modo proxy transparente: `weir --proxy <name>`. Nesse modo, o backend lê `.mcp.json`, conecta ao backend MCP especificado e faz forwarding bidirecional de mensagens JSON-RPC via stdin/stdout. Suporta três transportes: stdio, SSE e HTTP. Reconexão automática com exponential backoff e buffer de mensagens durante desconexão.

### Testes do proxy
Testes unitários em `backend/tests/unit/proxy.test.ts` (state machine, buffer, backoff). Testes de integração em `backend/tests/integration/proxy.test.ts` (forwarding stdio→stdio, múltiplas mensagens, concorrência US3). Executar com: `docker compose -f docker-compose.dev.yml exec dev sh -c "cd /app/backend && npm test"`.

### Novas env vars do proxy
`WEIR_PROXY_RECONNECT_BASE_DELAY`, `WEIR_PROXY_RECONNECT_MAX_DELAY`, `WEIR_PROXY_RECONNECT_MAX_RETRIES`, `WEIR_PROXY_BUFFER_LIMIT`, `WEIR_PROXY_BACKEND_TIMEOUT`, `WEIR_PROXY_KEEPALIVE_MS`. Ver `.env.example`.

### Stale .mcp.json em testes
O servico `test` no `docker-compose.dev.yml` nao define `MCP_CONFIG_PATH`, entao usa o padrao `/app/backend/.mcp.json`. Testes de integracao que escrevem `.mcp.json` via `POST /api/mcps` podem criar um artefato nesse caminho, que persiste no bind mount. Isso faz com que `GET /api/mcps` tente conectar em servidores MCP que ja nao existem mais, causando timeout. Solucao: `rm backend/.mcp.json`.

### Node.js 22 fetch error structure
`fetch` no Node.js 22 lanca `TypeError("fetch failed")` com `err.cause` contendo detalhes. DNS: `cause.code === 'ENOTFOUND'`, `cause.message` contem `'getaddrinfo ENOTFOUND <host>'`. Connection refused: `cause.code === 'ECONNREFUSED'` (AggregateError). Timeout: `err.name === 'TimeoutError'` (sem cause). Use `parseFetchError()` em `backend/src/services/mcp-client.ts` para formatar.

### Mock fetch, not testConnection, in error-path tests
Ao testar `testConnection` em erro, mock `fetch` globalmente (`vi.stubGlobal('fetch', ...)`) em vez de mockar `testConnection` via `vi.mock`. Mockar `testConnection` em nivel de modulo bypassa `parseFetchError`, impedindo testar a formatacao do erro. Ver `backend/tests/unit/mcp.routes.test.ts` T011.

### Debug files in tests/
Arquivos `backend/tests/debug-*.test.ts` sao apanhados pelo `vitest run` e incluidos na suite. Remova-os apos exploracao para evitar falso-positivos no `npm test`.

### Cache persistente em disco (mcp-cache.json)
O cache de status dos MCPs agora persiste em disco via `conf` (npm), criando `<dirname-do-MCP_CONFIG_PATH>/mcp-cache.json`. Isso impede que contadores zerem ao reiniciar o servidor (ex: tsx watch). O cache expirado pelo TTL nao e carregado do disco. O arquivo e recriado automaticamente. Incluir no `.gitignore`.
