<!--
  Sync Impact Report
  ==================
  Version change: 1.4.0 → 1.5.0
  Modified principles: None (principles unchanged)
  Added sections: None
  Removed sections: None
  Modified sections:
    - Stack Tecnologica (rewritten from generic to real stack)
    - Development Workflow (expanded SDD cycle, gen:schema, SPEC:/IMPL:)
  Templates requiring updates:
    - .specify/templates/plan-template.md: ✅ No principle-specific content — no change needed
    - .specify/templates/spec-template.md: ✅ No principle-specific content — no change needed
    - .specify/templates/tasks-template.md: ✅ No principle-specific content — no change needed
    - .specify/templates/checklist-template.md: ✅ No principle-specific content — no change needed
    - .specify/templates/constitution-template.md: ✅ Template is source — no change needed
  Documentation requiring updates: None
  Follow-up TODOs: None
-->

# Weir Constitution

## Core Principles

### I. Schema-Driven Development (SDD)

Schemas MUST be defined before any implementation.
Every endpoint, command, and configuration MUST have a
validatable schema. Schemas are the source of architectural
truth — no feature may exist without a schema that formally
describes it.

### II. Test-First (NON-NEGOTIABLE)

TDD is mandatory in this order: (1) tests written and
approved by the user, (2) tests fail on execution,
(3) implementation written, (4) tests pass. The Red-Green-Refactor
cycle MUST be rigorously followed. No production code shall
be written before the test that validates it.

### III. English for User-Facing Messages

All messages displayed to end users (toasts, tooltips,
labels, buttons, validation errors, status indicators)
MUST be in English. Prompts sent to agents MUST be in the
user's chosen language. Source code (variable names,
functions, classes, comments) and technical documentation
MUST be in English.

### IV. .mcp.json as the Source of Truth

The .mcp.json file is the single, binding source of truth
for all Weir configurations. Every feature MUST derive from
the .mcp.json schema. The parser and validator of .mcp.json
are fundamental components upon which all others depend. No
parallel manual configuration shall exist.

### V. Simplicity and Unified Gateway

Weir MUST prioritize simplicity and developer experience.
The web mode and the container mode MUST share the same
underlying logic — no duplication. Configuration MUST
require minimal effort. Coverage of happy paths AND edge
cases is mandatory for production readiness.

### VI. Consistent Icon Library

All user-facing icons MUST be sourced from a single,
consistent Node package (e.g., lucide-react). Inline SVG
markup, raw Unicode characters, and image files are NOT
permitted for icons. This ensures visual consistency,
accessibility (aria-labels), and ease of maintenance.
Exceptions require explicit approval.

## Stack Tecnologica

**Backend**: Node.js >=22 (ESM), TypeScript 5.7+, Fastify 5
(@fastify/cors, @fastify/static, @fastify/websocket),
Zod 3.24 (fonte da verdade executável), chokidar 4 (file
watcher / hot-reload), pino 9 + pino-pretty 13, tsx 4 (dev
runner), Vitest 3 (tests/unit/ + tests/integration/),
ESLint 9 + typescript-eslint + Prettier 3.

**Frontend**: React 19, Vite 6, @tanstack/react-query 5,
Tailwind CSS 4, lucide-react.

**Transportes**: stdio, HTTP, SSE, OAuth.

**Infra**: Docker + Docker Compose (dev e producao).
Every external dependency MUST be justified.

## Development Workflow

1. SDD — contrato primeiro:
   1a. Schema Zod em src/config/schema.ts.
   1b. Tipos inferidos em src/config/types.ts via z.infer.
   1c. JSON Schema gerado via npm run gen:schema (nunca editado
       manualmente).
   1d. Arquivos marcados com SPEC: (contratos) e IMPL:
       (implementacoes).
   1e. Teste falhando.
   1f. Implementacao.
2. TDD — write test → see it fail → implement → see it pass.
3. Constitutional compliance review is mandatory on every PR.
4. Every complexity MUST be justified by current need, not
   future speculation (YAGNI).
5. Frequent, atomic commits after each task or logical group
   of tasks.
6. Every development, test, build, and execution command MUST
   be invoked via docker-compose.*.yml. No node/npm commands
   on the host directly.
7. Every new configuration MUST have a corresponding parameter
   in .env.example and .env, and MUST be wired in all
   docker-compose.*.yml files. No hardcoded configuration
   without an environment variable.
8. Lints (ESLint, Prettier, typecheck) MUST pass before every
   commit. No commit with lint warnings or errors is acceptable.
9. Every new spec, adjustment, or correction MUST be reflected
   in documentation (README, docs/, quickstart) in the same
   commit. Outdated documentation is considered a bug.

## Governance

This Constitution supersedes all other development practices.
Amendments REQUIRE: (a) documentation of the change,
(b) approval by review, and (c) a migration plan when
applicable. Versioning follows Semantic Versioning
(MAJOR.MINOR.PATCH) applied to the Constitution document.
Every PR review MUST verify compliance with the principles
defined herein. Omissions shall be resolved by the general
principles of simplicity and developer experience.

**Version**: 1.5.0 | **Ratified**: 2026-06-19 | **Last Amended**: 2026-06-23
