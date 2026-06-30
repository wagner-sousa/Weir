# Implementation Plan: MCP Gateway Web

**Branch**: `001-mcp-gateway-web` | **Date**: 2026-06-19 | **Spec**: specs/001-mcp-gateway-web/spec.md

**Input**: Feature specification from `specs/001-mcp-gateway-web/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Weir e um hub/gateway MCP que le o arquivo .mcp.json e exibe os servidores
MCP configurados em uma interface web com cartoes (3 por linha), cada um
mostrando nome e tipo de transporte (http/stdio). Suporta deploy via Docker
com o .mcp.json montado como volume e atualizacao automatica em alteracoes
do arquivo. A interface e apenas de leitura — sem edicao ou gerenciamento.

## Technical Context

**Language/Version**: TypeScript 5.7+, Node.js >=22 (ESM)

**Primary Dependencies**:
- Backend: Fastify 5 (@fastify/cors, @fastify/static, @fastify/websocket),
  Zod 3.24 (schema + validacao), chokidar 4 (file watcher), pino 9 (logging),
  @modelcontextprotocol/sdk 1.29 (conhecimento do protocolo)
- Frontend: React 19, Vite 6, Tailwind CSS 4, TanStack React Query 5,
  TanStack React Router 1, Radix UI (dialog, tooltip), lucide-react,
  sonner (notificacoes)

**Storage**: Nenhum — configuracao lida diretamente do .mcp.json (fonte da verdade)

**Testing**: Vitest 3 (unit + integration)

**Target Platform**: Linux (Docker + standalone), acessivel via navegador

**Project Type**: Web application (backend Fastify servindo API + SPA frontend)

**Performance Goals**:
- Pagina carrega em <2s apos iniciar o Weir (CS-001)
- Alteracoes no .mcp.json refletem em <5s (CS-002)
- Container Docker inicia e fica acessivel em <5s (CS-003)

**Constraints**:
- Apenas leitura — sem edicao pela interface
- Deploy via Docker com volume unico: .mcp.json
- Mensagens da interface em portugues brasileiro (pt-BR)
- Backend e frontend compartilham o mesmo processo (backend serve SPA)
- Todos os comandos (dev, test, build, lint) via docker-compose.*.yml

**Scale/Scope**: Usuario unico, ambiente local (sem autenticacao)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Principios aplicaveis e conformidade**:

1. **SDD (Schema-Driven Development)**: Schema .mcp.json definido com Zod
   antes de qualquer implementacao. Schema executavel como fonte da verdade.

2. **Test-First (NON-NEGOTIABLE)**: Testes escritos antes da implementacao
   para parser, validador, API e componentes. Ciclo Red-Green-Refactor.

3. **pt-BR para Agentes e Usuarios**: Toda interface web e mensagens em
   portugues brasileiro. Codigo e documentacao tecnica em ingles.

4. **.mcp.json como Fonte da Verdade**: Exatamente o proposito do Weir —
   ler e exibir o que esta no .mcp.json. Nenhuma configuracao paralela.

5. **Simplicidade e Gateway Unificado**: Modo web e Docker compartilham a
   mesma logica (src/). Interface minimalista, sem funcionalidades extras.

**Violacoes**: Nenhuma. O projeto esta 100% alinhado com a Constituicao.

## Project Structure

### Documentation (this feature)

```text
specs/001-mcp-gateway-web/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0: research & decisions
├── data-model.md        # Phase 1: data model
├── quickstart.md        # Phase 1: validation guide
├── contracts/           # Phase 1: API contracts
│   └── api.md
└── tasks.md             # Created by /speckit.tasks
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── config/
│   │   ├── schema.ts        # Zod schema do .mcp.json (SPEC)
│   │   ├── types.ts         # Tipos inferidos do schema
│   │   ├── loader.ts        # Leitura + parse + validacao do .mcp.json (IMPL)
│   │   └── watcher.ts       # chokidar watch + eventos de alteracao (IMPL)
│   ├── api/
│   │   ├── mcp.routes.ts    # GET /api/mcps — lista de MCPs (IMPL)
│   │   ├── health.routes.ts # GET /api/health — healthcheck (IMPL)
│   │   └── ws.ts            # WebSocket para push de alteracoes (IMPL)
│   ├── web/
│   │   └── (frontend build output — gerado pelo Vite)
│   └── index.ts             # Entry point: Fastify server + static serve (IMPL)
└── tests/
    ├── unit/
    │   ├── schema.test.ts
    │   ├── loader.test.ts
    │   └── mcp.routes.test.ts
    └── integration/
        └── api.test.ts

frontend/
├── src/
│   ├── components/
│   │   ├── CardGrid.tsx     # Grid 3 colunas de MCP cards
│   │   ├── MCPCard.tsx      # Card individual (nome, tipo, 6 variantes de badge)
│   │   ├── EmptyState.tsx   # Mensagem quando sem .mcp.json
│   │   └── ErrorState.tsx   # Mensagem de erro de parse
│   ├── services/
│   │   └── api.ts           # Cliente HTTP (fetch + polling/WS)
│   ├── hooks/
│   │   └── useMCPs.ts       # React Query hook para listar MCPs
│   ├── App.tsx
│   └── main.tsx
└── tests/
    └── components/
        ├── CardGrid.test.tsx
        └── MCPCard.test.tsx

Dockerfile                  # Multi-stage: build frontend + backend
docker-compose.yml
```

**Structure Decision**: Web application (Option 2). Backend Fastify serve
API REST + WebSocket + static frontend. Frontend React com Vite, construido
para `backend/src/web/`. Backend e frontend sao publicados juntos no mesmo
container Docker.

## Complexity Tracking

> Nenhuma — Constitution Check aprovado sem violacoes.
