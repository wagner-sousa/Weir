# Prompts para /speckit.specify

## 1. Flat format .mcp.json

```
/speckit.specify O Weir deve aceitar o formato flat de .mcp.json onde type, command, args e url ficam no nivel do servidor sem o wrapper transport, para compatibilidade com projetos existentes que usam essa convencao. O schema deve normalizar o formato flat para o formato nested internamente. Ambos os formatos podem coexistir no mesmo arquivo. Suportar os tres tipos de transport: stdio, http, sse.
```

## 2. Volume parametrizavel via env var

```
/speckit.specify O caminho do .mcp.json montado como volume nos docker-compose deve ser parametrizavel via variavel de ambiente MCP_CONFIG_SOURCE, permitindo que o desenvolvedor aponte para um arquivo em outro projeto sem modificar os arquivos versionados. Quando a variavel nao estiver definida, deve usar ./.mcp.json como fallback.
```

## 3. Exemplos versionados

```
/speckit.specify Criar .mcp.example.json na raiz do projeto com exemplos de configuracao MCP em ambos os formatos (nested transport e flat), cobrindo os tres tipos de transporte (stdio, http, sse), para servir como documentacao e template para novos usuarios. Criar .env.example com a documentacao da variavel MCP_CONFIG_SOURCE. Adicionar .mcp.json ao .gitignore e garantir que .env.example seja versionado.
```

## 4. Corrigir ESLint, Prettier e Typecheck

```
/speckit.specify As ferramentas de desenvolvimento do projeto (ESLint, Prettier, Typecheck) devem funcionar corretamente via docker-compose. O ESLint 9 flat config precisa do padrao files para especificar quais arquivos lintar, e do parser @typescript-eslint/parser para analisar TypeScript. O Prettier deve formatar todos os arquivos do backend. O comando tsc --noEmit deve passar sem erros.
```

## 5. Documentacao base (AGENTS.md + README.md)

```
/speckit.specify Atualizar o README.md com quickstart, tabela de comandos docker-compose, configuracao do .mcp.json e modo producao. Atualizar o AGENTS.md com os pitfalls conhecidos de Docker e ESM (dev service subshell, anonymous volumes, moduleResolution nodenext, MCP_CONFIG_PATH) para evitar erros em sessoes futuras de agentes.
```

## 6. Guia tecnico (docs/architecture.md + docs/development.md)

```
/speckit.specify Criar docs/architecture.md com visao geral da arquitetura do Weir: diagrama de fluxo, descricao de cada componente do backend e frontend, schema do .mcp.json (ambos formatos) e fluxo de atualizacao automatica via watcher + WebSocket. Criar docs/development.md com guia de desenvolvimento local: workflow, uso de .mcp.json externo via MCP_CONFIG_SOURCE, troubleshooting dos erros comuns e estrutura do .mcp.json.
```

