---

description: "Task list for JSON-to-TOON conversion feature"
---

# Tasks: JSON-to-TOON Response Conversion

**Input**: Design documents from `specs/013-json-toon-conversion/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Tests are REQUIRED — TDD approach per Weir Constitution (Principle II).

**Organization**: Tasks grouped by user story. Each story is independently implementable and testable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2)
- Exact file paths in descriptions
- All imports use `.js` extension (NodeNext module resolution)

## Phase 1: Setup

**Purpose**: Project initialization and dependency installation

- [X] T001 Install @toon-format/toon ^2.3 and gpt-tokenizer ^3.4 in backend/package.json (npm install)
- [X] T002 Create backend/src/toon/ directory structure

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Zod schemas and types that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 [P] Add OutputMode schema (z.enum(['dynamic', 'json', 'toon'])) to backend/src/config/schema.ts
- [X] T004 [P] Add ToonOptions schema (delimiter, indent, flattenDepth, threshold, outputMode) to backend/src/config/schema.ts
- [X] T005 Add optional outputMode field to MCPServerEntry schema in backend/src/config/schema.ts
- [X] T006 Add WEIR_TOON_* env vars (AUTO_CONVERT, DELIMITER, INDENT, FLATTEN_DEPTH, THRESHOLD, OUTPUT_MODE) to EnvConfig in backend/src/config/schema.ts
- [X] T007 Export inferred types (OutputMode, ToonOptions) in backend/src/config/types.ts

**Checkpoint**: Foundation ready — user story implementation can now begin

---

## Phase 3: User Story 1 — Agent Receives Optimally Compact Response (Priority: P1) 🎯 MVP

**Goal**: ToonConverter integrated in the proxy pipeline. JSON tool responses are evaluated in both formats and the more compact one is delivered to the agent transparently.

**Independent Test**: Agent connected to Weir proxy calls a tool on a TOON-enabled backend; response arrives in the more compact format (TOON or JSON) and decodes to identical data as original JSON.

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T008 [P] [US1] Write stats.test.ts: estimateTokens (empty=0, 1char=1, 4chars=1, 5chars=2), estimateSavings (identical=0%, TOON smaller=positive%, TOON larger=negative%) in backend/tests/unit/stats.test.ts
- [X] T009 [P] [US1] Write optimizer.test.ts: isUniformArray (uniform=true, non-uniform=false, empty=false, primitive=false), maxDepth (flat=2, nested=5, null=1), decideConvert (threshold skip, primitive skip, depth>=6 skip, uniform convert) in backend/tests/unit/optimizer.test.ts
- [X] T010 [P] [US1] Write toon-converter.test.ts: convertResult (uniform array with savings, non-JSON text passes, non-text ignored, dynamic guard keeps JSON, equal-size=JSON, convertForced always converts) in backend/tests/unit/toon-converter.test.ts

### Implementation for User Story 1

- [X] T011 [P] [US1] Implement stats.ts: estimateTokens, estimateSavings, TokenSavings interface in backend/src/toon/stats.ts (uses gpt-tokenizer encode().length)
- [X] T012 [P] [US1] Implement optimizer.ts: maxDepth, isUniformArray, decideConvert, OptimizerDecision in backend/src/toon/optimizer.ts
- [X] T013 [US1] Implement converter.ts: ToonConverter class (encode, decode, convertResult with dynamic guard, convertForced) in backend/src/toon/converter.ts — attaches _meta: { "morph/format", "morph/originalTokens", "morph/toonTokens", "morph/savingsPercent" }, logs savings via pino.info()
- [X] T014 [US1] Integrate ToonConverter in proxy pipeline: import in backend/src/proxy/index.ts, instantiate with ToonOptions from config, intercept tools/call responses after receiving from backend, before forwarding to agent. Silent fallback on error (pino.warn, return original JSON)
- [X] T015b [US1] Add optional outputMode field to proxy config assembly: resolve MCPServerEntry.outputMode in backend/src/proxy/index.ts (wire schema field into proxy backend config)

**Checkpoint**: User Story 1 fully functional — agent receives optimally compact responses

---

## Phase 4: User Story 2 — Administrator Configures Output Mode Per Backend (Priority: P2)

**Goal**: Per-backend outputMode via .mcp.json overrides global WEIR_TOON_OUTPUT_MODE env var. Configuration changes take effect on next conversion (hot-read, no restart).

**Independent Test**: Set WEIR_TOON_OUTPUT_MODE=dynamic globally and outputMode: json on one backend; that backend returns JSON while others return optimized responses.

### Tests for User Story 2 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T015a [P] [US2] Write outputMode-resolution.test.ts: precedence (per-backend > env > default), hot-read (change .mcp.json outputMode, verify next call picks new value), env override (set WEIR_TOON_OUTPUT_MODE, verify fallback), invalid outputMode (fallback to dynamic + warn) in backend/tests/unit/outputMode-resolution.test.ts

### Implementation for User Story 2

- [X] T015c [US2] Implement per-backend outputMode resolution in proxy: outputMode precedence perBackend > envOutputMode > 'dynamic' in backend/src/proxy/index.ts
- [X] T016 [US2] Implement hot-read: read env vars + .mcp.json outputMode on each conversion initialization (no watcher, no restart) in backend/src/proxy/index.ts
- [X] T017 [US2] Ensure .mcp.json outputMode changes and env var changes take effect on next tool call (verify end-to-end resolution order)

**Checkpoint**: User Story 2 complete — administrator can configure TOON per backend

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Final integrity checks

- [X] T018 [P] Create barrel exports in backend/src/toon/index.ts
- [X] T019 Run docker compose -f docker-compose.dev.yml run --rm typecheck (fix any type errors)
- [X] T020 Run docker compose -f docker-compose.dev.yml run --rm test (full suite must pass)
- [X] T021 Run docker compose -f docker-compose.dev.yml run --rm lint (fix any lint errors)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Foundational — no dependency on other stories
- **US2 (Phase 4)**: Depends on Foundational — T015 partially touches US1 code but is independently testable (env-only config works without TOON conversion logic)
- **Polish (Phase 5)**: Depends on all user stories complete

### User Story Dependencies

- **US1 (P1)**: Can start after Phase 2 — fully independent MVP
- **US2 (P2)**: Can start after Phase 2 — independently testable (config resolution without conversion)

### Within Each User Story

- Tests written and FAIL before implementation (TDD)
- Models/stats before core logic
- Core logic before proxy integration
- Story complete before next priority

### Parallel Opportunities

- T001–T002: Setup tasks in parallel
- T003–T004: Schema tasks in parallel
- T008–T010: All US1 tests in parallel
- T011–T012: stats.ts + optimizer.ts in parallel
- T018: Barrel export independent of other polish tasks

---

## Parallel Example: User Story 1

```bash
# Launch all US1 tests together:
Task: "Write stats.test.ts in backend/tests/unit/stats.test.ts"
Task: "Write optimizer.test.ts in backend/tests/unit/optimizer.test.ts"
Task: "Write toon-converter.test.ts in backend/tests/unit/toon-converter.test.ts"

# Launch stats + optimizer implementations together:
Task: "Implement stats.ts in backend/src/toon/stats.ts"
Task: "Implement optimizer.ts in backend/src/toon/optimizer.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test US1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 → Test independently → Deploy/Demo (MVP!)
3. Add US2 → Test independently → Deploy/Demo
4. Each story adds value without breaking previous stories

---

## Notes

- All imports use `.js` extension (NodeNext module resolution)
- gpt-tokenizer encode().length for exact token counts (not heuristic)
- Savings logged via pino.info() — no dashboard, no DB, no aggregation
- Silent fallback on TOON errors — original JSON returned, error logged via pino.warn()

---

## Phase 6: Convergence

**Purpose**: Close remaining gaps identified by `/speckit.converge` assessment

- [X] T022 Attach `_meta: { "morph/format", "morph/originalTokens", "morph/toonTokens", "morph/savingsPercent" }` to conversion result in `backend/src/toon/converter.ts` per T013 (partial)
- [X] T023 Log `pino.warn` when `resolveOutputMode()` encounters invalid `outputMode` value, falling back to `dynamic` per EC2 (partial)
- [X] T024 Add TOON conversion to `startProxy` incoming handler in `backend/src/proxy/proxy.ts` for the CLI `--proxy` mode path per FR-001 (partial)
- [X] T025 Wire `WEIR_TOON_AUTO_CONVERT` into `ToonConverter` (skip conversion when false) or remove from `EnvConfig` schema per FR-008 (partial)
- [X] T026 Update `plan.md` test file list to include `outputMode-resolution.test.ts` per Constitution §9 (partial)

---

## Phase 7: Convergence

- [X] T027 Forward `envConfig.WEIR_TOON_AUTO_CONVERT` to `ToonOptions.autoConvert` in `createConverterForConfig` (`backend/src/proxy/index.ts:165-171`) and `startProxy` (`backend/src/proxy/proxy.ts:117-123`) so that `WEIR_TOON_AUTO_CONVERT=false` is honored per FR-008 (partial)
