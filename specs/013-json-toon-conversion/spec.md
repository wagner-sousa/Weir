# Feature Specification: JSON-to-TOON Response Conversion

**Feature Branch**: `013-json-toon-conversion`

**Created**: 2026-07-06

**Status**: Draft

**Input**: [01-specify-prompt.md](../../01-specify-prompt.md)

## Clarifications

### Session 2026-07-06

- Q: When should TOON be used vs JSON? → A: The system must evaluate both formats and return whichever is more compact (fewer tokens).
- Q: Does TOON apply to all MCP tool returns? → A: No, TOON conversion only applies when the MCP tool return is JSON. Non-JSON responses pass through unchanged.
- Q: What output modes does the conversion support? → A: Three modes: `dynamic` (evaluates both, returns smaller), `json` (never converts), `toon` (always converts).
- Q: How is TOON configured? → A: Via environment variables (`WEIR_TOON_*`) for global settings and optional `outputMode` per entry in `.mcp.json`. No restart required — env vars are read on each conversion.
- Q: Does this feature include a dashboard or persistence? → A: No. Savings are logged via pino only. Dashboard, SQLite, and aggregated metrics are out of scope.

## User Scenarios & Testing

### User Story 1 - Agent Receives Optimally Compact Response (Priority: P1)

An AI agent configured to use Weir as its MCP gateway calls a tool on a backend. Depending on the configured output mode, the response is delivered in the most compact format (dynamic), always TOON, or always JSON. In dynamic mode, both formats are evaluated and the smaller is returned. The agent receives the response transparently — no agent-side changes required.

**Why this priority**: Token reduction is the core value proposition. Without transparent optimization serving actual agent traffic, the feature delivers no benefit.

**Independent Test**: An agent connected to a Weir proxy can call a tool and receive a response that decodes to the identical data as the original JSON, using the format determined by the configured output mode.

**Acceptance Scenarios**:

1. **Given** a backend with output mode `dynamic`, **When** an agent calls a tool, **Then** the response is delivered in the more compact format (TOON or JSON) and decodes to the exact same data as the original JSON
2. **Given** a backend where TOON is more compact than JSON in dynamic mode, **When** an agent calls a tool, **Then** the response is delivered in TOON format
3. **Given** a backend where JSON is more compact than TOON in dynamic mode, **When** an agent calls a tool, **Then** the response is delivered in JSON format
4. **Given** a backend with output mode `toon`, **When** an agent calls a tool, **Then** the response is always delivered in TOON format
5. **Given** a backend with output mode `json`, **When** an agent calls a tool, **Then** the response is delivered as plain JSON (no conversion)
6. **Given** a backend that returns a non-JSON response (e.g., binary, plain text), **When** an agent calls a tool, **Then** the response is delivered as-is in any output mode
7. **Given** a JSON response with deeply nested structures, **When** evaluated in dynamic mode, **Then** deeply nested portions beyond optimization depth pass through as JSON while shallower portions may be TOON-encoded

---

### User Story 2 - Administrator Configures Output Mode Per Backend (Priority: P2)

An administrator sets the TOON output mode through environment variables and per-backend `.mcp.json` settings. The `outputMode` field in `.mcp.json` overrides the global `WEIR_TOON_OUTPUT_MODE` for specific backends. Changes to environment variables take effect on the next conversion (no restart needed).

**Why this priority**: Different backends have different response profiles — some benefit from TOON, others don't. Per-backend control allows gradual, selective rollout.

**Independent Test**: An administrator sets `WEIR_TOON_OUTPUT_MODE=dynamic` globally and `outputMode: json` on one backend; that backend always returns JSON while others return optimized responses.

**Acceptance Scenarios**:

1. **Given** a running gateway with `WEIR_TOON_OUTPUT_MODE=dynamic`, **When** an agent calls any backend without explicit `outputMode`, **Then** responses are optimized (dynamic mode)
2. **Given** a running gateway, **When** an administrator sets `outputMode: json` on a specific backend in `.mcp.json`, **Then** that backend's responses are always JSON
3. **Given** a running gateway with `WEIR_TOON_OUTPUT_MODE=dynamic`, **When** an administrator changes it to `WEIR_TOON_OUTPUT_MODE=toon`, **Then** subsequent responses are always TOON-encoded
4. **Given** a per-backend `outputMode: json` in `.mcp.json`, **When** the global env var is `dynamic`, **Then** the per-backend setting takes precedence

---

### Edge Cases

- What happens when both formats yield identical size in dynamic mode? (Return JSON)
- How does the system behave when an unsupported output mode value is configured? (Fall back to `dynamic`, log a warning via pino)
- What happens if the comparison or TOON conversion fails for a specific response?
- How does the system handle responses where TOON optimization would not benefit (e.g., very short responses under threshold)?
- What happens when `WEIR_TOON_OUTPUT_MODE` is unset? (Default to `dynamic`)

## Requirements

### Functional Requirements

- **FR-001**: System MUST support three output modes: `dynamic` (evaluate both formats, return the smaller), `json` (never convert, pass through), and `toon` (always convert to TOON)
- **FR-002**: In `dynamic` mode, system MUST evaluate each JSON response in both formats and deliver the more compact one, while preserving all data losslessly
- **FR-003**: In `toon` mode, system MUST convert every JSON response to TOON format
- **FR-004**: In `json` mode, system MUST NOT perform any conversion — responses pass through as plain JSON
- **FR-005**: System MUST deliver responses transparently to the agent regardless of chosen format — no agent-side changes required
- **FR-006**: System MUST fall back to original JSON if TOON conversion or comparison fails for any reason, without returning an error to the agent
- **FR-007**: Non-JSON responses (binary, plain text, streaming chunks) MUST pass through unchanged in all modes
- **FR-008**: System MUST read global TOON configuration from environment variables (`WEIR_TOON_OUTPUT_MODE`, `WEIR_TOON_AUTO_CONVERT`, `WEIR_TOON_DELIMITER`, `WEIR_TOON_INDENT`, `WEIR_TOON_FLATTEN_DEPTH`, `WEIR_TOON_THRESHOLD`) on each conversion initialization (hot-read, no restart or watcher required)
- **FR-009**: System MUST support optional per-backend `outputMode` field in `.mcp.json` that overrides the global `WEIR_TOON_OUTPUT_MODE` for that backend
- **FR-010**: TOON conversion MUST NOT alter the logical content of the response — only the wire format changes
- **FR-011**: Token savings estimates MUST be logged via pino for each converted response; no dashboard, database, or aggregated storage is required

### Key Entities

- **Output Mode**: One of three values (`dynamic`, `json`, `toon`) determining how responses are processed — set globally via env var and optionally overridden per-backend in `.mcp.json`
- **Backend Entry**: A configured MCP backend in `.mcp.json` that may include an optional `outputMode` field
- **Response Envelope**: The unit of data flowing from backend to agent, delivered in JSON or TOON depending on the effective output mode and format comparison
- **TOON Conversion Record**: Per-response metadata logged via pino: original size, TOON size, chosen format, estimated token savings, and timestamp

## Success Criteria

### Measurable Outcomes

- **SC-001**: Format optimization achieves at least 30% token reduction on average across all backends using `dynamic` or `toon` mode, measured weekly
- **SC-002**: Zero data loss or data corruption across 10,000 consecutive TOON conversions in testing
- **SC-003**: All three output modes (`dynamic`, `json`, `toon`) produce correct and lossless results for all JSON data types
- **SC-004**: Configuration changes via env var take effect on the next conversion without restart (verified by changing `WEIR_TOON_OUTPUT_MODE` and observing format change)
- **SC-005**: Per-backend `outputMode` in `.mcp.json` overrides the global env var
- **SC-006**: 100% of responses that fail TOON conversion are delivered as JSON without agent-visible errors
- **SC-007**: Non-JSON responses pass through unmodified in all output modes

## Assumptions

- TOON conversion applies only to JSON tool call responses (not requests, streaming chunks, or initialization messages)
- The agent does not need to know about TOON — the gateway handles transparent delivery
- Global configuration is read from environment variables at conversion time (hot-read); no file watcher or server restart is required for env var changes
- Per-backend `outputMode` is set via the entry's configuration in `.mcp.json`
- TOON library supports all JSON data types (string, number, boolean, null, object, array) losslessly
- Token counting uses gpt-tokenizer for accurate BPE token counts
- Dashboard, SQLite persistence, and aggregated per-backend metrics are out of scope for this feature
