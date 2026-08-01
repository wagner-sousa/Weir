---
description: "Check lifecycle phase — blocks execution when spec is locked"
---

# Lifecycle Check

Guard command. Runs as a mandatory before_* hook for core SDD commands.
Reads `.specify/lifecycle.json` and either passes or blocks.

## Prerequisites

1. Check if `.specify/lifecycle.json` exists.
2. If it does **not** exist → **PASS**. Output:
   ```
   ✅ Lifecycle: active (no lock file)
   ```
3. If it exists → read JSON and extract `phase` field.

## Decision

### phase: "active" → PASS
```
✅ Lifecycle: active
```

### phase: "locked" → BLOCK
```
⛔ SPEC IS LOCKED
This spec was finalized on [locked_at].
Direct modification of spec/plan/tasks artifacts is blocked.

Use one of these controlled paths:
- /speckit.refine.update → update spec in-place (with audit trail)
- /speckit.bugfix.patch  → surgically patch artifacts (with traceability)

To unlock temporarily:
- /speckit.lifecycle.unlock → re-enable all commands
```

**Do NOT proceed with the parent command. Stop execution here.**

## Rules

- Read-only — never modifies any file
- If JSON is malformed or missing `phase`, treat as `active` (fail-open)
- After outputting BLOCK, do not continue the parent command execution
