# Implementation Plan: OAuth Storage Separate

**Branch**: `009-oauth-storage-separate` | **Date**: 2026-06-24 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/009-oauth-storage-separate/spec.md`

## Summary

Move OAuth2 credentials (`accessToken`, `auth.clientId`, `auth.clientSecret`, `pendingCodeVerifier`) from `.mcp.json` to a new separate file `.mcp-auth.json`. Provide automatic migration for existing configurations. Keep `.mcp.json` clean of secrets so it can be shared safely.

## Technical Context

**Language/Version**: Node.js 22, TypeScript 5.x (moduleResolution nodenext)

**Primary Dependencies**:
- Backend: Fastify + zod + chokidar + **conf** (new — atomic JSON storage for `.mcp-auth.json`)
- Frontend: No changes needed
- Test: Vitest + supertest

**Storage**:
- `.mcp.json`: Transport config only (no secrets). Stripped on write, migrated on read.
- `.mcp-auth.json`: OAuth2 tokens + client credentials. File permission 0600.
- Path: `MCP_AUTH_CONFIG_PATH` env var (default: same dir as `.mcp.json` → `.mcp-auth.json`)

**Testing**: Vitest (unit + integration), supertest for API

**Target Platform**: Linux Docker container (existing docker-compose setup)

**Project Type**: Web application — backend-only storage refactoring

**Performance Goals**: Migration < 100ms for 50 MCPs (SC-004)

**Constraints**:
- `.mcp-auth.json` permissions MUST be 0600
- Migration is one-way: OAuth fields removed from `.mcp.json` after migration
- Orphaned entries in `.mcp-auth.json` (MCP no longer in `.mcp.json`) are ignored
- No frontend changes
- All dev commands via docker-compose
- Lint before every commit
- Docs updated in same commit

**Current Architecture**:
- `auth.routes.ts`: Writes `accessToken` and `pendingCodeVerifier` to `.mcp.json` via `saveRawConfig`
- `mcp.routes.ts`: Reads `accessToken` from `.mcp.json` for each HTTP request
- `loader.ts`: Loads config but doesn't strip OAuth fields
- `writer.ts`: Writes full config including OAuth fields

**Target Architecture**:
- `auth-storage.ts` (NEW): Centralized read/write to `.mcp-auth.json` via `conf` package
- `auth.routes.ts`: Uses `auth-storage.ts` instead of direct `.mcp.json` writes
- `mcp.routes.ts`: Reads `accessToken` from `auth-storage.ts`
- `writer.ts`: Strips OAuth fields before writing `.mcp.json`
- Startup: Auto-migrate existing OAuth data from `.mcp.json` to `.mcp-auth.json`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Assessment | Status |
|-----------|-----------|--------|
| I. SDD | AuthStorage schema defined in data-model.md | ✅ Pass |
| II. Test-First | Tests needed for migration, read/write | ✅ Pass |
| III. English UI | No new messages | ✅ Pass |
| IV. .mcp.json Truth | .mcp.json still source of truth for config; auth data in separate file per spec | ✅ Pass |
| V. Simplicity | Single new service file; no new deps | ✅ Pass |
| VI. Icon Library | No icons | ✅ Pass |
| VII. Dependency First | Uses `conf` package instead of custom fs code (atomic writes, schema) | ✅ Pass |
| Dev Workflow 7 | New `MCP_AUTH_CONFIG_PATH` env var | ✅ Pass |
| Dev Workflow 8 | Lint before commit | ✅ Pass |
| Dev Workflow 9 | Docs updated in same commit | ✅ Pass |

**No violations found.**

## Project Structure

### Documentation (this feature)

```text
specs/009-oauth-storage-separate/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── api.md            # Updated API contracts
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── services/
│   │   └── auth-storage.ts     # NEW: read/write .mcp-auth.json
│   ├── api/
│   │   ├── mcp.routes.ts      # CHANGED: read accessToken from auth-storage
│   │   └── auth.routes.ts     # CHANGED: write tokens via auth-storage
│   └── config/
│       └── writer.ts          # CHANGED: strip OAuth fields before write
├── tests/
│   ├── unit/
│   │   └── auth-storage.test.ts  # NEW: unit tests for auth-storage
│   └── integration/
│       └── auth-storage.test.ts  # NEW: integration tests for migration
```

**Structure Decision**: Web application — backend-only changes.

## Complexity Tracking

> No constitution violations to justify. Section remains empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
