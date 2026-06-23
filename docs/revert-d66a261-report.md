# Relatório de Reversão: Retorno ao commit d66a261

**Data**: 2026-06-22

**Objetivo**: Reverter 7 commits (f21605a → a698bf7) para realinhar com o fluxo SpecKit,
refazendo cada funcionalidade através do pipeline formal: `/speckit.specify` → `/speckit.plan`
→ `/speckit.tasks` → `/speckit.implement`.

---

## Histórico de Commits a serem revertidos

### 1. `f21605a` — docs: document lessons learned from validation

**Mensagem completa**:
```
docs: document lessons learned from validation (AGENTS.md, README.md, plan.md)

- README.md: quickstart, comandos, configuracao, producao
- AGENTS.md: Docker compose pitfalls, ESM resolution, frontend build output
- plan.md: 7 lições aprendidas durante a validação dos cenários quickstart
```

**Arquivos**: AGENTS.md, README.md, specs/001-mcp-gateway-web/plan.md

**Contexto**: Durante a validação T045 (quickstart), identificamos bugs críticos que foram
corrigidos e documentados para evitar recorrência em sessões futuras.

**Lições documentadas**:
1. Dev service subshell — `cd backend && ... &` não afeta o foreground shell
2. Anonymous node_modules volumes — shadow do bind mount, node_modules vazios
3. ESM moduleResolution — `bundler` não adiciona `.js` extensions
4. Frontend outDir — `src/web` vs `dist/web` (mismatch com `__dirname`)
5. docker-compose.yml placeholder — path `./caminho/para/` inexistente
6. MCP_CONFIG_PATH ausente — `process.cwd()` diferente da raiz do projeto
7. @types/ws — pacote ausente para compilação

---

### 2. `3055029` — feat: support flat .mcp.json format

**Mensagem completa**:
```
feat: support flat .mcp.json format (type/command/url at server level)

- Schema accepts both nested (transport.type) and flat (type) formats
- Normalizes flat format to nested via Zod transform
- Volume mounts point to /home/desenvolvimento/Documentos/loja_virtual/.mcp.json
- 4 new tests covering flat format, mixed formats, and validation
- .mcp.json added to .gitignore (user-specific config)
```

**Arquivos**: backend/src/config/schema.ts, backend/tests/unit/schema.test.ts,
docker-compose.dev.yml, docker-compose.yml, .gitignore

**Contexto**: O .mcp.json do projeto loja_virtual usa formato flat (type/command/args/url
no nível do servidor, sem wrapper `transport`). O schema original do Weir só aceitava
formato nested. A solução foi usar Zod.union + Zod.transform para normalizar.

**Decisão**: O path fixo `/home/desenvolvimento/Documentos/loja_virtual/.mcp.json` nos
docker-compose foi a primeira tentativa. Posteriormente substituído por env var.

---

### 3. `21ab29c` — chore: fix lint configuration, formatting, and typecheck

**Mensagem completa**:
```
chore: fix lint configuration, formatting, and typecheck

- Add files patterns to ESLint flat config (backend + frontend)
- Install @typescript-eslint/parser for TS/TSX support
- Fix prettier formatting in 4 files
- All checks passing: lint, format, typecheck, tests
```

**Arquivos**: backend/eslint.config.js, backend/package.json, backend/package-lock.json,
backend/src/api/ws.ts, backend/src/index.ts, backend/tests/integration/docker.test.ts,
backend/tests/unit/watcher.test.ts, frontend/eslint.config.js, frontend/package.json,
frontend/package-lock.json

**Contexto**: O ESLint 9 flat config exige `files: ["src/**/*.ts"]` para especificar
quais arquivos lintar. Sem isso, ESLint ignorava todos os arquivos. Também instalado
`@typescript-eslint/parser` para análise de TypeScript.

**Prettier**: 4 arquivos com formatação incorreta foram corrigidos.

---

### 4. `bdd4407` — chore: parametrize .mcp.json volume path with MCP_CONFIG_SOURCE

**Mensagem completa**:
```
chore: parametrize .mcp.json volume path with MCP_CONFIG_SOURCE

- docker-compose.yml/dev.yml: usa ${MCP_CONFIG_SOURCE:-./.mcp.json}
- Local: criar .env com MCP_CONFIG_SOURCE=/home/.../loja_virtual/.mcp.json
- .mcp.example.json: 7 MCPs (stdio, http, sse), ambos formatos (nested + flat)
- .env.example: template com path do loja_virtual
- .gitignore: nega .env.example para versionamento
```

**Arquivos**: docker-compose.yml, docker-compose.dev.yml, .mcp.example.json,
.env.example, .gitignore

**Contexto**: Substituição do path fixo loja_virtual pela variável de ambiente
`MCP_CONFIG_SOURCE`. O Docker Compose suporta interpolação de variáveis diretamente
no YAML com `${VAR:-default}`.

**Arquivos criados**:
- `.mcp.example.json` — 7 MCPs (filesystem, memory, weather-api, clickup, events,
  bitbucket, empty-transport), misturando formatos nested e flat
- `.env.example` — template para desenvolvimento local

---

### 5. `2b67c6c` — docs: add architecture overview and development guide

**Mensagem completa**:
```
docs: add architecture overview and development guide

- README.md: arquitetura (fluxo loader/watcher/ws) + desenvolvimento local
- docs/architecture.md: visão geral, componentes, schema, fluxo de atualização
- docs/development.md: workflow, .mcp.json externo, troubleshooting, formatos
```

**Arquivos**: README.md, docs/architecture.md, docs/development.md

**Conteúdo**:
- `docs/architecture.md`: Diagrama ASCII, descrição de cada componente do backend
  e frontend, fluxo de atualização automática, restrições
- `docs/development.md`: Fluxo de trabalho, uso de .mcp.json externo, troubleshooting
  dos 7 bugs conhecidos, estrutura do .mcp.json (ambos formatos)

---

### 6. `769fa7a` — spec: adicionar specs retroativas

**Mensagem completa**:
```
spec: adicionar specs retroativas para flat-format e development-tooling

- specs/002-flat-format-support: schema flat, volume parametrizavel
- specs/003-development-tooling: lint/format/typecheck, documentacao
- Checklists de qualidade para ambas as features
- Planos e tasks com implementacao ja marcada como concluida
```

**Arquivos**: specs/002-flat-format-support/{spec,plan,tasks,checklists}.md,
specs/003-development-tooling/{spec,plan,tasks,checklists}.md,
.specify/feature.json

**Contexto**: Specs criadas retroativamente para documentar decisões já implementadas.
Ambas com 100% das tasks marcadas como concluídas.

---

### 7. `a698bf7` — chore: bump version to 0.2.0

**Mensagem completa**:
```
chore: bump version to 0.2.0

Adicoes desde 0.1.0:
- Schema flat .mcp.json (type/command/url no nivel do servidor)
- MCP_CONFIG_SOURCE para volume parametrizavel
- .mcp.example.json com ambos formatos
- ESLint, Prettier, typecheck corrigidos
- Documentacao: arquitetura, desenvolvimento, AGENTS.md
- Specs retroativas: 002-flat-format-support, 003-development-tooling
```

**Arquivos**: backend/package.json, frontend/package.json

**Tag**: `v0.2.0`

---

## Resumo de Arquivos (diff stat)

```
31 files changed, 1351 insertions(+), 36 deletions(-)
```

| Tipo | Quantidade |
|------|-----------|
| Arquivos criados | 15 |
| Arquivos modificados | 16 |
| Arquivos excluídos | 0 |

### Categorias

| Categoria | Arquivos |
|-----------|----------|
| Documentação do projeto | AGENTS.md, README.md |
| Documentação técnica | docs/architecture.md, docs/development.md |
| Specs | specs/002-flat-format-support/*, specs/003-development-tooling/* |
| Config Docker | docker-compose.yml, docker-compose.dev.yml |
| Config ESLint | backend/eslint.config.js, frontend/eslint.config.js |
| Schema | backend/src/config/schema.ts |
| Testes | backend/tests/unit/schema.test.ts |
| Lint/format | backend/src/*.ts (4 arquivos corrigidos) |
| Dependências | backend/package.json, backend/package-lock.json, frontend/package.json, frontend/package-lock.json |
| Exemplos | .mcp.example.json, .env.example |
| Infra | .gitignore, .specify/feature.json |
| Versão | backend/package.json, frontend/package.json (0.1.0 → 0.2.0) |

---

## Estado Pós-Revert

**Commit alvo**: `d66a26126f4efad62045330e16af4627e8a70606`

**O que permanece**:
- Fases 1-6 completas (45 tasks originais)
- 31/31 testes passando
- Docker multi-stage + docker-compose dev/prod
- Frontend React + TanStack Query + Tailwind
- Watcher chokidar + WebSocket

**O que será perdido (e refeito via SpecKit)**:
- Formato flat .mcp.json (schema apenas nested)
- MCP_CONFIG_SOURCE (path fixo `./.mcp.json`)
- ESLint config (quebrado — sem files pattern, sem parser TS)
- Prettier formatting (4 arquivos não formatados)
- AGENTS.md (apenas 4 linhas, sem lições de Docker/ESM)
- README.md (apenas tagline, sem quickstart/arquitetura)
- docs/architecture.md
- docs/development.md
- .mcp.example.json
- .env.example
- .mcp.json no .gitignore
- specs/002-* e specs/003-*
- Tag v0.2.0

---

## Motivação da Reversão

As funcionalidades listadas foram implementadas **fora do fluxo SpecKit** — sem spec,
sem plan, sem tasks prévias. A reversão permite:

1. Criar spec.md formal para cada feature (o quê e por quê)
2. Planejar a implementação com plan.md
3. Detalhar tarefas com tasks.md
4. Implementar com checklist de qualidade
5. Garantir rastreabilidade completa

Isso assegura que cada decisão seja documentada antes da implementação,
alinhado ao princípio SDD (Schema-Driven Development) da Constituição v1.1.0.
