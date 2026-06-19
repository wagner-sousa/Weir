# API Contracts: MCP Gateway Web

## GET /api/mcps

Retorna a lista de servidores MCP configurados.

**Response 200:**

```json
{
  "mcps": [
    {
      "name": "my-server",
      "transport": "stdio",
      "status": "configured"
    },
    {
      "name": "api-server",
      "transport": "http",
      "status": "configured"
    }
  ]
}
```

**Response 200 (vazio):**

```json
{
  "mcps": []
}
```

**Response 500 (erro de parse):**

```json
{
  "error": "Falha ao ler o arquivo .mcp.json: [detalhe do erro]"
}
```

## GET /api/health

Healthcheck do servidor.

**Response 200:**

```json
{
  "status": "ok",
  "hasConfig": true,
  "mcpCount": 2
}
```

**Response 200 (sem config):**

```json
{
  "status": "ok",
  "hasConfig": false,
  "mcpCount": 0
}
```

## WebSocket /ws

Broadcast de eventos de alteracao do .mcp.json.

**Evento `config:changed`:**

```json
{
  "type": "config:changed",
  "timestamp": "2026-06-19T12:00:00.000Z"
}
```

**Evento `config:error`:**

```json
{
  "type": "config:error",
  "error": "Falha ao parsear .mcp.json",
  "timestamp": "2026-06-19T12:00:00.000Z"
}
```

## Frontend → Backend Data Flow

```
Browser                     Fastify                      chokidar
  │                           │                            │
  │  GET /api/mcps            │                            │
  ├──────────────────────────►│                            │
  │  ◄────────────────────────┤                            │
  │    200 { mcps: [...] }    │                            │
  │                           │                            │
  │  WebSocket connect /ws    │                            │
  ├──────────────────────────►│                            │
  │                           │                            │
  │                           │                  .mcp.json modified
  │                           │◄───────────────────────────┤
  │                           │                            │
  │  ─── config:changed ───►  │                            │
  │                           │                            │
  │  GET /api/mcps (refetch)  │                            │
  ├──────────────────────────►│                            │
  │  ◄────────────────────────┤                            │
  │    200 { mcps: [...] }    │                            │
```
