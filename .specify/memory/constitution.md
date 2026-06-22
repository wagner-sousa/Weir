<!--
  Sync Impact Report
  ==================
  Version change: 1.2.0 → 1.3.0
  Modified principles:
    - III. Brazilian Portuguese for Agents and Users → III. English for User-Facing Messages
  Modified sections: Principle III — rewrote from pt-BR mandate to English mandate
  Added sections: None
  Removed sections: None
  Templates requiring updates:
    - .specify/templates/plan-template.md: ✅ No principle-specific content — no change needed
    - .specify/templates/spec-template.md: ✅ No principle-specific content — no change needed
    - .specify/templates/tasks-template.md: ✅ No principle-specific content — no change needed
    - .specify/templates/checklist-template.md: ✅ No principle-specific content — no change needed
    - .specify/templates/constitution-template.md: ✅ Template is source — no change needed
  Documentation requiring updates (MANUAL):
    - AGENTS.md: Remove the pt-BR constraint from the anchored summary
    - specs/002-mcp-connection-manager/quickstart.md: Update expected outcomes (remove "All toasts appear in pt-BR")
  Follow-up TODOs:
    - Translate existing pt-BR strings in the codebase (toasts, modal labels, tooltips) to English
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

## Stack Tecnologica

Language and framework will be defined during project setup,
prioritizing ecosystems that support static typing and
testability. Docker is mandatory for containerization. The
web interface MUST be delivered as part of the same process
(or via embedded UI). The testing tool will be defined during
setup and MUST support unit, integration, and contract tests.
Every external dependency MUST be justified.

## Development Workflow

1. SDD — define schema first (config, API, data).
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

**Version**: 1.3.0 | **Ratified**: 2026-06-19 | **Last Amended**: 2026-06-22
