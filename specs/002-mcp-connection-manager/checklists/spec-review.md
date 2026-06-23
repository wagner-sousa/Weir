# Unit Tests for Requirements: MCP Connection Manager (Full Spec Review)

**Purpose**: Validate requirement quality — completeness, clarity, consistency, measurability, coverage
**Created**: 2026-06-22
**Feature**: [spec.md](../../specs/002-mcp-connection-manager/spec.md)
**Depth**: Deep (~30 items)

## Requirement Completeness

- [x] CHK001 - Are modal close/cancel behaviors defined (click outside, Esc key, Cancel button)? [Gap — Resolvido: todos os métodos, com confirmação se houver alterações não salvas]
- [x] CHK002 - Are loading/processing states defined for the Save button (e.g., disabled while writing)? [Gap — FR-009: "spinner and MUST be disabled"]
- [x] CHK003 - Are requirements specified for the "args" field UI (array of strings input) in the modal? [Completeness — Resolvido: input + botão Add, cada item vira chip/tag removível]
- [x] CHK004 - Is the behavior of the toast type defined for add vs remove operations (success only, or also error toasts)? [Completeness, Spec §FR-010, FR-017 — both define success toast]
- [x] CHK005 - Are connection status refresh/polling requirements defined (how often is status rechecked)? [Gap — Resolvido: SSE push do backend, sem polling]
- [x] CHK006 - Are requirements defined for what happens when the .mcp.json file is empty or malformed on page load? [Completeness — Resolvido: vazio=sem toast/lista vazia; malformado=toast+raw JSON; permissão=toast específico]
- [x] CHK007 - Are requirements specified for the "Reconnect" button state (disabled during reconnect, enabled otherwise)? [Gap — Resolvido: disabled + spinner durante reconexão]

## Requirement Clarity

- [x] CHK008 - Is "top right of the main view" quantified with explicit positioning (e.g., CSS properties, margin values)? [Clarity — Vago: dev define no CSS]
- [x] CHK009 - Is the term "tooltip informing the reason" clarified with a maximum character length or truncation behavior? [Clarity — Decidido: sem limite, mostra o erro completo]
- [x] CHK010 - Is "dynamic fields" explicitly defined for each transport type (which fields appear/hide for stdio vs http vs sse)? [Clarity, Spec §FR-003/FR-004/FR-005 — each type's fields are listed]
- [x] CHK011 - Is the exact appearance of the "Add MCP" button defined (icon + text, only icon, only text)? [Clarity — Decidido: ícone + texto "Adicionar MCP"]
- [x] CHK012 - Is "gracefully" in duplicate name handling defined with specific UX (toast error vs inline validation vs modal blocking)? [Ambiguity, Spec §FR-020 — fully resolved in Clarifications]
- [x] CHK013 - Are the visual states for the connection status icon defined (icon set, sizes, colors with hex codes)? [Clarity — Decidido: usar ícone de bolinha da lib atual, dev define cores]

## Requirement Consistency

- [x] CHK014 - Do all FRs that mention "toast" consistently specify toast type, duration, and position? [Consistency, Spec §FR-010, FR-017 — both reference identical behavior (3s, stackable, clickable)]
- [x] CHK015 - Is the "top right" positioning consistent between the Add MCP button (FR-001) and the connection status icon (FR-011)? [Consistency — FR-001: top right da página; FR-011: top right de cada card MCP, consistente no contexto]
- [x] CHK016 - Do the acceptance scenarios for User Story 3 cover the same failure modes as the other stories (e.g., permission error, backend unreachable)? [Consistency — Resolvido: adicionar failure modes na US3]
- [x] CHK017 - Does the spec use "connected" vs "successful connection" consistently across all FRs (FR-012 "successful connection", FR-007 "successful test")? [Consistency — acceptable, same concept]
- [x] CHK018 - Are the tooltips mentioned in the user description consistently required in the FRs (FR-013 only mentions red icon tooltip, not other possible tooltips)? [Consistency — tooltip is specifically for error state per spec, as designed]

## Acceptance Criteria Quality

- [x] CHK019 - Can SC-001 ("under 30 seconds") be objectively measured in CI or is it a usability benchmark only? [Measurability — Decidido: testável em CI e parametrizável via env var]
- [x] CHK020 - Is SC-003 ("displays correct dynamic fields with zero errors") testable without a human observer? [Measurability, Spec §SC-003 — testable via automated UI tests]
- [x] CHK021 - Are the Success Criteria thresholds (1s, 2s, 5s, 10s) consistent with each other and technically feasible given the architecture (file I/O + network)? [Acceptance Criteria — thresholds vary by operation complexity, no conflict]
- [x] CHK022 - Does SC-004 "within 1 second" conflict with the file watcher propagation delay (existing CS-002 states <5s)? [Conflict — different metrics: toast timing vs config reload, no actual conflict]

## Scenario Coverage

- [x] CHK023 - Are requirements defined for the scenario where the user switches transport type mid-form (do fields reset or persist)? [Coverage — Resolvido: campos comuns persistem, específicos resetam]
- [x] CHK024 - Are concurrent user operations addressed (e.g., clicking Save twice rapidly)? [Coverage — FR-009 disables Save during save, preventing double-click]
- [x] CHK025 - Are "forbidden name" characters or patterns defined for MCP names (slashes, dots, spaces)? [Coverage — Resolvido: letras, números, espaços, hífen, underscore]
- [x] CHK026 - Are requirements defined for the tool count badge when the MCP is disconnected (show 0, hide, show "?" )? [Coverage — Resolvido: mostrar "?" quando disconnected]
- [x] CHK027 - Are requirements defined for the modal behavior on slow network (timeout for tool query, retry text)? [Coverage — Resolvido: apenas mensagem de erro, sem botão retry]

## Edge Case Coverage

- [x] CHK028 - Is the timeout duration for connection test explicitly specified in the FRs (mentioned only in Edge Cases as "after N seconds")? [Edge Case — FR-006: "5 seconds by default", FR-021: configurable via env var]
- [x] CHK029 - Are all 6 edge cases from the spec explicitly addressed in the FRs (some are discussed but not formalized as MUST requirements)? [Coverage — Resolvido: criar 3 novos FRs para: permissão negada, erro de rede no test, backend unreachable no add/remove]
- [x] CHK030 - Is the behavior defined for when .mcp.json is deleted externally while the app is open? [Edge Case — Resolvido: toast de erro + lista vazia]

## Non-Functional Requirements

- [x] CHK031 - Are accessibility requirements specified for the modal (keyboard navigation, focus trap, ARIA labels)? [Non-Functional — Resolvido: focus trap + ARIA + keyboard navigation]
- [x] CHK032 - Are i18n/l10n requirements defined for toast messages and modal labels (Constitution III requires pt-BR)? [Non-Functional — Constitution §III mandates pt-BR, T032 verifies it]
- [x] CHK033 - Are error boundaries defined for the frontend component (what happens if the modal crashes)? [Non-Functional — Resolvido: fallback UI com mensagem + botão reload]

## Dependencies & Assumptions

- [x] CHK034 - Is the assumption "stdio connection tests verify command exists in PATH" validated against different container environments? [Assumption — documented in Spec Assumptions]
- [x] CHK035 - Is the dependency on the MCP protocol's `tools/list` documented as a requirement (not just an implementation assumption)? [Dependency — Spec Assumptions: "tool count badge requires backend support"]
- [x] CHK036 - Is the assumption "single-user, no file locking needed" documented as a scope boundary? [Assumption — "Authentication or user management (single-user dashboard)" in Out of Scope]
