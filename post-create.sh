#!/bin/bash
set -e

echo "=== Spec Kit Dev Container Setup ==="

export PATH="$HOME/.local/bin:$PATH"

if ! command -v uv &> /dev/null; then
    echo "Installing uv..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    source ~/.bashrc
fi

if ! command -v specify &> /dev/null; then
    echo "Installing Spec Kit CLI..."
    uv tool install specify-cli --from git+https://github.com/github/spec-kit.git
fi

echo "Verifying Spec Kit installation..."
specify --version

echo ""
echo "=== Setup Complete ==="
echo ""
echo "To initialize a new project:"
echo "  specify init my-project --integration copilot"
echo ""
echo "Or initialize in current directory:"
echo "  specify init . --integration copilot"
echo ""
echo "Available slash commands after initialization:"
echo "  /speckit.constitution  - Create project principles"
echo "  /speckit.specify       - Define what to build"
echo "  /speckit.plan          - Create technical plan"
echo "  /speckit.tasks         - Generate task breakdown"
echo "  /speckit.implement     - Execute implementation"
echo ""
