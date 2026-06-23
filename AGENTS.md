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

### Stale .mcp.json em testes
O servico `test` no `docker-compose.dev.yml` nao define `MCP_CONFIG_PATH`, entao usa o padrao `/app/backend/.mcp.json`. Testes de integracao que escrevem `.mcp.json` via `POST /api/mcps` podem criar um artefato nesse caminho, que persiste no bind mount. Isso faz com que `GET /api/mcps` tente conectar em servidores MCP que ja nao existem mais, causando timeout. Solucao: `rm backend/.mcp.json`.
