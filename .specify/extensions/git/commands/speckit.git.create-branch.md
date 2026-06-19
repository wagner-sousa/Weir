---
description: "Create a git branch for the current feature"
---

# Create Git Branch

Creates a git branch from `main` for the current feature and outputs
`BRANCH_NAME` and `FEATURE_NUM` as JSON on stdout.

Used by the `before_specify` hook so that downstream commands
(`/speckit.plan`, `/speckit.tasks`, etc.) can reference the branch
context.

## Behavior

1. Reads the feature identifier from `SPECIFY_FEATURE` env var (or first
   CLI argument).
2. Derives a sanitized branch name (lowercase, hyphens for separators).
3. Fetches `origin/main`; creates the branch from it (falls back to
   local `main`, then `HEAD`).
4. If the branch already exists, switches to it instead.
5. Prints JSON: `{"BRANCH_NAME":"...","FEATURE_NUM":"..."}`

## Execution

- **Bash**: `.specify/scripts/bash/create-branch.sh [feature]`
