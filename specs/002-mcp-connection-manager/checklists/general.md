# General Requirements Quality: MCP Connection Manager

**Purpose**: Validate specification completeness, clarity, consistency, and coverage across all feature dimensions
**Created**: 2026-06-22
**Type**: General (full-spectrum)
**Feature**: [spec.md](../spec.md)

## Requirement Completeness

- [x] CHK001 - Are requirements defined for all connection state transitions (connecting → connected, connecting → error, error → connecting)? [Decidido: disconnected→connecting, connecting→connected, connecting→error, error→connecting, connected→disconnected]
- [x] CHK002 - Are requirements specified for the modal's dismissal behavior (close button, click-outside, Escape key)? [Decidido: todos os métodos + confirmação se alterações não salvas]
- [x] CHK003 - Are requirements defined for the empty grid state when no MCPs exist? [US3 Scenario 3: "empty state is shown" + descrever visualmente]
- [x] CHK004 - Are error toast requirements specified for connection test failures outside the modal (e.g., from the MCP card footer)? [Decidido: sim, toast de erro (mesmo comportamento: 3s, stackable, clickable)]
- [x] CHK005 - Are requirements defined for file permission error handling when writing to .mcp.json? [Resolvido: toast específico 'Arquivo não pôde ser lido']
- [x] CHK006 - Are requirements defined for the "Add variable" button behavior in the env section (position, label, disabled state)? [Decidido: FR-004 "button to add new rows with two fields"]
- [x] CHK007 - Are requirements specified for what happens when a connection test is initiated while a previous test is still running (beyond button disabling)? [Decidido: FR-006 button disabled during test, previne concorrência]

## Requirement Clarity

- [x] CHK008 - Is the tool count badge position within the card footer explicitly specified (left, right, center)? [Decidido: esquerda]
- [x] CHK009 - Is the "Reconnect" button position relative to other footer elements (badge, Remove) specified? [Decidido: [Badge] [Reconnect] [Remove]]
- [x] CHK010 - Is "valid URL" quantified with specific format rules (protocol, path, query params)? [Decidido: http/https + path opcional]
- [x] CHK011 - Is the "connecting" state duration or timeout specified for the amber/yellow spinner? [Decidido: mesmo timeout do connection test (5s)]
- [x] CHK012 - Is the visual distinction between "disconnected" (initial gray) and "error" (red) states clearly differentiable in requirements? [FR-012 red icon + tooltip, FR-023 muted/gray — claramente distintos]
- [x] CHK013 - Is the "success indicator" in FR-007 defined with specific visual properties (icon, color, duration)? [Decidido: apenas ícone verde de check, sem texto]
- [x] CHK014 - Is the env variable name validation (non-empty string) explicitly documented in the spec's functional requirements? [Decidido: regex [a-zA-Z_][a-zA-Z0-9_]*]

## Requirement Consistency

- [x] CHK015 - Do toast behavior requirements (FR-010 and FR-017) use identical and consistent language for auto-dismiss, stacking, and click-to-dismiss? [FR-010 e FR-017 usam exatamente a mesma redação: "3s, stackable, clickable"]
- [x] CHK016 - Is the tooltip behavior (FR-013) consistent between connection errors on card icon and error messages in the modal? [FR-013: hover card icon; FR-008: inline no modal — contextos diferentes, consistentes]
- [x] CHK017 - Do the name `env` in the data model, `env` in the API contracts, and `env` in the modal spec use the same field name and type? [Consistente: todos usam `env` como Record<string, string>]
- [x] CHK018 - Is the "flat format alias" behavior for `env` field consistent with how `command`/`args`/`url` are promoted in flat mode? [data-model.md L19-21 documenta promoção de todos os campos, incluindo env]

## Acceptance Criteria Quality

- [x] CHK019 - Are all 6 SC metrics (SC-001 to SC-006) objectively measurable with specific time/error thresholds? [SC-001: testável/parametrizável (decidido); SC-002: 5s; SC-003: zero erros; SC-004: 1s; SC-005: 2s; SC-006: 10s — todos com thresholds]
- [x] CHK020 - Can the empty state acceptance scenario (US3 Scenario 3) be verified independently of other stories? [OK + descrever empty state visualmente na spec]
- [x] CHK021 - Are acceptance criteria for env variable section behavior (add row, edit name, edit value, delete row) specified in a user story? [Decidido: adicionar cenário na US1]
- [x] CHK022 - Are acceptance criteria for the "connecting" and "disconnected" visual states (FR-022/FR-023) defined in any user story scenario? [Decidido: adicionar cenários na US2]
- [x] CHK023 - Is "test connection with env vars" explicitly covered in an acceptance scenario? [Decidido: adicionar na US1]

## Scenario Coverage

- [x] CHK024 - Are requirements defined for the primary flow (add MCP via modal with valid data)? [US1 Scenario 1-3]
- [x] CHK025 - Are requirements defined for the alternate flow (user switches transport type mid-form, fields update correctly)? [Resolvido: campos comuns persistem]
- [x] CHK026 - Are requirements defined for the exception flow (connection test times out)? [FR-006/FR-021]
- [x] CHK027 - Are requirements defined for the recovery flow (reconnect after connection failure)? [FR-014, US2 Scenario 3]
- [x] CHK028 - Are requirements defined for the scenario where env var keys contain invalid characters or are empty? [Resolvido via CHK014: regex [a-zA-Z_][a-zA-Z0-9_]*]
- [x] CHK029 - Are requirements defined for adding an MCP with both flat format and nested format? [data-model.md documenta ambos os formatos]

## Edge Case Coverage

- [x] CHK030 - Are requirements defined for concurrent save operations (user double-clicks Save rapidly)? [FR-009: Save disabled during save, previne duplicata]
- [x] CHK031 - Are requirements defined for the scenario where the MCP process spawns but immediately crashes (stdio)? [Decidido: considerar como estado 'error']
- [x] CHK032 - Are requirements defined for SSE transport connection timing (long-polling vs streaming, timeout)? [Decidido: não especificar, implementação decide]
- [x] CHK033 - Are requirements defined for when `host.docker.internal` is unreachable during HTTP/SSE tests? [Decidido: mensagem específica 'Host Docker não disponível']
- [x] CHK034 - Are requirements defined for modal behavior when browser refreshes during an active connection test? [Decidido: beforeunload alerta 'Teste em andamento. Sair mesmo assim?']

## Non-Functional Requirements

- [x] CHK035 - Are performance targets (SC-001 to SC-006) technology-agnostic and free of implementation details? [Thresholds de tempo, sem tecnologia específica]
- [x] CHK036 - Are security considerations for env var values (potential secrets like passwords/tokens) addressed in requirements? [Decidido: documentar advertência, não mascarar]
- [x] CHK037 - Are accessibility requirements defined for modal keyboard navigation (Tab, Enter, Escape)? [Resolvido: focus trap + ARIA + keyboard navigation]
- [x] CHK038 - Are accessibility requirements defined for the status icon (screen reader announcements for green/red/amber/gray)? [Decidido: aria-label descritivo por estado]
- [x] CHK039 - Are requirements defined for browser/device compatibility (if in scope)? [Decidido: não especificar]

## Dependencies & Assumptions

- [x] CHK040 - Is the dependency on `MCP_CONNECTION_TIMEOUT` env var explicitly documented in assumptions? [Decidido: adicionar na seção Assumptions]
- [x] CHK041 - Is the dependency on Docker's `host-gateway` feature (requires Docker 20.10+) documented? [Clarifications: "Requires extra_hosts"]
- [x] CHK042 - Is the assumption that `.mcp.json` uses `z.preprocess()` for flat/nested normalization validated with the implementation team? [Decidido: precisa validar com equipe de implementação]
- [x] CHK043 - Is the assumption about stdio command availability in PATH explicitly documented as a requirement for connection testing? [Assumptions: "command is available in PATH"]

## Ambiguities & Conflicts

- [x] CHK044 - Does the term "error" appear in both connection state (FR-012 red icon) and validation error (FR-020 inline) contexts, and are they clearly distinguished? [FR-012: connection error (tooltip); FR-020: validation error (inline) — contextos diferentes, claros]
- [x] CHK045 - Are the "connecting" and "disconnected" time window requirements defined (how long before "connecting" becomes "error" or stays "connecting")? [Resolvido: mesmo timeout do connection test (5s)]
- [x] CHK046 - Is the "save disabled during test" requirement (FR-006) consistent with "test disabled during save" (FR-009) — are both directions of mutual exclusion documented? [FR-006: test desabilita save; FR-009: save desabilita test — exclusão mútua completa]
