---
description: "Lock the spec lifecycle — freeze spec/plan/tasks from further direct modification"
---

# Lock Lifecycle

Finalize the feature's specification artifacts. After locking:
- Core SDD commands (`/speckit.specify`, `/speckit.clarify`, `/speckit.plan`,
  `/speckit.tasks`, `/speckit.checklist`, `/speckit.analyze`) will be **blocked**
- `/speckit.sync.apply` and `/speckit.sync.backfill` will be **blocked**
- Controlled paths remain open:
  - `/speckit.refine.update` / `refine.propagate` / `refine.diff` / `refine.status`
  - `/speckit.bugfix.report` / `bugfix.patch` / `bugfix.verify`

## Action

1. **Confirm with user**: Ask explicitly before locking.
   ```
   Lock spec lifecycle? This will block destructive commands.
   Only refine.* and bugfix.* will be available.
   Proceed? (yes/no)
   ```

2. **If confirmed**, create/update `.specify/lifecycle.json`:
   ```json
   {
     "phase": "locked",
     "locked_at": "[ISO_DATE]",
     "locked_by": "user"
   }
   ```

3. **Output confirmation**:
   ```
   🔒 Spec lifecycle locked.
   
   Blocked:  specify, clarify, plan, tasks, checklist, analyze, sync.apply, sync.backfill
   Allowed:  refine.*, bugfix.*, converge, review.*, verify.*, sync.analyze, sync.propose, doctor, git.*
   
   Use /speckit.lifecycle.status to verify.
   To unlock: /speckit.lifecycle.unlock
   ```

4. **Optional**: Run `/speckit.git.commit` to commit the lock state.

## Rules

- Requires explicit user confirmation — never lock silently
- Write the lifecycle.json file with valid JSON
- The lock applies at the project level, not per-feature
