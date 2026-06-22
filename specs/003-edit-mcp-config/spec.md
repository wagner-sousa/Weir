# Feature Specification: Edit MCP Config

**Feature Branch**: `003-edit-mcp-config`

**Created**: 2026-06-22

**Status**: Draft

**Input**: User description: "Preciso editar as configurações de mcp's"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Edit MCP via Modal (Priority: P1)

The user views an existing MCP card on the dashboard and clicks an "Edit" button (or the card itself) to open an edit modal. The modal mirrors the "Add MCP" form but is pre-populated with the current values of that MCP (name, transport type, command/args/url, env vars). The user modifies fields, optionally tests the connection, and saves. On save, the entry in .mcp.json is updated, a success toast appears, and the card reflects the changes.

**Why this priority**: Without editing, users must manually edit .mcp.json to change any MCP configuration — this is the core pain point being addressed.

**Independent Test**: Can be tested by opening the edit modal for an existing MCP, changing a field, saving, and verifying the card and .mcp.json reflect the changes.

**Acceptance Scenarios**:

1. **Given** an MCP card is displayed, **When** the user clicks the Edit control on the card, **Then** an edit modal opens pre-populated with that MCP's current configuration (name, transport type, type-specific fields, env vars if stdio).
2. **Given** the edit modal is open with pre-populated fields, **When** the user modifies a field and clicks "Save", **Then** the MCP entry is updated in .mcp.json, a success toast appears, and the card reflects the new values (name, transport type, tool count, etc.).
3. **Given** the edit modal is open, **When** the user changes the transport type (e.g., stdio → http), **Then** type-specific fields from the previous transport are discarded and the new transport's fields appear (url for http/sse, command/args/env for stdio), with common fields (name, description) preserved.
4. **Given** the edit modal is open with an existing name, **When** the user changes the name to one already in use, **Then** inline validation error appears below the name field and Save is blocked.
5. **Given** the edit modal is open with unsaved changes, **When** the user clicks Cancel or presses Esc, **Then** a confirmation dialog appears: "Unsaved changes will be lost. Continue?"
6. **Given** the edit modal is open, **When** the user clicks "Test Connection" with modified fields, **Then** a connection test is performed using the new values and the result (success/failure with reason) is displayed inline.
7. **Given** the edit modal is open and a connection test is in progress, **When** the user attempts to close the browser tab, **Then** a `beforeunload` warning is shown.

---

### User Story 2 - Cancel Edit Reverts No Changes (Priority: P2)

The user opens the edit modal, makes changes, then cancels. The .mcp.json file is unchanged and the card reverts to its previous display state.

**Why this priority**: Data integrity — users must be confident that cancelling an edit never causes unintended modifications.

**Independent Test**: Can be tested by opening edit, changing fields, clicking Cancel, and verifying .mcp.json content and card display are unchanged.

**Acceptance Scenarios**:

1. **Given** the edit modal is open with modified fields, **When** the user clicks Cancel and confirms the discard dialog, **Then** the modal closes, .mcp.json is unchanged, and the card displays the original values.
2. **Given** the edit modal is open with modified fields, **When** the user presses Esc twice (first Esc shows discard confirmation, second Esc closes the confirmation), **Then** the modal remains open.

---

### User Story 3 - Edit Modal Loading States (Priority: P2)

The edit modal shows appropriate loading states while fetching MCP details or saving changes.

**Why this priority**: Users need clear feedback during operations to understand the system state.

**Independent Test**: Can be tested by observing the modal during save or test operations — buttons must be disabled and show spinners.

**Acceptance Scenarios**:

1. **Given** the edit modal is open, **When** the user clicks "Save", **Then** the Save button shows a spinner and is disabled; "Test Connection" is also disabled during save.
2. **Given** the edit modal is open, **When** the user clicks "Test Connection", **Then** the Test Connection button shows a spinner and is disabled; "Save" is also disabled during the test.

---

### Edge Cases

- What happens when the MCP was deleted externally (e.g., by another process) between opening the edit modal and saving? → Toast error "MCP not found. It may have been removed." and the modal closes. The grid refreshes to reflect the current state.
- How does the modal behave when editing an MCP that is currently connected? → Editing is allowed regardless of connection state. Changing the name or transport type may affect connection status after save — the card's status reverts to "disconnected" and must be rechecked.
- What happens when the user changes the name of an MCP? → The entry key in .mcp.json is updated. All references (cards, status maps) reflect the new name. If a connection was active under the old name, it is treated as disconnected under the new name.
- Can the user change an MCP's transport type from stdio to http and vice versa? → Yes. Type-specific fields are replaced: command/args/env are discarded when switching away from stdio; url is discarded when switching away from http/sse. A confirmation message is shown: "Changing transport type will clear type-specific fields. Continue?"
- What happens if .mcp.json has permission errors during save? → Toast error "File could not be written: permission denied." The modal stays open and changes are not saved.
- What happens if the backend is unreachable during save? → Toast error "Error saving: backend unavailable." The modal stays open and changes are not saved.
- What happens if the user clears all fields on a stdio MCP (no command)? → Validation error "Command is required" and Save is blocked.
- What happens if the user edits the URL to an invalid format (not starting with http:// or https://)? → Inline validation error "Invalid URL. Must start with http:// or https://" and Save is blocked.
- What happens when the user opens edit, changes nothing, and clicks Save (no-op edit)? → The PUT request is sent with identical data. The server updates .mcp.json with the same values (idempotent). A success toast is shown. No error.
- What happens if the user double-clicks Save or triggers rapid successive saves? → The Save button is disabled while the save is in progress (per US3), so subsequent clicks are ignored. Only one PUT request is sent.
- What characters are allowed in MCP names? → MCP names may contain letters, numbers, spaces, hyphens, and underscores. Names are case-sensitive. Leading/trailing whitespace is trimmed. Empty names are rejected. The same validation rules as the Add MCP modal apply.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Each MCP card MUST display an "Edit" control (pencil icon from lucide-react) at a consistent, accessible position. Clicking this control MUST open the edit modal. The card itself MAY also be clickable to open the edit modal.
- **FR-002**: The edit modal MUST be functionally identical to the Add MCP modal (FR-003 through FR-009 from the MCP Connection Manager spec) with the following differences:
  - All fields MUST be pre-populated with the current MCP configuration values.
  - The title MUST be "Edit MCP" (vs "Add MCP").
  - On save, the existing entry is UPDATED in .mcp.json (not appended).
  - On save, connection status for the edited MCP MUST revert to "disconnected" if the name or transport type changed.
- **FR-003**: When the user changes the transport type in the edit modal, a confirmation dialog MUST be shown: "Changing transport type will clear type-specific fields. Continue?" If confirmed, type-specific fields MUST reset to defaults (empty command/args/env for stdio, empty url for http/sse). If cancelled, the transport type MUST revert to the previous selection.
- **FR-004**: Changing the MCP name MUST update the key in .mcp.json. The system MUST validate name uniqueness against ALL existing MCPs EXCEPT the one being edited (changing to the same name is allowed; changing to another MCP's existing name is blocked).
- **FR-005**: System MUST show a success toast when an MCP is edited. Toasts MUST follow the same behavior as FR-010 from the Connection Manager spec (auto-dismiss 3s, stackable, clickable to dismiss).
- **FR-006**: System MUST show an error toast if the target MCP was deleted or changed externally between opening the edit modal and saving. The error message MUST be: "MCP not found. It may have been removed." The modal MUST close after the toast.
- **FR-007**: System MUST support the same connection test functionality during editing (Test Connection button, loading states, success/failure indicators) as defined in FR-006 through FR-008 of the Connection Manager spec.
- **FR-008**: All edit modal icons MUST use lucide-react (pencil/Pencil for edit, consistent with the existing icon library policy — Principle VI).
- **FR-009**: All edit modal user-facing text (labels, buttons, tooltips, toasts, validation messages) MUST be in English (Principle III).
- **FR-010**: System MUST show a `beforeunload` warning if a connection test is in progress during editing, identical to FR-026 from the Connection Manager spec.

### Key Entities *(include if feature involves data)*

- **MCP Connection**: Same entity as defined in the MCP Connection Manager spec. The edit operation modifies all writable attributes (name, transport type, command, args, url, env).
- **MCP Configuration (.mcp.json)**: The source-of-truth file. The edit operation updates an existing entry by key (name). If the name changes, the old key is removed and a new key is created with the new name.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can edit any field of an existing MCP via the UI in under 30 seconds (production). The edit modal loads with pre-populated values in under 2 seconds.
- **SC-002**: Changes are reflected in .mcp.json and the dashboard card within 2 seconds of clicking Save.
- **SC-003**: Error states (permission denied, MCP not found, backend unreachable, duplicate name) are handled with appropriate toast messages and the modal does not close on failure.
- **SC-004**: Users can successfully change transport type with type-specific field reset, with zero data leaks between transport configurations.
- **SC-005**: The edit modal passes the same accessibility standards as the Add MCP modal (all interactive elements have aria-labels, focus is trapped within the modal, keyboard navigation works).

## Out of Scope

- Batch editing of multiple MCPs
- Bulk import/export of configuration changes
- Version history or undo/redo for edits
- Editing MCPs from external configuration sources (only local .mcp.json is supported)
- Renaming MCPs via mechanisms other than the edit modal (manual .mcp.json editing still works)

## Assumptions

- The edit feature follows the same UX patterns already established in the Add MCP modal, reducing cognitive load for users.
- The connection manager's SSE-based status system will automatically handle cards re-rendering after edits.
- Changing MCP name will invalidate the connection status for that MCP (status resets to "disconnected").
- The env var table for stdio MCPs supports editing variable names and values inline, with the same validation regex (`[a-zA-Z_][a-zA-Z0-9_]*`).
- The `args` array field in the edit modal is pre-populated as chips/tags, same as the add modal.
- Users expect the same "dirty form" detection (unsaved changes warning) as the add modal.
