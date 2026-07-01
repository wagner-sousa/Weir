# Specification: MCP Hub/Gateway with Web Visualization

**Branch**: `main`

**Created**: 2026-06-19

**Last Updated**: 2026-06-24

**Status**: Implemented

**Input**: "Let's create an MCP hub/gateway with web visualization. Initially we'll use the same .mcp.json file pattern for Docker mode — the user should only mount the MCP config file as a volume. Cards display MCPs, 3 per row. The card title is the MCP title from the file. It must show the type (http/stdio, are there other types?). The listing updates when the file changes. The screen will only list MCPs." + "Migrate frontend to Tailwind CSS v4 with thematic design system, replace custom toast with sonner, replace native fetch with ofetch, implement badge variants and connection indicators."

## User Scenarios & Testing

### Story 1 - View MCP list in web mode (P1)

As a Weir user, I want a web interface that lists all my MCP servers configured in .mcp.json so I can quickly see which ones are available and their transport types.

**Why this priority**: This is the core feature — without the listing, the product has no value.

**Independent Test**: Start Weir in web mode, open the browser, and verify the MCP cards configured in .mcp.json are displayed correctly.

**Acceptance Scenarios**:

1. **Given** Weir is running in web mode with a valid .mcp.json containing 2 MCP servers, **When** the user accesses the home page, **Then** the system displays 2 cards organized in up to 3 columns, each with the title and transport type of the respective MCP.

2. **Given** Weir is running in web mode with a valid .mcp.json containing 5 MCP servers, **When** the user accesses the home page, **Then** the system displays 5 cards in rows of 3, resulting in 2 full rows (3 + 2).

---

### Story 2 - View MCP list in Docker mode (P1)

As a Docker user, I want to mount only my .mcp.json file as a volume in the Weir container to see my MCP servers without additional configuration.

**Why this priority**: Docker support is one of the main deployment modes, essential for adoption in existing infrastructure.

**Independent Test**: Run the Weir container with a volume pointing to a valid .mcp.json and access the web interface to confirm the listing.

**Acceptance Scenarios**:

1. **Given** the user runs `docker run -v /path/to/.mcp.json:/app/.mcp.json weir`, **When** the container starts, **Then** Weir reads the mounted file and displays the MCP list in the web interface.

2. **Given** the Weir container is started without a mounted .mcp.json file, **When** the user accesses the interface, **Then** the system displays a message informing that no configuration file was found.

---

### Story 3 - Automatic listing update (P2)

As a user, I want the MCP list to update automatically when I modify the .mcp.json file so I can see changes without restarting the server.

**Why this priority**: Significantly improves developer experience, but the MVP works without it (requires manual restart).

**Independent Test**: Modify the .mcp.json file (add/remove MCP) and verify the web interface reflects the change within 5 seconds without user interaction.

**Acceptance Scenarios**:

1. **Given** the web interface is displaying 2 MCPs, **When** the user adds a new MCP to .mcp.json and saves the file, **Then** the interface displays 3 MCPs within 5 seconds without needing to reload the page.

2. **Given** the web interface is displaying 3 MCPs, **When** the user removes an MCP from .mcp.json and saves the file, **Then** the interface displays 2 MCPs within 5 seconds.

---

### Story 4 - Visual Component Status Identification (P1)

As a Weir web interface user, I want clear visual indicators (badges and connection status) for each MCP server using a consistent color system, so I can quickly assess each server's state without reading text.

**Why this priority**: Badges and connection indicators are the most visible improvement — they establish the design system foundation that all other components use.

**Independent Test**: Load the main dashboard and verify each MCP card displays a colored badge with the correct status and a green/red connection indicator.

**Acceptance Scenarios**:

1. **Given** the MCP dashboard is loaded, **When** a server is online, **Then** its connection indicator shows green
2. **Given** the MCP dashboard is loaded, **When** a server is offline, **Then** its connection indicator shows red
3. **Given** any MCP card, **When** it displays a status badge (e.g., "online", "error", "warning", "secondary"), **Then** the badge uses the correct color variant (success green, destructive red, warning yellow, default gray, secondary tone, outline border)
4. **Given** the application renders, **When** any status badge is displayed, **Then** it uses the theme color palette defined by the design system

---

### Story 5 - Non-Intrusive Notifications (P2)

As a Weir user, I want temporary notifications (toasts) in the bottom-right corner when actions are performed or errors occur, so I am informed without interrupting my workflow.

**Why this priority**: Notifications provide critical user feedback but do not block the main flow. They can be built independently from the design system base.

**Independent Test**: Trigger a notification from any user action and verify the toast appears with the correct style, positioning, and auto-dismiss.

**Acceptance Scenarios**:

1. **Given** a user performs a successful action, **When** the system responds, **Then** a green toast appears in the bottom-right corner
2. **Given** a user action fails, **When** the system returns an error, **Then** a red toast appears with the error message
3. **Given** the user receives an informational notification, **When** the toast appears, **Then** it uses blue styling
4. **Given** any notification is displayed, **When** 3 seconds pass, **Then** the notification is automatically dismissed

---

### Story 6 - Reliable Data Loading with Proper Feedback (P3)

As a Weir user, I want the interface to load MCP server data reliably, with consistent error handling and visual feedback during loading, so I understand what is happening at each moment.

**Why this priority**: Reliable HTTP communication is fundamental for all data-dependent features, but the visible user impact is lower than visual indicators and notifications.

**Independent Test**: Load any data-dependent view and verify successful responses render content, while failed requests show appropriate error feedback.

**Acceptance Scenarios**:

1. **Given** a user navigates to any data view, **When** the data request succeeds, **Then** the content is displayed in under 2 seconds
2. **Given** a user navigates to any data view, **When** the data request fails, **Then** an appropriate error notification is displayed via the toast system
3. **Given** a user navigates to any data view, **When** the request is in progress, **Then** the interface displays a loading spinner (LoaderCircle with animation) in the theme accent color

---

### Edge Cases

- What happens when the .mcp.json file is malformed (invalid JSON)?
- How does the system behave when .mcp.json has an unexpected structure or missing fields?
- What happens when the .mcp.json file is deleted while Weir is running?
- How does the interface behave in very narrow windows (< 400px)?
- What happens if .mcp.json defines an unknown transport type (different from http and stdio)?
- How does the system handle very large .mcp.json files (dozens of MCPs)?
- What happens when a badge needs to display a status that doesn't match any defined variant?
- How does the notification system handle rapid successive toasts (e.g., 10 errors in 2 seconds)?
- What happens when the HTTP client receives a response in a non-standard format?
- How does the connection indicator behave when the server status is unknown or indeterminate?

## Clarifications

### Session 2026-06-19

- Q: Which features are explicitly OUT of scope for this version? → A: Read-only. No editing, no starting/stopping MCPs, no configuration management.

### Session 2026-06-24

- Q: What is the metric for "acceptable time" when loading data (US6)? → A: <2 seconds to display the listing after the request.
- Q: What is the loading visual feedback component? → A: LoaderCircle from lucide-react with animate-spin and theme accent color.
- Q: How to handle data loading errors? → A: Fatal error uses ErrorState component with warning icon and red title; mild error uses error-type toast with red color and inline display on the card.
- Q: How does the system handle rapid successive toasts? → A: sonner queues and stacks toasts natively — no custom queue logic needed.

## Out of Scope (v1)

The following features will NOT be implemented in this version:
- Start, stop, or restart MCP servers
- Configuration management (changing parameters, transport types)
- Authentication or multi-user
- Push notifications or connectivity alerts

## Requirements

### Functional Requirements

- **RF-001**: The system MUST read and validate a .mcp.json file in the standard MCP format.
- **RF-002**: The system MUST display a web interface with cards organized in 3 columns per row.
- **RF-003**: Each card MUST display the MCP title as defined in .mcp.json.
- **RF-004**: Each card MUST display the MCP transport type (stdio, http, or sse).
- **RF-005**: The system MUST recognize and display unknown transport types as "Unknown".
- **RF-006**: The system MUST support execution via Docker with .mcp.json mounted as a volume.
- **RF-007**: The system MUST monitor changes to the .mcp.json file and update the web interface automatically.
- **RF-008**: The system MUST display a clear message when no .mcp.json file is found.
- **RF-009**: The system MUST display a clear error message when .mcp.json is malformed.
- **RF-010**: Web mode and Docker mode MUST share the same core logic for reading and parsing .mcp.json.
- **RF-011**: The system MUST display an empty state message when .mcp.json is valid JSON but does not contain the `mcpServers` key or it is empty.
- **RF-012**: The system MUST handle .mcp.json deletion during runtime by displaying a "file not found" message, similar to the initial state without a file.
- **RF-013**: The system MUST display descriptive error messages in the terminal when unable to start the web server (e.g., port occupied, permission denied), allowing the user to diagnose and fix the problem.
- **RF-014**: The system MUST render status badges using a consistent variant color system with at least 6 semantic states: default (neutral/gray), secondary, destructive (red), success (green), warning (yellow), and outline (border).
- **RF-015**: The system MUST display a real-time connection indicator for each MCP server, using green for online, red for offline, and gray for unknown/indeterminate status.
- **RF-016**: The system MUST display toast notifications with 3 distinct visual types: success (green), error (red), and info (blue).
- **RF-017**: Toast notifications MUST appear anchored in the bottom-right corner of the viewport.
- **RF-018**: Toast notifications MUST be automatically dismissed after 3 seconds.
- **RF-019**: The system MUST use a single standard HTTP client for all data requests, with automatic error handling and consistent response parsing.
- **RF-020**: The system MUST provide visual loading feedback while data requests are in progress.
- **RF-021**: All visual components MUST adhere to a unified theme color palette defined at the application level, composed of the following tokens: background (bg), panel, border, text, muted text, accent, and accent-dark.

### Key Entities

- **MCP Server**: Represents an MCP server configured in .mcp.json. Attributes: name/title, transport type (http/stdio), command/url for connection.
- **.mcp.json File**: Source of truth containing all MCP server configuration. Follows the standard format adopted by tools like Cline.
- **Toast Notification**: Ephemeral user feedback message with type (success/error/info), text, and auto-dismiss timer.
- **Status Badge**: Visual label indicating a semantic state, rendered with variant-specific colors.
- **Connection Indicator**: Visual signal with three states (online/green, offline/red, unknown/gray) associated with each server entity.
- **HTTP Response**: Data payload received from the backend, with standardized success/error handling.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Users can see all their configured MCPs on the first screen in under 2 seconds after starting Weir.
- **SC-002**: Changes to .mcp.json reflect in the UI within 5 seconds without user action.
- **SC-003**: Docker container starts and becomes accessible in under 5 seconds with a valid .mcp.json mounted.
- **SC-004**: Users can identify the transport type of each MCP without clicking anything additional (just by looking at the card).
- **SC-005**: Interface adapts to different screen sizes, maintaining readability and functionality from 320px width.
- **SC-006**: All 6 badge variants use different Tailwind CSS v4 color families (gray, red, green, yellow, blue, purple) — no two variants share the same hue family, ensuring color-only distinguishability.
- **SC-007**: Toast notifications are automatically dismissed within 3 seconds without user intervention.
- **SC-008**: Toast notifications appear in the correct position (bottom-right corner) in all supported viewport sizes.
- **SC-009**: HTTP requests that fail display an error notification to the user within 2 seconds of the failure.
- **SC-010**: Connection indicators are updated correctly based on server state changes without needing to reload the page.

## Assumptions

- The .mcp.json format follows the standard established by tools like Cline, with the structure `{ "mcpServers": { "<name>": { ... } } }`.
- The user runs Weir in a controlled environment (local or Docker) — authentication is not needed for v1.
- "http" type refers to SSE (Server-Sent Events) over HTTP, the MCP protocol standard.
- Besides http and stdio, other transport types (such as websocket) will be treated as "unknown" and displayed as such, without preventing the listing.
- The web interface runs on the same machine/container as Weir (local access).
- Weir will be accessible via browser on the default port 3000 (http://localhost:3000), documented in the project quickstart.
- The MCP server data model already provides connection status information (online/offline) for the visual indicator.
- The current API response format is well-defined and compatible with the new HTTP client approach.
- The theme colors defined in the design system are sufficient to cover all badge variant needs.
- Browser support for modern CSS features (custom properties) is available for the target user base.
