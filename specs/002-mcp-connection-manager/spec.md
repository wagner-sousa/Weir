# Feature Specification: MCP Connection Manager

**Feature Branch**: `002-mcp-connection-manager`

**Created**: 2026-06-22

**Status**: Draft

**Input**: User description: "A nossa aplicação irá se conectar aos MCP's do arquivo .mcp.json. Para isso, no início da tela, teremos um botão à direita para adicionar os MCP's. Ao clicar nesse botão, será exibida uma modal com os campos necessários para adicionar um novo MCP. Estes campos devem seguir apenas os que são definidos no arquivo .mcp.json. Os campos devem ser dinâmicos por tipo de mcp selecionado. Na modal, deve possuir um botão para testar a conexão. Deve ser adicionado ao card de mcp: um indicador (ícone) de conexão para sucesso e falha, em caso de falha possuir um tooltip informando o motivo (no topo à direita); Um footer por card com: botão para reconectar ao mcp, contator (badge) indicando quantas tools tem no mcp, botão de remover o mcp (remove do arquivo). Use toasts para a adição e remoção de mcps."

## Clarifications

### Session 2026-06-22

- Q: What UX should duplicate MCP names trigger (FR-020 "gracefully")? → A: Inline validation as user types (error below name field, Save blocked); toast error if save attempted anyway; modal stays open.
- Q: What loading states should the modal show during operations? → A: Both "Save" and "Test Connection" MUST be disabled while either operation is in progress; the active button MUST show a spinner.
- Q: What is the toast behavior (duration, dismissal, stacking)? → A: Auto-dismiss after 3 seconds, stackable vertically, clickable to dismiss early.
- Q: What is the connection test timeout? → A: 5s default timeout, parameterizable via environment variable.
- Q: What is explicitly out of scope? → A: Manual .mcp.json editing still works; no authentication; no connection history; no automatic reconnect scheduling.
- Q: How should HTTP/SSE connection tests handle `localhost` URLs when the backend runs inside Docker? → A: Backend replaces `localhost`/`127.0.0.1` → `host.docker.internal` during HTTP/SSE test requests (runtime only, original URL in `.mcp.json` unchanged). Requires `extra_hosts: ["host.docker.internal:host-gateway"]` in docker-compose services. Users can use Docker service names for cross-container MCPs.
- Q: Should stdio MCPs support environment variables (env) in the add modal? → A: Yes. When stdio is selected, show an "env" section below "args" with a table (variable name + value), a button to add new rows, and inline editing for each row. Env vars are passed to the spawned process during connection tests and runtime. This field is optional and only shown for stdio transport.
- Q: How should the modal be closed? → A: All methods (Esc key, click outside, Cancel button, X close button) MUST close the modal. If there are unsaved changes, a confirmation dialog MUST be shown: "Alterações não salvas serão perdidas. Continuar?"
- Q: How should the `args` array field UI work? → A: An input text field + an "Add" button. Each submitted value becomes a removable chip/tag. Users can add multiple items, each displayed as a chip with an X to remove.
- Q: How is connection status updated in real time? → A: The backend pushes status changes via SSE (Server-Sent Events). The frontend subscribes to `GET /api/mcp/events` and updates card icons reactively. No polling.
- Q: What happens when .mcp.json is empty, malformed, or unreadable on page load? → A: Empty (`{}`) → show empty grid, no toast. Malformed (invalid JSON) → show toast with error + display raw JSON with error highlighted. Permission denied → show toast "Arquivo não pôde ser lido" + empty grid.
- Q: What is the "connecting" state timeout? → A: Same as connection test timeout (5s by default). After 5s without response, the state transitions from "connecting" to "error".
- Q: What URL formats are valid for http/sse? → A: Must start with `http://` or `https://`. A non-empty host and optional path are required.
- Q: Should the browser warn if the user refreshes during an active connection test? → A: Yes. Use `beforeunload` to show "Teste de conexão em andamento. Sair mesmo assim?"
- Q: Can a connected MCP become disconnected without user action? → A: Yes. If the backend detects a lost connection (e.g., SSE disconnect, process exit), the state transitions from "connected" to "disconnected".
- Q: What message should be shown when `host.docker.internal` is unreachable? → A: A specific error message: "Host Docker não disponível. Verifique se o serviço está acessível."
- Q: What does the success indicator in FR-007 look like? → A: A green check icon next to the Test Connection button, without accompanying text.
- Q: What is the order of elements in the card footer? → A: Left to right: badge (tool count), Reconnect button, Remove button.
- Q: What validation rules apply to env variable names? → A: Must match regex `[a-zA-Z_][a-zA-Z0-9_]*`. Empty names are rejected. Values can be any string (including empty).
- Q: Should connection test failures from the card footer (Reconnect) show an error toast? → A: Yes. Same behavior as success toasts (3s, stackable, clickable) but with error styling.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Add a New MCP via Modal (Priority: P1)

The user opens the Weir dashboard and sees an "Add MCP" button at the top right. Clicking it opens a modal with dynamic form fields matching the .mcp.json schema. The user selects the transport type (stdio, http, sse), fills in the required fields (command+args for stdio, url for http/sse), and optionally tests the connection before saving. On save, the MCP is written to .mcp.json, a toast confirms success, and the card appears in the grid.

**Why this priority**: Adding MCPs is the primary entry point for managing connections — without it, users cannot configure new servers.

**Independent Test**: Can be tested by clicking "Add MCP", filling the form, saving, and verifying the card appears and .mcp.json contains the new entry.

**Acceptance Scenarios**:

1. **Given** the dashboard is loaded with valid .mcp.json, **When** the user clicks "Add MCP", **Then** a modal opens with transport type selector and dynamic fields (command/args for stdio, url for http/sse).
2. **Given** the modal is open with stdio selected, **When** the user fills "command" and "args" and clicks "Save", **Then** the MCP is added to .mcp.json, a success toast appears, and the card appears in the grid.
3. **Given** the modal is open with http selected, **When** the user fills a valid "url" and clicks "Save", **Then** the MCP is added to .mcp.json, a success toast appears, and the card appears in the grid.
4. **Given** the modal is open, **When** the user tries to save with required fields empty, **Then** validation errors are shown and the MCP is not saved.
5. **Given** the modal is open, **When** the user clicks "Test Connection" with valid fields, **Then** a loading indicator is shown followed by a success or failure result.
6. **Given** the modal is open with a stdio transport, **When** the user types an invalid command path and clicks "Test Connection", **Then** a failure result is shown.
7. **Given** the modal is open with stdio selected, **When** the user adds env variables (name+value) via the env table, fills command, and clicks "Save", **Then** the env variables are persisted in `.mcp.json` and passed during connection tests.
8. **Given** the modal is open, **When** the user switches transport type mid-form (e.g., stdio → http), **Then** fields common to both types persist while type-specific fields reset.
9. **Given** the modal is open with unsaved changes, **When** the user clicks Cancel or presses Esc, **Then** a confirmation dialog "Alterações não salvas serão perdidas. Continuar?" is shown.

---

### User Story 2 - View Connection Status and Reconnect (Priority: P1)

Each MCP card displays a connection status icon at the top right. Green indicates connected, red indicates disconnected/failed. If failed, hovering the icon shows a tooltip with the error reason. A "Reconnect" button in the card footer allows the user to attempt reconnection.

**Why this priority**: Connection visibility is essential for users to know which MCPs are working — without it, the dashboard provides no operational value.

**Independent Test**: Can be tested by verifying the icon color matches actual connection state and the tooltip displays error messages on failure.

**Acceptance Scenarios**:

1. **Given** an MCP card is displayed for a successfully connected server, **When** the user views the card, **Then** a green checkmark icon is shown at the top right.
2. **Given** an MCP card is displayed for a failed connection, **When** the user hovers the red icon at the top right, **Then** a tooltip displays the error reason.
3. **Given** an MCP card with a failed connection, **When** the user clicks "Reconnect" in the footer, **Then** a connection attempt is made and the status icon updates accordingly (green on success, red on failure with updated tooltip).
4. **Given** an MCP card is in "connecting" state, **When** the user views the card, **Then** an amber/yellow spinner icon is shown at the top right.
5. **Given** an MCP card has not been checked yet ("disconnected"), **When** the user views the card, **Then** a muted/gray icon is shown at the top right.
6. **Given** a connected MCP loses connection unexpectedly, **When** the backend detects the loss, **Then** the status transitions to "disconnected" and the icon updates to muted/gray.

---

### User Story 3 - View Tool Count and Remove MCP (Priority: P2)

Each MCP card footer shows a badge with the number of tools exposed by that server. A "Remove" button in the footer deletes the MCP entry from .mcp.json, removes the card from the grid, and shows a confirmation toast.

**Why this priority**: Tool visibility helps users assess server capabilities; removal is necessary for maintenance but less frequent than addition.

**Independent Test**: Can be tested by verifying badge count matches the MCP's tool list and that removal updates both the file and the grid.

**Acceptance Scenarios**:

1. **Given** an MCP card for a connected server, **When** the user views the card footer, **Then** a badge displays the number of tools (e.g., "12 tools").
2. **Given** an MCP card, **When** the user clicks "Remove" in the footer, **Then** the entry is deleted from .mcp.json, the card is removed from the grid, and a toast confirms the removal.
3. **Given** the .mcp.json file becomes invalid after a removal (e.g., last server removed), **When** the grid re-renders, **Then** the empty state is shown (centered message: "Nenhum MCP configurado. Clique em 'Adicionar MCP' para começar.").
4. **Given** an MCP card, **When** the user clicks "Remove" and the .mcp.json file has permission errors, **Then** a toast error "Erro ao remover: permissão negada" is shown and the card remains.
5. **Given** an MCP card, **When** the user clicks "Remove" and the backend is unreachable, **Then** a toast error "Erro ao remover: backend indisponível" is shown and the card remains.

---

### Edge Cases

- What happens when .mcp.json is read-only or has permission errors during add/remove? → Toast error "Arquivo não pôde ser lido/escrito". Add/remove operation is aborted. The grid remains unchanged.
- How does the system handle a connection test timeout (default 5s, configurable via MCP_CONNECTION_TIMEOUT env var)? → Connecting state transitions to error. Toast "Tempo limite de conexão excedido" is shown. User can retry.
- What happens when the user adds an MCP with the same name as an existing one? → Inline validation error below the name field as user types. Save is blocked. If save attempted anyway, toast error "MCP já existe" and modal stays open.
- How does the modal behave when content exceeds viewport height? → The modal backdrop enables page scrolling (`overflow-y-auto`). The modal is top-aligned with vertical padding (`py-8`). The dark overlay scrolls with the content.
- How does the modal behave when there are network errors during "Test Connection"? → Error shown inline in modal with the specific error message. The Test Connection button re-enables for retry.
- What happens if the backend is unreachable during add/remove operations? → Toast error "Erro ao salvar/remover: backend indisponível". The operation is aborted. Grid state is unchanged.
- How are stdio servers tested for connection (they may not have a network endpoint)? → Backend verifies the command exists in PATH (or is an absolute path) and is executable. If the process spawns but crashes immediately (non-zero exit), it is treated as a connection error with the exit message.
- What happens when .mcp.json is empty, malformed, or deleted externally? → Empty (`{}`): grid renders empty, no toast. Malformed (invalid JSON): toast with error + raw JSON displayed. Deleted externally: toast "Arquivo de configuração não encontrado" + grid clears.
- What happens if `host.docker.internal` is unreachable during an HTTP/SSE test from Docker? → Specific error message: "Host Docker não disponível. Verifique se o serviço está acessível."

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display an "Add MCP" button positioned at the top right of the main view.
- **FR-002**: Clicking "Add MCP" MUST open a modal dialog. The modal MUST be closeable via Esc key, click outside, Cancel button, and X close button. If there are unsaved changes, a confirmation dialog MUST be shown before closing. If the modal content exceeds the viewport height, the page MUST scroll to reveal the full content.
- **FR-003**: The modal MUST present a transport type selector (stdio, http, sse) that dynamically changes the visible form fields. Switching transport type mid-form MUST persist fields common to both types and reset type-specific fields.
- **FR-004**: For stdio transport, the modal MUST show fields: "command" (required, text), "args" (optional, array of strings as input + "Add" button → removable chips), "env" (optional, table of key-value pairs). The env table MUST display existing variables with editable name and value columns, and a button to add new rows with two fields (variable name + value). Env variable names MUST match regex `[a-zA-Z_][a-zA-Z0-9_]*`.
- **FR-005**: For http/sse transport, the modal MUST show a "url" field (required, valid URL starting with `http://` or `https://`, must include non-empty host and optional path).
- **FR-006**: The modal MUST have a "Test Connection" button that attempts to connect to the MCP and displays the result (success/failure). The connection test MUST timeout after 5 seconds by default. While testing, the button MUST show a spinner and MUST be disabled; "Save" MUST also be disabled during the test. Network errors during the test MUST be displayed inline with the error reason.
- **FR-007**: On successful test, the modal MUST show a success indicator (green check icon next to the Test Connection button).
- **FR-008**: On failed test, the modal MUST show the error reason.
- **FR-009**: The modal MUST have a "Save" button that writes the new MCP to .mcp.json. While saving, the button MUST show a spinner and MUST be disabled; "Test Connection" MUST also be disabled during save.
- **FR-010**: System MUST show a success toast when an MCP is added. Toasts MUST auto-dismiss after 3 seconds, stack vertically if multiple, and be clickable to dismiss early.
- **FR-011**: Each MCP card MUST display a connection status icon at the top right corner. Status updates MUST be pushed from the backend via SSE and reflected reactively in the UI.
- **FR-012**: A green icon indicates a successful connection; a red icon indicates a failed connection; a muted/gray icon indicates disconnected state. All states MUST include appropriate `aria-label` attributes for screen readers (e.g., "Conectado ao MCP {name}", "Falha na conexão com {name}: {reason}", "Conectando ao {name}", "Desconectado do {name}").
- **FR-013**: Hovering a red (failed) connection icon MUST show a tooltip with the error reason.
- **FR-022**: During connection test or reconnect, the status icon MUST show a loading spinner (amber/yellow) while in "connecting" state. The "connecting" state MUST timeout after the same duration as the connection test timeout (FR-021).
- **FR-023**: If an MCP has not been checked yet ("disconnected" state), the status icon MUST be muted/gray. If a connected MCP loses connection unexpectedly, the state MUST transition to "disconnected".
- **FR-024**: System MUST handle file permission errors when reading/writing .mcp.json. On permission error during add or remove, a toast error MUST be shown ("Arquivo não pôde ser lido/escrito") and the operation MUST be aborted.
- **FR-025**: System MUST handle backend unreachable errors during add/remove operations. A toast error MUST be shown with the specific message and the operation MUST be aborted.
- **FR-026**: System MUST warn the user via `beforeunload` event if a connection test is in progress and the user attempts to close or refresh the page.
- **FR-014**: Each MCP card footer MUST contain a "Reconnect" button that retries the connection. The footer order MUST be: tool count badge (left), Reconnect (center), Remove (right). On reconnect failure, the system MUST show an error toast (3s, stackable, clickable). While reconnecting, the Reconnect button MUST show a spinner and be disabled.
- **FR-015**: Each MCP card footer MUST contain a badge showing the number of tools exposed by the MCP. If the MCP is in "disconnected" state, the badge MUST display "?".
- **FR-016**: Each MCP card footer MUST contain a "Remove" button that deletes the MCP entry from .mcp.json.
- **FR-017**: System MUST show a success toast when an MCP is removed. Toasts MUST follow the same behavior as FR-010 (auto-dismiss 3s, stackable, clickable to dismiss).
- **FR-018**: System MUST support connection testing for stdio transports (verifying the command exists/is executable).
- **FR-019**: System MUST support connection testing for http/sse transports (making a connectivity request).
- **FR-020**: System MUST validate MCP name uniqueness inline as the user types (show error below the name field). If the user attempts to save with a duplicate name, the Save MUST be blocked and a toast error MUST be shown; the modal MUST remain open.
- **FR-021**: The connection test timeout MUST be configurable via the `MCP_CONNECTION_TIMEOUT` environment variable.

### Key Entities *(include if feature involves data)*

- **MCP Connection**: Represents a configured MCP server. Key attributes: name, transport type, command+args (stdio) or url (http/sse), connection status, tool count.
- **MCP Configuration (.mcp.json)**: The file storing all MCP server definitions. Supports flat and nested formats.
- **Connection Status**: Runtime state of an MCP connection (connected, disconnected, connecting, error). Not persisted — determined at runtime.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can add a new MCP via the modal in under 30 seconds in production (under 5 seconds in CI with automated test). The timeout MUST be parameterizable via `MCP_ADD_TIMEOUT` environment variable.
- **SC-002**: Connection status indicators update within 5 seconds of a connection state change.
- **SC-003**: The add-MCP modal displays correct dynamic fields based on the selected transport type with zero errors.
- **SC-004**: Toast notifications appear within 1 second of add/remove operations completing.
- **SC-005**: Removal of an MCP is reflected in the .mcp.json file and the dashboard grid within 2 seconds.
- **SC-006**: Connection test returns a result (success or failure with reason) within 10 seconds for all transport types.

## Out of Scope

The following are explicitly NOT in scope for this feature:

- Authentication or user management (single-user dashboard)
- Connection history or log of past connections
- Automatic reconnect scheduling or retry policies beyond manual "Reconnect" click
- Editing existing MCP entries via UI (manual .mcp.json editing still works)
- Batch import/export of MCP configurations
- Monitoring or alerting for connection failures

## Assumptions

- Users will have at least one MCP server they can configure (the grid may start empty).
- The .mcp.json file is writable — permission errors are handled and reported via toast.
- stdio connection tests will check that the command is available in the system PATH or is an absolute path to an executable.
- http/sse connection tests will perform a basic connectivity check (e.g., HTTP GET to the endpoint).
- The tool count badge requires backend support to query the MCP's advertised tools.
- Modal form validation follows the same rules as the .mcp.json schema.
- Connection state is ephemeral and re-evaluated on page reload.
- The connection test timeout is configurable via `MCP_CONNECTION_TIMEOUT` env var (default 5s).
- Docker's `host-gateway` feature (Docker 20.10+) is required for HTTP/SSE tests from containers to host-localhost MCPs.
- The `.mcp.json` flat/nested normalization uses `z.preprocess()` — this approach must be validated with the implementation team before coding begins.
