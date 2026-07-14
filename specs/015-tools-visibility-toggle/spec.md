# Feature Specification: Tools Visibility Toggle

**Feature Branch**: `015-tools-visibility-toggle`

**Created**: 2026-07-14

**Status**: Draft

**Input**: User description: "Vamos implementar a ocultação de tools disponíveis por mcp, na modal de tools o usuário pode desativar a flag"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Toggle Individual Tool Visibility (Priority: P1)

As a user managing MCP servers, I want to disable specific tools from the tools modal so that only the tools I need are exposed to clients.

When I open the tools modal for a connected MCP, I see a list of all available tools. Each tool has a visibility flag (enabled/disabled) that I can toggle. Disabled tools are visually distinct (muted or dimmed) but still visible in the modal so I can re-enable them later. When I disable a tool, it is immediately hidden from the tools list returned by the API.

**Why this priority**: This is the core feature — the ability to control tool visibility per MCP. Without this, the feature has no value.

**Independent Test**: Can be fully tested by opening the tools modal, toggling a tool off, and verifying it no longer appears in the API tools response. Delivers immediate value by allowing users to reduce tool noise.

**Acceptance Scenarios**:

1. **Given** a connected MCP with 10 tools, **When** the user opens the tools modal, **Then** all 10 tools are listed, each with a visible toggle flag.
2. **Given** the tools modal is open with all tools enabled, **When** the user toggles a tool off, **Then** the tool's visual state changes to disabled (dimmed/muted) and the toggle reflects the off state.
3. **Given** a tool has been disabled, **When** a client queries the tools list via the API, **Then** the disabled tool is not included in the response.
4. **Given** a tool has been disabled, **When** a client requests the tools list, **Then** the disabled tool is not included in the response.
5. **Given** a tool is disabled, **When** the user toggles it back on, **Then** the tool is immediately re-enabled and appears in API responses again.

---

### User Story 2 - Persist Visibility Settings (Priority: P2)

As a user, I want my tool visibility settings to persist across sessions so that I don't have to reconfigure which tools are enabled every time I restart the application.

Tool visibility settings are stored in a configuration file. When the application starts, it reads the stored settings and applies them. When the user changes a tool's visibility, the change is written to the config file immediately.

**Why this priority**: Persistence is essential for a good user experience — without it, the feature is only useful within a single session.

**Independent Test**: Can be tested by disabling a tool, restarting the application, and verifying the tool remains disabled. Delivers reliability and trust in the system.

**Acceptance Scenarios**:

1. **Given** the user has disabled tool X for MCP "my-server", **When** the application restarts, **Then** tool X remains disabled for "my-server".
2. **Given** the user enables a previously disabled tool, **When** the application restarts, **Then** the tool remains enabled.
3. **Given** no visibility config exists for an MCP, **When** the tools modal is opened, **Then** all tools default to enabled.

---

### User Story 3 - Visual Feedback and Bulk Actions (Priority: P3)

As a user, I want clear visual feedback about which tools are disabled in the tools modal, and I want the ability to enable/disable all tools at once so that I can manage tool visibility efficiently.

The tools modal shows a summary of how many tools are enabled vs. total. A "disable all" / "enable all" button allows bulk toggling. Disabled tools are clearly visually distinct from enabled ones.

**Why this priority**: Improves usability and efficiency, especially for MCPs with many tools.

**Independent Test**: Can be tested by opening the tools modal, using the bulk toggle, and verifying all tools change state. Delivers convenience for power users.

**Acceptance Scenarios**:

1. **Given** an MCP with 10 tools where 3 are disabled, **When** the user opens the tools modal, **Then** a summary shows "7/10 tools enabled" or equivalent.
2. **Given** the tools modal is open, **When** the user clicks "disable all", **Then** all tools are toggled to disabled state.
3. **Given** all tools are disabled, **When** the user clicks "enable all", **Then** all tools are toggled to enabled state.
4. **Given** a tool is disabled, **When** the user views it in the modal, **Then** it appears with reduced opacity or a muted color to indicate its disabled state.

---

### Edge Cases

- What happens when an MCP disconnects and reconnects? The visibility settings should persist and be reapplied when the MCP reconnects.
- What happens when a new tool appears on an MCP (e.g., after an MCP update)? New tools should default to enabled.
- What happens when the user disables all tools? The system should allow it — the MCP still connects but exposes no tools to clients.
- What happens when the config file is manually edited or corrupted? The system should fall back to all tools enabled and log a warning.
- What happens when two users manage the same MCP simultaneously? The last write wins (same as field projections).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow users to toggle individual tool visibility (enabled/disabled) per MCP server.
- **FR-002**: System MUST persist tool visibility settings to a configuration file that survives application restarts.
- **FR-003**: System MUST filter disabled tools from the tools list API response by default.
- **FR-004**: System MUST support a query parameter on the tools endpoint to return all tools (including disabled) for management purposes.
- **FR-005**: System MUST filter disabled tools when forwarding tool lists to proxy clients.
- **FR-006**: System MUST default all tools to enabled when no visibility configuration exists for an MCP.
- **FR-007**: System MUST default new tools (not previously seen) to enabled when they appear on an MCP.
- **FR-008**: System MUST provide a bulk "enable all" and "disable all" action per MCP.
- **FR-009**: System MUST visually distinguish disabled tools from enabled tools in the tools modal.
- **FR-010**: System MUST display a summary count of enabled vs. total tools in the tools modal header.
- **FR-011**: System MUST handle corrupted or invalid visibility configuration gracefully by falling back to all tools enabled.
- **FR-012**: System MUST broadcast a configuration change event when tool visibility is modified.

### Key Entities

- **Tool Visibility Configuration**: Per-MCP, per-tool enabled/disabled state. Stored as a map of MCP server name to a map of tool name to boolean (enabled/disabled).
- **Tool**: An individual capability exposed by an MCP server. Has a name, description, and optional input schema. Visibility is a property managed by the user, not the MCP backend.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can disable any individual tool from the tools modal in under 3 seconds (open modal → toggle → done).
- **SC-002**: Tool visibility settings persist across application restarts with 100% reliability.
- **SC-003**: Disabled tools are completely invisible to clients — zero disabled tools appear in filtered responses.
- **SC-004**: Users can identify disabled tools at a glance in the modal (visual distinction is immediately obvious).
- **SC-005**: The tools modal accurately reflects the current enabled/total count at all times.

## Assumptions

- Users have an existing MCP configured and connected before managing tool visibility.
- The existing tools modal is the correct location for this feature — no new modal is needed.
- Tool visibility is independent of field projections — a tool can be visible but have no projection, or be hidden entirely.
- The configuration file uses the same directory as other MCP configuration files.
- Only one user manages tool visibility at a time (no concurrent edit conflicts needed).
- The existing toggle/button UI pattern used elsewhere in the application is appropriate for the visibility flag.
