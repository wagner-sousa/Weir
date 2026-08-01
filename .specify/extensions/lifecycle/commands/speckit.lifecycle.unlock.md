---
description: "Unlock the spec lifecycle — re-enable all commands"
---

# Unlock Lifecycle

Re-open the spec lifecycle. After unlocking, all commands return to normal operation.
Use this when you need to make structural changes to spec artifacts after locking.

## Action

1. **Verify current state**: Read `.specify/lifecycle.json`. If not found or `phase: active`, output:
   ```
   ℹ️ Lifecycle is already active. Nothing to unlock.
   ```

2. **If locked**, confirm with user:
   ```
   Unlock spec lifecycle? This will re-enable all commands.
   Proceed? (yes/no)
   ```

3. **If confirmed**, update `.specify/lifecycle.json`:
   ```json
   {
     "phase": "active",
     "locked_at": null,
     "locked_by": null,
     "unlocked_at": "[ISO_DATE]"
   }
   ```

4. **Output confirmation**:
   ```
   🔓 Spec lifecycle unlocked.
   All commands are now available.
   
   To lock again: /speckit.lifecycle.lock
   ```

5. **Optional**: Run `/speckit.git.commit` to commit the unlock state.

## Rules

- Requires explicit user confirmation
- After unlock, consider running `/speckit.sync.analyze` to check for drift
- Consider re-locking with `/speckit.lifecycle.lock` after changes are done
