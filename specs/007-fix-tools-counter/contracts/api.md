# API Contracts: Fix Tools Counter

## No New Endpoints

All existing contracts from specs/006-mcp-listing-performance/contracts/api.md remain unchanged.

### Updated: SSE Event Format

The SSE `status` event now includes the actual `toolCount` instead of `null`.

**Before (broken):**
```
event: status
data: {"name":"Filesystem","status":"connected","toolCount":null,"error":null}
```

**After (fixed):**
```
event: status
data: {"name":"Filesystem","status":"connected","toolCount":5,"error":null}
```

The `toolCount` field is populated from the result of `testSingleMCP`, which calls `queryTools` after `testConnection`.
