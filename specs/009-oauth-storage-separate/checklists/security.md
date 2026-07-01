# Specification Quality Checklist: Security — OAuth Storage Separate

**Purpose**: Validate security requirements quality for credential storage separation
**Created**: 2026-06-24
**Feature**: [spec.md](../spec.md)

## Requirement Completeness

- [x] CHK001 - Are file permission requirements (0600) specified for .mcp-auth.json? [Completeness, Spec §FR-006]
- [x] CHK002 - Are rollback requirements defined for migration failure scenarios? [Completeness, Spec §Edge Cases]
- [x] CHK003 - Are credential exposure prevention requirements specified for all code paths that write .mcp.json? [Completeness, Spec §FR-009]
- [x] CHK004 - Are error handling requirements defined for corrupted .mcp-auth.json? [Completeness, Spec §FR-007]

## Requirement Clarity

- [x] CHK005 - Is the .mcp-auth.json file path resolution clearly specified (env var vs default)? [Clarity, Spec §Assumptions]
- [x] CHK006 - Is "file permission 0600" explicitly stated or implied? [Clarity, Spec §FR-006]
- [x] CHK007 - Are the exact conditions for migration trigger clearly defined? [Clarity, Spec §FR-004]

## Consistency

- [x] CHK008 - Do credential storage requirements align between FR-001 (separate file) and FR-009 (strip on write)? [Consistency]
- [x] CHK009 - Are .mcp-auth.json field names consistent between requirements and key entities sections? [Consistency, Spec §FR-002 vs §Key Entities]

## Scenario Coverage

- [x] CHK010 - Is the scenario covered where .mcp-auth.json has data for an MCP but the MCP entry in .mcp.json was already deleted? [Coverage, Spec §Edge Cases]
- [x] CHK011 - Is recovery from a write failure to .mcp-auth.json addressed? [Coverage, Spec §Edge Cases]
- [x] CHK012 - Is concurrent access to .mcp-auth.json addressed (multiple requests)? [Coverage, Gap — single-user dashboard, `conf` package provides atomic writes]

## Non-Functional Requirements

- [x] CHK013 - Is the performance target for migration specified? [Measurability, Spec §SC-004]
- [x] CHK014 - Is there a requirement for the .mcp-auth.json file to not be world-readable? [Completeness, Spec §Edge Cases + FR-006]
