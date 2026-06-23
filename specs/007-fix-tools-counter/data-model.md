# Data Model: Fix Tools Counter

## Entities

No new entities. The existing data model from specs/006-mcp-listing-performance/data-model.md applies.

### Key Change

The `StatusUpdate` entity's `toolCount` field MUST be populated from the connection test result, not hardcoded to `null`.

| Entity | Field | Previous Value | Correct Value |
|--------|-------|---------------|---------------|
| `StatusUpdate` | `toolCount` | `null` (in SSE handler) | `testSingleMCP().toolCount` |
| `CachedStatus` | `toolCount` | Already correct (set by `testSingleMCP`) | No change needed |

### Root Cause Flow

```
SSE handler → testConnection (no queryTools) → StatusUpdate { toolCount: null }
                                           ↓
Frontend receives toolCount: null → display shows "?"
```

### Fixed Flow

```
SSE handler → testSingleMCP (queries tools) → StatusUpdate { toolCount: actual }
                                           ↓
Frontend receives toolCount: N → display shows correct count
```
