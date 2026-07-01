# Research: Fix Tools Counter

## 1. Root Cause Analysis

**Decision**: The tool count is 0 because the SSE `status` event sets `toolCount: null`, which overwrites the cached tool count in the frontend.

**Rationale**:
- After 006 refactor, `GET /api/mcps` returns `toolCount` from cache (0 for uncached MCPs).
- The SSE handler calls `testSingleMCP` which DOES query tools and stores `toolCount` in cache.
- However, the SSE handler constructs the `StatusUpdate` with `toolCount: status.toolCount` (correctly).
- The broadcast function in `broadcastStatusUpdate` uses `status.toolCount` — so it should be correct.
- Need to verify whether the issue is in the broadcast function or the SSE handler.

**Investigation needed**: Check if `broadcastStatusUpdate` and the SSE handler both include `toolCount` from the cached/test result.

## 2. SSE Status Event Format

**Decision**: SSE `status` events MUST include `toolCount` from the test result, not null.

**Rationale**:
- Frontend uses `toolCount` from `StatusEvent` to update the card badge.
- If `toolCount: null`, the frontend displays "?" instead of the actual count.
- The `StatusUpdate` type already includes `toolCount: number | null`.

**Check**: `broadcastStatusUpdate` already passes `status.toolCount` correctly. The SSE handler also reads from `testSingleMCP` result which includes `toolCount`. The fix should be straightforward.

## 3. No New Backend Endpoints

**Decision**: No new endpoints needed — fix is limited to ensuring `toolCount` is correctly propagated in existing SSE events.

**Rationale**: The tool count is already being queried and cached in `testSingleMCP`. The gap is only in propagation to the frontend.
