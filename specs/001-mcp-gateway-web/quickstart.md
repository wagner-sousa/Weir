# Quickstart: MCP Gateway Web

## Pre-requisitos

- Docker + Docker Compose

## Setup

```bash
# Instalar dependencias e build via docker-compose
docker compose -f docker-compose.dev.yml run --rm setup
```

O servico `setup` executa `npm install` no backend e frontend, e `npm run build` no frontend.

## Modo Desenvolvimento

```bash
docker compose -f docker-compose.dev.yml up
```

Acessar: http://localhost:3000

O servico `dev` usa `tsx watch` para hot-reload do backend e `vite dev` para HMR do frontend.

## Comandos via Docker Compose

```bash
# Testes
docker compose -f docker-compose.dev.yml run --rm test

# Typecheck
docker compose -f docker-compose.dev.yml run --rm typecheck

# Build
docker compose -f docker-compose.dev.yml run --rm build

# Lint
docker compose -f docker-compose.dev.yml run --rm lint

# Format
docker compose -f docker-compose.dev.yml run --rm format
```

## Validacao

### Cenario 1: Lista vazia

```bash
# Remover/renomear .mcp.json (no host)
mv .mcp.json .mcp.json.bak
# Iniciar Weir
docker compose -f docker-compose.dev.yml up
# Acessar http://localhost:3000 — deve mostrar "Nenhum MCP configurado"
```

### Cenario 2: MCPs via stdio

Criar `.mcp.json`:
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

```bash
docker compose -f docker-compose.dev.yml up
# Acessar http://localhost:3000 — deve mostrar 1 card "filesystem" com badge stdio
```

### Cenario 3: Multiplos MCPs

```bash
docker compose -f docker-compose.dev.yml up
# Acessar http://localhost:3000 — 3 cards em 1 linha (3 colunas)
```

### Cenario 4: Hot-reload

```bash
docker compose -f docker-compose.dev.yml up
# Editar .mcp.json no host — a interface atualiza em <5s sem recarregar
```

### Cenario 5: Producao (Docker)

```bash
docker compose up
# Acessar http://localhost:3000
```

### Cenario 6: JSON invalido

```bash
echo "invalid json" > .mcp.json
docker compose -f docker-compose.dev.yml up
# Acessar http://localhost:3000 — deve mostrar mensagem de erro de parse
```

## Docker Compose (producao)

`docker-compose.yml`:
```yaml
services:
  weir:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./caminho/para/.mcp.json:/app/.mcp.json
```

## Scripts via docker-compose

| Comando Docker Compose | Descricao |
|------------------------|-----------|
| `docker compose -f docker-compose.dev.yml up` | Dev com hot-reload |
| `docker compose -f docker-compose.dev.yml run --rm test` | Testes (vitest) |
| `docker compose -f docker-compose.dev.yml run --rm build` | Compilar TypeScript |
| `docker compose -f docker-compose.dev.yml run --rm typecheck` | Checagem de tipos |
| `docker compose -f docker-compose.dev.yml run --rm lint` | Lint (ESLint) |
| `docker compose -f docker-compose.dev.yml run --rm format` | Formatacao (prettier) |
