#!/usr/bin/env bash
# Creates a git branch for a feature, outputs JSON with BRANCH_NAME and FEATURE_NUM.
#
# Usage:
#   SPECIFY_FEATURE="001-my-feature" create-branch.sh
#   create-branch.sh "001-my-feature"
#
# Output (stdout): JSON object with BRANCH_NAME and FEATURE_NUM
# Exit codes: 0 = success, 1 = error

set -e

SCRIPT_DIR="$(CDPATH="" cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

REPO_ROOT=$(get_repo_root)

# Feature identifier: env var > first argument
FEATURE="${SPECIFY_FEATURE:-$1}"

if [ -z "$FEATURE" ]; then
    echo '[ERROR] No feature specified. Set SPECIFY_FEATURE or pass as argument.' >&2
    exit 1
fi

# Extract leading number (e.g. "001" from "001-my-feature")
FEATURE_NUM=$(echo "$FEATURE" | sed -n 's/^\([0-9]*\).*/\1/p')

# Normalize to a valid branch name: lowercase, collapse separators
BRANCH_NAME=$(echo "$FEATURE" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g; s/^-//; s/-$//')

echo "[INFO] Creating branch: $BRANCH_NAME" >&2

# Fetch latest main (best-effort; continue if remote unavailable)
if git fetch origin main 2>/dev/null; then
    BASE="origin/main"
elif git show-ref --verify --quiet refs/heads/main; then
    BASE="main"
else
    echo "[WARN] No remote or local main found; branching from current HEAD." >&2
    BASE="HEAD"
fi

if git show-ref --verify --quiet "refs/heads/$BRANCH_NAME"; then
    echo "[INFO] Branch '$BRANCH_NAME' already exists. Switching to it." >&2
    git checkout "$BRANCH_NAME"
else
    git checkout -b "$BRANCH_NAME" "$BASE"
fi

# Output JSON expected by the before_specify hook system
printf '{"BRANCH_NAME":"%s","FEATURE_NUM":"%s"}\n' "$BRANCH_NAME" "$FEATURE_NUM"
