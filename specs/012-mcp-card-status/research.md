# Research: MCP Card Status Enhancement

## Unknowns and Resolutions

### 1. Status `needsAuth` propagation from backend to frontend

**Decision**: Add `needsAuth` as a first-class status in the frontend `statusIcons` map, mapped from the backend's `CachedStatus.status === 'needsAuth'`.

**Rationale**: The backend already emits `'needsAuth'` as a distinct status in `CachedStatus` and `StatusUpdate`. The frontend currently treats it as `'error'`. We must add a corresponding entry in `statusIcons` and ensure the WebSocket event handler in `useMCPs.ts` (or `CardGrid.tsx`) does not map `'needsAuth'` to `'error'`.

**Alternatives considered**: Continuing to map `needsAuth` to `error` with a different icon — rejected because the user explicitly wants a distinct status.

### 2. Tooltip implementation for status icons

**Decision**: Continue using native HTML `title` attribute for all status tooltips.

**Rationale**: The native `title` attribute satisfies the requirement (shows on hover, renders instantly, no dependencies). The existing codebase already uses `title` extensively. Adding a library (Radix Tooltip, Floating UI) would violate Dependency First (Principle VII) without justification.

**Alternatives considered**: Radix Tooltip — rejected (unnecessary dependency for a native HTML feature). Custom CSS tooltip — rejected (native `title` is simpler and accessible).

### 3. Distinct colors for transport badges

**Decision**: Assign these non-system colors to transport badges:
- `http`: blue-800/blue-200 (Tailwind) — distinct from green (success), red (error), amber (warning)
- `stdio`: purple-800/purple-200 — distinct from all system status colors
- `sse`: cyan-800/cyan-200 — distinct from all system status colors

**Rationale**: These colors do not overlap with existing system colors (green=success, red=error, amber=warning, gray=muted, blue=primary link). Each is visually distinct from the others.

**Alternatives considered**: Orange, pink, teal — rejected because they may overlap with future status colors. The chosen palette (blue, purple, cyan) matches a cohesive spectrum.

### 4. Error details in tooltip vs card body

**Decision**: Move `client.error` text from the error row on the card into the status icon's `title` attribute. Remove the error row from the card body for error-status MCPs.

**Rationale**: The spec requires error info to only appear on hover via tooltip. The existing card already uses `title` on the status icon, so we enhance it to always include the error message when present.

**Alternatives considered**: Keeping both — rejected (spec says "mover a informação do card para este tooltip").

### 5. Touch device tooltip behavior

**Decision**: Continue using native `title` attribute, which shows on long-press on touch devices (browser default behavior).

**Rationale**: No additional library or gesture handling needed. Native behavior is acceptable for this use case.

**Alternatives considered**: Custom touch event handling — rejected (unnecessary complexity).
