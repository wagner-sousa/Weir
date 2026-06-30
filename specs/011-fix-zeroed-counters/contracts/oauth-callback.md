# OAuth Callback Contract

## Endpoint: OAuth Callback (`/auth/callback`)

**Purpose**: Handle OAuth redirect, exchange code for token, query tool list, broadcast status.

### Current Behavior (Bug)

```
POST /auth/callback (code, state)
  ↓
Exchange code → accessToken
  ↓
setCachedStatus(name, { status: 'connected', toolCount: 0 })   ← HARDCODED 0
broadcast('status', { name, status: 'connected', toolCount: 0 }) ← BROADCASTS 0
  ↓
testSingleMCPAndBroadcast(name)  ← background, may fail silently
```

### Fixed Behavior

```
POST /auth/callback (code, state)
  ↓
Exchange code → accessToken
  ↓
queryTools(name, transport, accessToken)  ← Query tools IMMEDIATELY
  ↓
tools = [...result] → toolCount = tools.length
  ↓
setCachedStatus(name, { status: 'connected', toolCount })
broadcast('status', { name, status: 'connected', toolCount }) ← CORRECT COUNT
  ↓
testSingleMCPAndBroadcast(name)  ← still runs, but cache is already correct
```

### Contract Changes

| Aspect | Before | After |
|--------|--------|-------|
| toolCount after callback | 0 | Actual count from `tools/list` |
| queryTools timing | Never (before OAuth) | Immediately after token exchange |
| Fallback if queryTools fails | 0 forever | Retry within 5s, then 0 |
| testSingleMCPAndBroadcast | Sole source of truth | Redundant (cache already correct) |
