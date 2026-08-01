---
description: "Switch to a different spec — checkout matching branch"
---

# Switch: Set Active Spec

Change the active spec by checking out its matching git branch. Never writes `feature.json` directly — the checkout brings the correct version automatically.

## User Input

```text
$ARGUMENTS
```

The argument identifies the target spec:
- **Number**: `010` → match spec `010-fix-login`
- **Full name**: `010-fix-login` → direct match
- **Partial name**: `login` → search specs containing "login"

If empty, list available specs first.

## Steps

### 1. Check working tree

Run `git status --porcelain`.

If there are uncommitted changes:
```
⚠️ Working tree has uncommitted changes.
Commit or stash before switching specs to avoid conflicts.
  - git add -A && git commit -m "wip"
  - git stash
```
**Block and ask user to resolve first.**

### 2. Discover target spec

Search `specs/` directories:

1. If input is a number (e.g. `010`): match by numeric prefix `010-*`
2. If input matches a directory name exactly: use it
3. If partial name: find all specs containing the string
4. If multiple matches: list them and ask user to pick
5. If no match: output "No spec found matching 'X'. Run /speckit.switch.list to see available specs."

### 3. Find matching branch

From the spec directory name (e.g. `010-fix-login`):

1. Check local: `git branch --list "010-fix-login"` — if found, use it
2. Fall back to prefix: `git branch --list "010-*"` — if one match, use it
3. If multiple branches match prefix: list and ask
4. Check remote: `git branch -r --list "origin/010-*"`
5. If only remote: suggest `git checkout --track origin/010-fix-login`

### 4. Branch found? → git checkout

```
git checkout <branch>
```

On success:
```
✅ Switched to spec 010-fix-login
📂 Directory: specs/010-fix-login
🌿 Branch: 010-fix-login

Run /speckit.lifecycle.status to check lifecycle phase
Use /speckit.bugfix.report to log bugs found in this spec
```

On failure (e.g. checkout rejected by git):
Report the git error and stop. Do not proceed.

### 5. No branch? → --local-only fallback

If `--local-only` flag is present (or no branch found and user agrees):

1. Write `.specify/feature.json` with `{"feature_directory": "specs/010-fix-login"}`
2. Output:
   ```
   ⚠️ --local-only: feature.json updated manually.
   No git branch switch. You may be in detached state.
   Commit this change if you want it to persist:
     git add .specify/feature.json
     git commit -m "switch: change active spec to 010-fix-login"
   ```

If `--local-only` was not passed and no branch exists:
```
Branch not found for spec '010-fix-login'.
Options:
  - Use --local-only to switch directory without git
  - Fetch remote branches: git fetch
  - Create a new branch: git checkout -b 010-fix-login
```

### 6. Confirm result

- Read `.specify/feature.json` to verify it points at the intended spec
- Output confirmation

## Rules

- Never write feature.json unless --local-only is explicitly used
- Always check git status first — block on dirty working tree
- Prefer `git checkout` over manual writes
- Handle git errors gracefully (no git, no remote, detached HEAD)
