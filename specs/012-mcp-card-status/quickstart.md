# Quickstart: MCP Card Status Enhancement

## Prerequisites

- Docker + Docker Compose
- A running Weir dev environment with at least one MCP configured

## Setup

```bash
docker compose -f docker-compose.dev.yml up -d dev
```

## Validation Scenarios

### 1. Status icons display correctly

1. Navigate to the MCP listing page
2. Observe each MCP card's status icon:
   - Connected MCPs show a green checkmark (CircleCheck)
   - MCPs requiring auth show an amber shield (ShieldAlert)
   - Errored MCPs show a red X (CircleX)
3. Hover over each icon to see the tooltip with status description

### 2. Error details appear only on hover

1. Identify an MCP in error status
2. Verify the card body does NOT show inline error text
3. Hover over the error status icon
4. Verify the tooltip displays the error details

### 3. Transport badge colors

1. Locate MCPs with different transport types
2. Verify:
   - HTTP badge has a blue color scheme
   - STDIO badge has a purple color scheme
   - SSE badge has a cyan color scheme
3. Verify all transport badge colors are distinct from system UI colors (green, red, amber, gray)

## Running Tests

```bash
docker compose -f docker-compose.dev.yml exec dev sh -c "cd /app/frontend && npm test -- --run"
```

Expected: All MCPCard tests pass, including new tests for `needsAuth` status and transport badge colors.
