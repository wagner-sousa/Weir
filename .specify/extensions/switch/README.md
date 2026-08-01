# Spec Switcher

Navigate between specs. List all specs, switch active feature with matching git checkout.

## Commands

| Command | Description |
|---------|-------------|
| `/speckit.switch.list` | List all specs with branch and active status |
| `/speckit.switch.set NNN` | Switch to spec — checkout matching branch |

## How it works

`switch.set` avoids `feature.json` conflicts by doing `git checkout` first:
the target branch already has the correct `feature.json`, so no manual write needed.

Only `--local-only` writes `feature.json` (for specs without branches).
