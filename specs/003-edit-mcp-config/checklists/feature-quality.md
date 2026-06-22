# Specification Quality Checklist: Edit MCP Config

**Purpose**: Deep review gate — validate requirements quality, clarity, completeness, and consistency before merge
**Created**: 2026-06-22
**Depth**: Profundo (gate de revisão)
**Feature**: [spec.md](../spec.md) | [plan.md](../plan.md) | [tasks.md](../tasks.md)

## Requirement Completeness

- [X] CHK001 Are error toast messages defined for all failure modes (permission denied, backend unreachable, MCP not found, duplicate name)? [Completeness, Spec §FR-005, FR-006]
- [X] CHK002 Are accessibility requirements (aria-labels, focus trap within modal, keyboard navigation) specified for the edit modal? [Completeness, Spec §SC-005]
- [X] CHK003 Are loading state requirements defined for all modal operations (save spinner, test connection spinner, button disable during operations)? [Completeness, Spec §US3]
- [X] CHK004 Are confirmation dialog requirements defined for transport type change? [Completeness, Spec §FR-003]
- [X] CHK005 Are confirmation dialog requirements defined for cancel with unsaved changes? [Completeness, Spec §US2]
- [X] CHK006 Are `beforeunload` protection requirements defined for active connection tests during editing? [Completeness, Spec §FR-010]
- [X] CHK007 Are requirements defined for the Edit button position, icon, and behavior on the MCP card? [Completeness, Spec §FR-001]
- [X] CHK008 Are requirements defined for how connection status resets after name or transport type change? [Completeness, Spec §FR-002]
- [X] CHK009 Are requirements defined for the edit modal title ("Edit MCP" vs "Add MCP")? [Completeness, Spec §FR-002]
- [X] CHK010 Are all PUT endpoint response codes documented (200, 404, 409, 400, 403, 503)? [Completeness, contracts/api.md]
- [X] CHK011 Are requirements defined for the behavior when the user renames an MCP to the same name? [Completeness, Spec §FR-004]
- [X] CHK012 Are requirements defined for the args array field pre-population (chips/tags) in edit mode? [Completeness, Spec §Assumptions]

## Requirement Clarity

- [X] CHK013 Is "consistent, accessible position" for the Edit control defined with specific placement on the card? [Clarity, Spec §FR-001]
- [X] CHK014 Is "functionally identical to the Add MCP modal" precise enough given the listed differences in FR-002? [Clarity, Spec §FR-002]
- [X] CHK015 Is the name uniqueness rule for edit clearly distinguished from add (i.e., excludes the MCP being edited)? [Clarity, Spec §FR-004]
- [X] CHK016 Are icon requirements specific enough (lucide-react Pencil component, not just "pencil icon")? [Clarity, Spec §FR-008]
- [X] CHK017 Is "English for user-facing text" consistently scoped across all toasts, labels, buttons, tooltips, and validation messages? [Clarity, Spec §FR-009]
- [X] CHK018 Is the transport type change confirmation message quoted verbatim in the spec? [Clarity, Spec §FR-003]
- [X] CHK019 Is "same connection test functionality" (FR-007) specific enough without requiring the reader to cross-reference the Connection Manager spec? [Clarity, Spec §FR-007]

## Requirement Consistency

- [X] CHK020 Do toast behavior requirements (FR-005) align precisely with the Connection Manager's FR-010 (auto-dismiss 3s, stackable, clickable)? [Consistency, Spec §FR-005]
- [X] CHK021 Do connection test requirements (FR-007) match the Connection Manager's FR-006 through FR-008 without drift? [Consistency, Spec §FR-007]
- [X] CHK022 Does beforeunload behavior (FR-010) match the Connection Manager's FR-026? [Consistency, Spec §FR-010]
- [X] CHK023 Do error message formats across the spec follow a consistent pattern (noun + verb past participle)? [Consistency]
- [X] CHK024 Is the "reset to disconnected" rule applied consistently for both name change and transport type change? [Consistency, Spec §FR-002]
- [X] CHK025 Are all references to the Connection Manager spec (002) using the same section numbering scheme? [Consistency]

## Acceptance Criteria Quality

- [X] CHK026 Can "under 30 seconds" (SC-001) be objectively measured in a review or test? [Measurability, Spec §SC-001]
- [X] CHK027 Can "within 2 seconds" (SC-002) be objectively measured? [Measurability, Spec §SC-002]
- [X] CHK028 Are the error state test cases in SC-003 specific enough to verify without ambiguity? [Measurability, Spec §SC-003]
- [X] CHK029 Can "zero data leaks between transport configurations" (SC-004) be objectively verified by inspection or test? [Measurability, Spec §SC-004]
- [X] CHK030 Does SC-005's reference to "same accessibility standards as Add MCP" have a defined, documented baseline to compare against? [Measurability, Spec §SC-005]

## Scenario Coverage

- [X] CHK031 Are requirements defined for the primary flow (open edit → modify field → save → success toast → card updated)? [Coverage, Spec §US1]
- [X] CHK032 Are requirements defined for the cancel flow (open edit → modify → cancel → confirm discard → no changes)? [Coverage, Spec §US2]
- [X] CHK033 Are requirements defined for loading states during save and test operations? [Coverage, Spec §US3]
- [X] CHK034 Are requirements defined for external modification of .mcp.json (concurrent delete) during an active edit session? [Coverage, Spec §Edge Cases]
- [X] CHK035 Are requirements defined for invalid input during edit (empty command, invalid URL)? [Coverage, Spec §Edge Cases]
- [X] CHK036 Are requirements defined for transport type change cancellation (user declines confirmation dialog)? [Coverage, Spec §FR-003]

## Edge Case Coverage

- [X] CHK037 Are requirements defined for what happens when the edited MCP is deleted externally before save (FR-006)? [Edge Cases, Spec §FR-006]
- [X] CHK038 Are requirements defined for editing an MCP that is currently "connected"? [Edge Cases, Spec §Edge Cases]
- [X] CHK039 Are requirements defined for file permission errors during save? [Edge Cases, Spec §Edge Cases]
- [X] CHK040 Are requirements defined for backend unavailability during save? [Edge Cases, Spec §Edge Cases]
- [X] CHK041 Are requirements defined for a no-op edit (user opens modal, changes nothing, clicks Save)? [Edge Cases, Spec §Edge Cases]
- [X] CHK042 Are requirements defined for rapid successive saves (double-click Save)? [Edge Cases, Spec §Edge Cases]
- [X] CHK043 Are requirements defined for editing an MCP whose name contains special characters (Unicode, spaces, hyphens)? [Edge Cases, Spec §Edge Cases]

## Non-Functional Requirements

- [X] CHK044 Are performance targets (SC-001, SC-002) quantified as user-facing metrics, not implementation details? [NFR, Spec §SC-001, SC-002]
- [X] CHK045 Are accessibility requirements (SC-005) specified with sufficient detail to be actionable? [NFR, Spec §SC-005]
- [X] CHK046 Is the icon library constraint (lucide-react) consistently applied across all references, including the plan and tasks? [NFR, Spec §FR-008, Constitution VI]

## Ambiguities & Conflicts

- [X] CHK047 Does the plan.md "Performance Goals" section align numerically with spec.md SC-001 and SC-002? [Consistency, plan.md vs spec.md]
- [X] CHK048 Does the term "functionally identical" (FR-002) risk misinterpretation about which behaviors are shared vs different? [Ambiguity, Spec §FR-002]
- [X] CHK049 Are all cross-references to the Connection Manager spec (002) stable (won't break if 002 changes)? [Traceability]
- [X] CHK050 Is there any conflict between the Constitution's English requirement (Principle III) and any user-facing string embedded in the spec (e.g., confirmation dialogs)? [Ambiguity, Constitution vs Spec §FR-003]

## Notes

- 50 items total (CHK001–CHK050) — ALL PASS
- 3 gaps resolved: no-op edit (CHK041), double-click (CHK042), name character constraints (CHK043) added to spec Edge Cases
