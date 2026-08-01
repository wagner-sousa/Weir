# SDD Lifecycle Manager

Phase-gate lifecycle for Spec Kit. Lock spec artifacts after finalization.
Block destructive commands. Allow only controlled paths (refine/bugfix).

Per-spec architecture: each feature's lifecycle state lives inside its own
directory at `specs/NNN-feature/.lifecycle.json`.

## Commands

| Command | Description |
|---------|-------------|
| `/speckit.lifecycle.check` | Guard hook — blocks execution when spec is locked |
| `/speckit.lifecycle.lock` | Lock the active spec — freeze spec artifacts |
| `/speckit.lifecycle.unlock` | Unlock a spec (current or with `--spec-dir`) |
| `/speckit.lifecycle.status` | Show current phase and command availability |
| `/speckit.lifecycle.write-agents` | Sync lock status to agent context file (AGENTS.md) |

## State File

Per spec: `specs/NNN-feature/.lifecycle.json`

```json
{ "phase": "locked", "locked_at": "2026-07-23T14:00:00", "locked_by": "user" }
```

Discovered via `.specify/feature.json` → `feature_directory`.

## Cross-plugin Interface

`unlock --spec-dir <path>`

Qualquer plugin pode desbloquear uma spec específica:

```
/speckit.lifecycle.unlock --spec-dir specs/013-fix-auth
```

Usado por `switch.set` para auto-unlock da spec anterior no checkout.

## Agent Context Sync

When locked, lifecycle rules are automatically written to AGENTS.md
(via `after_lifecycle_lock` hook → `write-agents` command). When unlocked,
the block is removed (`after_lifecycle_unlock` hook). Uses unique markers:

```
<!-- LIFECYCLE START --> ... <!-- LIFECYCLE END -->
```

Independente da extensão `agent-context`.

## Configuration

`lifecycle-config.yml` customiza:

| Campo | Descrição | Default |
|-------|-----------|---------|
| `blocked_commands` | Comandos bloqueados quando locked | specify, clarify, plan, tasks, checklist, analyze, sync.apply, sync.backfill |
| `allowed_commands` | Comandos liberados quando locked | refine.*, bugfix.*, converge, review.*, verify.*, etc. |
| `auto_lock_triggers` | Eventos que sugerem lock automático | after_converge (desligado), after_implement (desligado) |

## Hooks

| Hook | Comando | Disparo |
|------|---------|---------|
| `before_specify` | `lifecycle.check` | Mandatory (bloqueia se locked) |
| `before_clarify` | `lifecycle.check` | Mandatory |
| `before_plan` | `lifecycle.check` | Mandatory |
| `before_tasks` | `lifecycle.check` | Mandatory |
| `before_checklist` | `lifecycle.check` | Mandatory |
| `before_analyze` | `lifecycle.check` | Mandatory |
| `before_sync_apply` | `lifecycle.check` | Mandatory |
| `before_sync_backfill` | `lifecycle.check` | Mandatory |
| `after_lifecycle_lock` | `lifecycle.write-agents` | Sync lock to AGENTS.md |
| `after_lifecycle_unlock` | `lifecycle.write-agents` | Remove lock from AGENTS.md |
| `after_converge` | `lifecycle.status` | Optional — suggest locking |

## Behavior

| Commands | active | locked |
|----------|:------:|:------:|
| specify, clarify, plan, tasks, checklist, analyze | ✅ | ⛔ |
| refine.*, bugfix.* | ✅ | ✅ |
| converge, review.*, verify.* | ✅ | ✅ |
| sync.apply, sync.backfill | ✅ | ⛔ |
| sync.analyze, sync.propose, sync.conflicts | ✅ | ✅ |
| lifecycle.* | ✅ | ✅ |
