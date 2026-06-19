# Data Model: MCP Gateway Web

## Entidades

### MCPClient (Entidade principal)

Representa um servidor MCP configurado no .mcp.json.

**Atributos:**

| Campo | Tipo | Origem | Descricao |
|-------|------|--------|-----------|
| name | string | Chave no mcpServers | Nome unico do MCP |
| transport | TransportType | .transport.type | Tipo de transporte |
| command | string? | .transport.command | Comando stdio (so stdio) |
| args | string[]? | .transport.args | Argumentos (so stdio) |
| url | string? | .transport.url | URL HTTP/SSE (so http/sse) |

**TransportType** (enum):
- `stdio` — processo filho (command + args)
- `http` — requisicao REST
- `sse` — Server-Sent Events (streaming)
- `unknown` — qualquer outro tipo nao reconhecido

### MCPConfig (Agregador)

Representa o arquivo .mcp.json completo.

**Atributos:**

| Campo | Tipo | Descricao |
|-------|------|-----------|
| mcpServers | Record<string, MCPServerEntry> | Mapa nome → configuracao |

### MCPServerEntry

Estrutura de cada entrada no mcpServers.

| Campo | Tipo | Descricao |
|-------|------|-----------|
| transport | TransportConfig | Configuracao de transporte |

### TransportConfig

| Campo | Tipo | Descricao |
|-------|------|-----------|
| type | "stdio" \| "http" \| "sse" | Tipo de transporte |
| command | string? | Comando (stdio) |
| args | string[]? | Argumentos (stdio) |
| url | string? | URL (http/sse) |

## Schema Zod (Fonte da Verdade)

```typescript
import { z } from "zod";

const TransportType = z.enum(["stdio", "http", "sse"]);

const TransportConfig = z.object({
  type: TransportType,
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  url: z.string().url().optional(),
}).refine(
  (data) => {
    if (data.type === "stdio") return !!data.command;
    if (data.type === "http" || data.type === "sse") return !!data.url;
    return true;
  },
  { message: "Transport config missing required fields for type" }
);

const MCPServerEntry = z.object({
  transport: TransportConfig,
});

const MCPConfig = z.object({
  mcpServers: z.record(z.string(), MCPServerEntry),
});
```

## Regras de Validacao

- O campo `mcpServers` e obrigatorio e deve ser um objeto nao-vazio
- Cada chave em mcpServers deve ser um nome unico (nao vazio)
- `stdio` requer `command` (string obrigatoria)
- `http`/`sse` requer `url` (URL valida obrigatoria)
- Tipos de transporte desconhecidos sao aceitos como `unknown` mas exibidos como "Desconhecido"

## Estados

O sistema nao gerencia estado de MCPs — apenas leitura do arquivo.
Estados de apresentacao:

- **Carregando**: Aguardando leitura inicial do .mcp.json
- **Vazio**: .mcp.json nao encontrado ou sem servidores configurados
- **Exibindo**: Lista de cartoes com MCPs validos
- **Erro**: .mcp.json invalido ou mal formatado
- **Atualizando**: Alteracao detectada, recarregando dados
