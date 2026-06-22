# Implementation Plan: MCP Connection Manager

**Branch**: `002-mcp-connection-manager` | **Date**: 2026-06-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-mcp-connection-manager/spec.md`

## Summary

Allow users to manage MCP server connections directly from the Weir dashboard:
add new MCPs via a dynamic modal (fields vary by transport type), test connections
before saving, view live connection status per card, reconnect on failure, see
tool counts, and remove MCPs — all with toast notifications for feedback.
Extends the existing .mcp.json read/write flow with new backend API endpoints
for test-connection, tool-count, add, and remove operations.

## Technical Context

**Language/Version**: Node.js 22, TypeScript 5.x (moduleResolution nodenext)

**Primary Dependencies**:
- Backend: Fastify + chokidar + zod (SSE via native Fastify reply.raw)
- Frontend: React 18 + TanStack React Query + Vite
- Test: Vitest + supertest

**Storage**: .mcp.json (filesystem JSON, read/write via existing loader + new writer)

**Testing**: Vitest (unit + integration), supertest for API

**Target Platform**: Linux Docker container (existing docker-compose setup)

**Project Type**: Web application (backend API + React SPA)

**Performance Goals**:
- Connection status updates reflected within 5s (SC-002)
- Add/remove operations reflected in <2s (SC-005)
- Connection test returns result within 10s (SC-006)
- Toast notification appears within 1s of add/remove completing (SC-004)

**Constraints**:
- No parallel config — .mcp.json is the single source of truth (Constitution IV)
- All dev commands via docker-compose (Dev Workflow 6)
- Lint before every commit (Dev Workflow 8)
- Docs updated in same commit (Dev Workflow 9)

**New Fields**:
- `env` field added to stdio transport in modal (FR-004): editable table with key-value pairs, "Add variable" button opens two input fields. Only shown for stdio transport. Passed as environment variables to the spawned MCP process during test and runtime.

**Docker Networking**:
- HTTP/SSE connection tests run on the **backend** (inside Docker container)
- `localhost` inside the container resolves to the container itself, NOT the host or other containers
- **Solution (planned)**: Backend replaces `localhost`/`127.0.0.1` → `host.docker.internal` during HTTP/SSE test requests. Requires `extra_hosts` in docker-compose files (`host.docker.internal:host-gateway`). Original URL in `.mcp.json` is never altered.
- For cross-container MCP URLs, users can use Docker service names (e.g., `http://meu-servico-mcp:3101`)

**Real-time Status**:
- Backend pushes connection state changes via SSE at `GET /api/mcps/events`
- Frontend subscribes with native `EventSource` — no WebSocket dependency needed
- Events: `status` with payload `{ name, status, toolCount, error }`

**Scale/Scope**: Single-user dashboard, file-based config, local network MCPs

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Assessment | Status |
|-----------|-----------|--------|
| I. SDD | New API endpoints need Zod schemas before implementation | ✅ Pass |
| II. Test-First | All endpoints need tests before implementation | ✅ Pass |
| III. pt-BR for Users | Toasts, modal labels, tooltips must be pt-BR | ✅ Pass |
| IV. .mcp.json Truth | Add/remove writes directly to .mcp.json — no parallel config | ✅ Pass |
| V. Simplicity | Reuse existing backend/frontend patterns, no duplication | ✅ Pass |
| Dev Workflow 7 | Any new config params need .env.example entry | ✅ Pass — `MCP_CONNECTION_TIMEOUT` added to `.env.example` with default `5000` |
| Dev Workflow 8 | Lint before commit | ✅ Pass |
| Dev Workflow 9 | Docs updated in same commit | ✅ Pass |

**No violations found. Complexity Tracking section may remain empty.**

## Project Structure

### Documentation (this feature)

```text
specs/002-mcp-connection-manager/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── api.md            # API contracts for new endpoints
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── api/
│   │   ├── mcp.routes.ts     # Extended with new endpoints
│   │   └── ws.ts              # Already broadcasts config:changed
│   ├── config/
│   │   ├── schema.ts          # Already supports flat+nested
│   │   ├── loader.ts          # Already reads .mcp.json
│   │   └── writer.ts          # NEW: write/append/remove entries
│   └── services/
│       └── mcp-client.ts      # NEW: test connection, query tools
├── tests/
│   ├── unit/
│   │   └── writer.test.ts     # NEW
│   └── integration/
│       └── mcp-api.test.ts    # NEW

frontend/
├── src/
│   ├── components/
│   │   ├── CardGrid.tsx       # Extended with footer, status icon
│   │   ├── MCPCard.tsx        # Extended with footer + status icon
│   │   └── AddMCPModal.tsx    # NEW: modal with dynamic form
│   ├── services/
│   │   └── api.ts             # Extended with new endpoints
│   └── hooks/
│       └── useMCPs.ts         # Extended with mutations
```

**Structure Decision**: Web application structure (Option 2) as established by the
existing project. New files follow existing naming conventions and patterns.

## Complexity Tracking

> No constitution violations to justify. Section remains empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
