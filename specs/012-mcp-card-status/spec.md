# Feature Specification: MCP Card Status Enhancement

**Feature Branch**: `012-mcp-card-status`

**Created**: 2026-07-01

**Status**: Draft

**Input**: User description: "Vamos ajustar os comportamento dos cards de mcps. Atualmente os ícones de status do mcp só possuem dois status (sucesso e erro), vamos adicionar o status precisando autenticação (vamos usar o mesmo ícone de autenticação e mesma cor de warning). Ao passar o mouse por cima terá um tooltip informando isso. Para o status de erro, vamos mover a informação do card para este tooltip. Para so tipos de conexão que são apresentados (http, stdio e sse), cada um deve ter uma cor diferente das usadas no sistema, e esta cor deve ser aplicada ao badge do card."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View MCP connection status with clear indicators (Priority: P1)

As a user viewing the MCP listing page, I want each MCP card to show a status icon that tells me whether the connection is healthy, needs authentication, or has an error, so I can quickly assess the state of my MCP servers without reading details.

**Why this priority**: This is the core requirement of the feature — the status indicator is the primary visual feedback for MCP health.

**Independent Test**: Can be verified by observing that each MCP card displays one of three distinct status icons (success, needs-auth, error) with appropriate colors and tooltips.

**Acceptance Scenarios**:

1. **Given** an MCP with a successful connection, **When** the listing page loads, **Then** the card shows a success status icon
2. **Given** an MCP that requires authentication, **When** the listing page loads, **Then** the card shows a needs-authentication status icon with a warning color
3. **Given** an MCP with a failed connection, **When** the listing page loads, **Then** the card shows an error status icon
4. **Given** any MCP card with any status, **When** the user hovers over the status icon, **Then** a tooltip appears describing the status

---

### User Story 2 - See error details on hover (Priority: P2)

As a user, I want to see the error details when hovering over the error status icon, so that I can understand what went wrong without cluttering the card layout.

**Why this priority**: Moving error info to the tooltip improves card layout and keeps the UI clean.

**Independent Test**: Can be verified by hovering over an error status icon and seeing the error details in the tooltip, while the card itself no longer displays that error text inline.

**Acceptance Scenarios**:

1. **Given** an MCP card in error status, **When** the user hovers over the error icon, **Then** the tooltip displays the error information
2. **Given** an MCP card in error status, **When** viewing the card without hovering, **Then** no error detail text is shown on the card body

---

### User Story 3 - Identify connection type by badge color (Priority: P2)

As a user, I want each MCP card to display a colored badge indicating the connection type (http, stdio, sse), so I can quickly distinguish between different MCP transport types.

**Why this priority**: Visual differentiation of transport types improves scanability of the MCP list.

**Independent Test**: Can be verified by checking that each MCP card badge displays a distinct color for http, stdio, and sse types.

**Acceptance Scenarios**:

1. **Given** an MCP using HTTP transport, **When** the card renders, **Then** the badge shows "HTTP" with a dedicated color
2. **Given** an MCP using stdio transport, **When** the card renders, **Then** the badge shows "STDIO" with a different dedicated color
3. **Given** an MCP using SSE transport, **When** the card renders, **Then** the badge shows "SSE" with a third dedicated color
4. **Given** any transport type badge, **When** viewed, **Then** the badge color is distinct from system UI colors

---

### Edge Cases

- What happens when an MCP transitions between error and needs-auth states while the listing is open?
- How does the system handle MCPs with unknown or undefined transport types?
- What if the error message is very long — is the tooltip truncated or scrollable?
- How are tooltips rendered on touch devices (no hover)?
- What if both the connection type badge color and a status color share the same hue — is there sufficient contrast?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display three distinct MCP status states: success, needs-authentication, and error
- **FR-002**: The needs-authentication status MUST use the same authentication icon as elsewhere in the system, rendered in a warning color
- **FR-003**: Every status icon MUST show a tooltip on hover describing the current status
- **FR-004**: For error status, the tooltip MUST contain the error details previously displayed on the card body
- **FR-005**: The card body MUST NOT display inline error detail text for error-status MCPs
- **FR-006**: Each MCP card MUST display a badge indicating the transport type (http, stdio, sse)
- **FR-007**: Each transport type badge MUST use a distinct color, different from the system's existing UI color palette
- **FR-008**: Transport type badges MUST be clearly distinguishable from status icons

### Key Entities *(include if feature involves data)*

- **MCP Status**: The health state of an MCP connection (success, needs-authentication, error)
- **Transport Type**: The protocol used for MCP communication (http, stdio, sse) — displayed as a colored badge
- **Status Tooltip**: A hover tooltip providing textual detail about the current status, including error information when applicable

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can identify MCP status (success, needs-auth, error) at a glance via colored icons — no click or hover required
- **SC-002**: Error details are accessible via hover on the error status icon, reducing card clutter while preserving information
- **SC-003**: Users can distinguish HTTP, stdio, and SSE transport types by badge color without reading the label text
- **SC-004**: Transport type badge colors do not conflict with any system UI colors used for status, buttons, or navigation
- ~~**SC-005**: Tooltips render within 300ms of hover initiation~~ _(removed — not verifiable without dedicated performance tooling)_

## Assumptions

- The existing authentication icon (e.g., from lucide-react) will be reused for the needs-authentication status
- Warning color follows the existing system warning palette (e.g., amber/yellow)
- Transport types are limited to http, stdio, and sse — no other types are in scope
- Error message content is plain text suitable for tooltip display
- Touch devices will use an alternative gesture (tap) equivalent to hover for tooltips
- The existing MCP card layout accommodates the addition of a transport type badge without redesign
