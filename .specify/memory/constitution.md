<!--
  Sync Impact Report
  ==================
  Version change: 1.7.0 → 1.8.0
  Modified principles: None (principles unchanged)
  Added sections:
    - Principle IX: Spec Naming Convention
  Removed sections: None
  Modified sections: None
  Templates requiring updates:
    - .specify/templates/plan-template.md: ⚠ pending — add IX row to Constitution Check table
    - .specify/templates/spec-template.md: ✅ no change needed
    - .specify/templates/tasks-template.md: ✅ no change needed
    - .specify/templates/checklist-template.md: ✅ no change needed
    - .specify/templates/constitution-template.md: ✅ Template is source — no change needed
  Documentation requiring updates: None
  Follow-up TODOs:
    - Update plan-template.md Constitution Check table with IX
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

### VII. Dependency First

Every non-trivial capability MUST be implemented via an existing,
well-maintained Node.js package unless a strong justification for
building from scratch is documented. The npm registry is the
default source for packages. Custom implementations are permitted
only when no suitable package exists, the package is unmaintained,
or the required functionality is trivially small (< 50 lines).
Rationale: proven libraries have fewer bugs, better performance,
community support, and security audits than custom code. Every
new npm dependency MUST be justified in the pull request.

### VIII. Icon-First Buttons (Non-Form)

Actionable controls outside form contexts MUST prioritise
icons over text labels. Every icon-only button MUST include
a tooltip describing its function or action. Text labels
remain acceptable inside forms (e.g., "Test Connection",
"Save") where clarity is paramount. Exceptions for non-form
buttons that are inherently ambiguous without text require
explicit approval.

### IX. Spec Naming Convention

User stories and Functional Requirements in specification
documents (spec.md) MUST use generic role-based descriptors
(e.g., "auth-gated HTTP MCP", "local HTTP MCP", "stdio MCP")
instead of real service names (e.g., Postman, Serena, Bitbucket).
Real service names MAY appear in research.md as implementation
context, but MUST NOT be used in user stories or FRs.
Rationale: keeping specs service-agnostic ensures they remain
valid and reusable across different MCP implementations, prevents
coupling of requirements to specific third-party services, and
allows the spec to communicate intent without requiring knowledge
of specific tools.

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

**Version**: 1.8.0 | **Ratified**: 2026-06-19 | **Last Amended**: 2026-06-30
