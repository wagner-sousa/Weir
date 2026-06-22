# Development Guide: Weir

## Workflow

### Setup inicial

```bash
# Instalar dependencias (backend + frontend)
docker compose -f docker-compose.dev.yml run --rm setup
```

### Desenvolvimento

```bash
# Iniciar dev com hot-reload
docker compose -f docker-compose.dev.yml up
```

O servico `dev` roda simultaneamente:
- **Backend** (`tsx watch`): http://localhost:3000 — Fastify com hot-reload
- **Frontend** (`vite dev`): http://localhost:5173 — Vite com HMR

O frontend em dev faz proxy de `/api` e `/ws` para o backend.

### Comandos

```bash
# Testes
docker compose -f docker-compose.dev.yml run --rm test

# Typecheck
docker compose -f docker-compose.dev.yml run --rm typecheck

# Lint
docker compose -f docker-compose.dev.yml run --rm lint

# Format
docker compose -f docker-compose.dev.yml run --rm format

# Build
docker compose -f docker-compose.dev.yml run --rm build
```

### Producao

```bash
docker compose up
```

Acessar: http://localhost:3000

## Usando .mcp.json externo

Por padrao o Weir usa `.mcp.json` na raiz do projeto. Para apontar para um arquivo em outro diretorio:

```bash
MCP_CONFIG_SOURCE=~/outro-projeto/.mcp.json docker compose up
```

Variaveis de ambiente:

| Variavel | Descricao | Padrao |
|----------|-----------|--------|
| `MCP_CONFIG_SOURCE` | Caminho host para .mcp.json | `./.mcp.json` |
| `MCP_CONFIG_PATH` | Caminho container para .mcp.json | `/app/.mcp.json` |

## Estrutura do .mcp.json

Veja `.mcp.example.json` e `docs/architecture.md` para schema completo.

### Exemplo minimo

```json
{
  "mcpServers": {
    "meu-servidor": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"]
    }
  }
}
```

### Formatos aceitos

- **Flat**: `{ "type": "stdio", "command": "...", "args": [...] }`
- **Nested**: `{ "transport": { "type": "stdio", "command": "...", "args": [...] } }`

Ambos os formatos podem coexistir no mesmo arquivo.

## Troubleshooting

### `Cannot find module` ao importar

```
Error: Cannot find module './api/mcp.routes'
```

**Causa**: Falta extensao `.js` no import.

**Solucao**: O tsconfig usa `moduleResolution: nodenext`, que exige extensoes `.js` mesmo para arquivos `.ts`.

```typescript
// Correto:
import { mcpRoutes } from './api/mcp.routes.js';
// Errado:
import { mcpRoutes } from './api/mcp.routes';
```

### Ctrl+C nao para o container dev

**Causa**: O servico `dev` usa `sh -c` com `&` para rodar backend e frontend no mesmo container. Ctrl+C mata apenas o processo em foreground.

**Solucao**: Use `docker compose -f docker-compose.dev.yml down`.

### Node modules corrompidos apos trocar de branch

**Causa**: Anonymous volumes para `node_modules` evitam sobrescrita pelo bind mount. Ao trocar de branch, as dependencias podem ficar desatualizadas.

**Solucao**:
```bash
docker compose -f docker-compose.dev.yml run --rm setup
```

### ESLint: "All files are ignored"

**Causa**: ESLint 9 flat config sem `files` pattern.

**Solucao**: O eslint.config.js precisa de `files: ['src/**/*.ts', 'tests/**/*.ts']` e do parser `@typescript-eslint/parser` para TypeScript.

### Porta 3000 ja em uso

```bash
# Verificar o que esta usando a porta
lsof -i :3000
# Ou mudar a porta:
PORT=3001 docker compose -f docker-compose.dev.yml up
```

### Testes do Docker falham (docker.test.ts)

**Causa**: O teste de integracao Docker precisa de acesso ao daemon Docker, que nao esta disponivel dentro do container de teste.

**Solucao**: Execute com o perfil `validation` que monta `/var/run/docker.sock`:
```bash
docker compose -f docker-compose.dev.yml run --rm docker-test
```
