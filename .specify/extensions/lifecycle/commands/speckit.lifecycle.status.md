---
description: "Show current lifecycle phase and lock metadata"
---

# Lifecycle Status

Display the current lifecycle phase, lock metadata, and which commands are affected.

## Action

1. **Read state**: Check if `.specify/lifecycle.json` exists.

2. **If not found**:
   ```
   # Lifecycle Status
   
   **Phase**: active (default)
   **Lock file**: not found
   
   All commands are available.
   ```

3. **If found**, parse and display:
   ```
   # Lifecycle Status
   
   **Phase**: [phase]
   **Locked at**: [locked_at or "—"]
   **Locked by**: [locked_by or "—"]
   **Unlocked at**: [unlocked_at or "—"]
   ```

4. **Show command matrix** based on phase:

   If `active`:
   ```
   ## Command Availability
   
   | Category | Status |
   |----------|--------|
   | specify, clarify, plan, tasks, checklist, analyze | ✅ Available |
   | refine.*, bugfix.* | ✅ Available |
   | converge, review.*, verify.* | ✅ Available |
   | sync.apply, sync.backfill | ✅ Available |
   | lifecycle.* | ✅ Available |
   ```

   If `locked`:
   ```
   ## Command Availability
   
   | Category | Status |
   |----------|--------|
   | specify, clarify, plan, tasks, checklist, analyze | ⛔ Blocked |
   | refine.*, bugfix.* | ✅ Allowed |
   | converge, review.*, verify.* | ✅ Allowed |
   | sync.apply, sync.backfill | ⛔ Blocked |
   | sync.analyze, sync.propose, sync.conflicts | ✅ Allowed |
   | lifecycle.* | ✅ Allowed |
   ```

## Rules

- Read-only — never modifies any file
- Always output both phases for comparison
- If JSON is malformed, report the parsing error and default to `active`
