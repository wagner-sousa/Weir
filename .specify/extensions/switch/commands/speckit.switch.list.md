---
description: "List all available specs with their branch and active status"
---

# Switch: List Specs

Scan all available specs in the project and show their current status.

## Steps

### 1. Scan specs directory

List directories under `specs/`:

- If `specs/` does not exist: output `No specs found.` and stop.
- If empty: output `No specs found. Use /speckit.specify to create one.` and stop.

### 2. Check active spec

Read `.specify/feature.json` if it exists → extract `feature_directory`.

### 3. Check branches

For each spec directory, derive its prefix (numeric or timestamp portion).

Search for matching branches:
- `git branch --list <prefix>-*` (local)
- `git branch -r --list origin/<prefix>-*` (remote)

Classify each spec:

| Status | Meaning |
|--------|---------|
| `🌿 local` | Branch exists locally |
| `🌿 remote` | Branch exists only on remote |
| `📂 dir only` | No matching branch found |

### 4. Output table

```
## Available Specs

| # | Spec | Branch | Status | Current |
|---|------|--------|--------|---------|
| 1 | 010-fix-login | 010-fix-login | 🌿 local | 👈 |
| 2 | 011-add-pagination | 011-add-pagination | 🌿 local | |
| 3 | 013-export-csv | — | 📂 dir only | |
| 4 | 015-db-refactor | 015-db-refactor | 🌿 remote | |

To switch: /speckit.switch.set <number or name>
```

If current spec is active, mark with `👈`.

### 5. (Optional) Check lifecycle phase

If `.specify/lifecycle.json` exists with `phase: locked`, append:

```
⚠️ Spec lifecycle is LOCKED. Switching specs while locked may cause drift.
```

## Rules

- Read-only — never modifies any file
- Handle git errors gracefully (not a git repo, no remote, etc.)
- Show `📂 dir only` for specs without branches — user may need `--local-only`
