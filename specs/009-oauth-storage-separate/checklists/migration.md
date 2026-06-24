# Specification Quality Checklist: Migration — OAuth Storage Separate

**Purpose**: Validate migration requirements quality for credential data migration
**Created**: 2026-06-24
**Feature**: [spec.md](../spec.md)

## Requirement Completeness

- [x] CHK015 - Is the migration trigger clearly defined (first access vs startup vs on write)? [Completeness, Spec §FR-004]
- [x] CHK016 - Is rollback behavior specified if migration from .mcp.json to .mcp-auth.json fails? [Completeness, Spec §Edge Cases]
- [x] CHK017 - Are orphaned entry handling requirements specified for .mcp-auth.json? [Completeness, Spec §Edge Cases]
- [x] CHK018 - Is idempotency of migration addressed (running migration multiple times)? [Completeness, Spec §Edge Cases]

## Requirement Clarity

- [x] CHK019 - Is the precedence between .mcp-auth.json and .mcp.json inline fields clearly specified? [Clarity, Spec §Acceptance Scenario 3]
- [x] CHK020 - Is the "strip on write" behavior for .mcp.json clearly defined (which fields are stripped)? [Clarity, Spec §FR-009]
- [x] CHK021 - Is the migration direction clearly irreversible (one-way)? [Clarity, Spec §Edge Cases]

## Scenario Coverage

- [x] CHK022 - Are requirements defined for migrating partial data (e.g., accessToken exists but auth is missing)? [Coverage, Spec §Edge Cases]
- [x] CHK023 - Is the scenario covered where both .mcp.json and .mcp-auth.json have data for the same MCP? [Coverage, Spec §Acceptance Scenario 3]
- [x] CHK024 - Are requirements defined for the case where .mcp-auth.json is valid JSON but has an unexpected schema? [Coverage, Gap — FR-007 covers this as "unreadable", schema mismatch treated as unreadable]

## Non-Functional Requirements

- [x] CHK025 - Is the maximum time for migration specified? [Measurability, Spec §SC-004]
- [x] CHK026 - Is there a logging requirement for migration operations? [Completeness, Spec §FR-011]
