# Weir

The invisible gateway for your MCP servers, with visibly fewer tokens.

## Quickstart

### Pre-requisitos

- Docker + Docker Compose

### Setup

```bash
docker compose -f docker-compose.dev.yml run --rm setup
```

### Desenvolvimento

```bash
docker compose -f docker-compose.dev.yml up
```

Acessar: http://localhost:5173 (frontend Vite dev) ou http://localhost:3000 (API)

## Configuracao do .mcp.json

O Weir le um arquivo `.mcp.json` na raiz do projeto com os servidores MCP. Suporta dois formatos:

### Formato flat (recomendado)

```json
{
  "mcpServers": {
    "filesystem": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"]
    },
    "weather-api": {
      "type": "http",
      "url": "https://api.weather.example/mcp"
    },
    "db-stream": {
      "type": "sse",
      "url": "https://db.internal/mcp/sse"
    }
  }
}
```

### Formato nested (transport wrapper)

```json
{
  "mcpServers": {
    "filesystem": {
      "transport": {
        "type": "stdio",
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"]
      }
    }
  }
}
```

Ambos os formatos podem coexistir no mesmo arquivo. Veja `.mcp.example.json` para um template completo.

## Modo Producao

```bash
docker compose up
```

Acessar: http://localhost:3000

O arquivo `.mcp.json` e montado como volume. Use `MCP_CONFIG_SOURCE` para apontar para um caminho customizado:

```bash
MCP_CONFIG_SOURCE=~/outro-projeto/.mcp.json docker compose up

Variaveis de timeout (valores em ms):

```bash
MCP_CONNECTION_TIMEOUT=5000 MCP_ADD_TIMEOUT=30000 docker compose up
```
```

## Comandos via Docker Compose

| Comando | Descricao |
|---------|-----------|
| `docker compose -f docker-compose.dev.yml up` | Dev com hot-reload (backend + frontend) |
| `docker compose -f docker-compose.dev.yml run --rm setup` | Instalar dependencias |
| `docker compose -f docker-compose.dev.yml run --rm test` | Testes (Vitest) |
| `docker compose -f docker-compose.dev.yml run --rm build` | Compilar TypeScript |
| `docker compose -f docker-compose.dev.yml run --rm typecheck` | Checagem de tipos (`tsc --noEmit`) |
| `docker compose -f docker-compose.dev.yml run --rm lint` | Lint (ESLint 9 flat config) |
| `docker compose -f docker-compose.dev.yml run --rm format` | Verificar formatacao (Prettier) |
| `docker compose -f docker-compose.dev.yml run --rm format:fix` | Corrigir formatacao |
| `docker compose up` | Producao (Docker multi-stage) |

## Stack

- **Backend**: TypeScript, Node.js >=22 (ESM), Fastify 5, Zod 3.24, chokidar 4, pino 9
- **Frontend**: React 19, Vite 6, Tailwind CSS 4, TanStack React Query 5
- **Testes**: Vitest 3
- **Container**: Docker multi-stage (Linux)
