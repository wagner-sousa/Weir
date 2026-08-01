---
description: "Write lifecycle lock status into agent context file"
---

# Lifecycle: Write Agent Context

Synchronizes lifecycle status to the agent context file (AGENTS.md by default).
Runs automatically as `after_lifecycle_lock` and `after_lifecycle_unlock` hooks.

## Behavior

1. **Find context file target** (first match wins):
   a. `.specify/extensions/lifecycle/lifecycle-config.yml` → `context_file` field (optional)
   b. `.specify/init-options.json` → detect integration → map to file
      (opencode → AGENTS.md, claude → CLAUDE.md, copilot → .github/copilot-instructions.md, etc.)
   c. Fallback: `AGENTS.md`

2. **Read `.specify/feature.json`** → extract `feature_directory` and `spec_name`.

3. **Read `{feature_directory}/.lifecycle.json`** → determine phase.

4. **If phase is `locked`** → WRITE mode:
   Build block:
   ```
   <!-- LIFECYCLE START -->
   ## 🔒 Lifecycle: [spec_name] — LOCKED since [locked_at]

   **Blocked commands:** specify, clarify, plan, tasks, checklist, analyze, sync.apply, sync.backfill

   **Allowed modifications:** refine.*, bugfix.*

   To unlock: /speckit.lifecycle.unlock
   <!-- LIFECYCLE END -->
   ```

   Insert/replace between `<!-- LIFECYCLE START -->` and `<!-- LIFECYCLE END -->` in context file.
   Output:
   ```
   🔒 Lifecycle lock rules written to [context_file]
   ```

5. **If phase is `active` or `.lifecycle.json` not found** → REMOVE mode:
   Find and remove `<!-- LIFECYCLE START -->` ... `<!-- LIFECYCLE END -->` block from context file.
   Output:
   ```
   ✅ Lifecycle lock rules removed from [context_file]
   ```

## Rules

- Creates context file if it does not exist
- Uses unique markers (`<!-- LIFECYCLE START -->` / `<!-- LIFECYCLE END -->`) separate from the agent-context extension markers
- Read lifecycle-config.yml for blocked_commands and allowed_commands lists
- If context file cannot be written, log warning and continue (non-fatal)
