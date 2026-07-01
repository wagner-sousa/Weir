# Research: Save on Test

## 1. Auto-Save on Test Connection

**Decision**: After `handleTest` completes with `success: true` or `needsAuth: true`, automatically call the save flow and close the modal.

**Rationale**:
- Eliminates the extra "Save" click for the common happy path
- The existing `handleSave` function already handles save + toast + modal close
- For failures (non-auth errors), do NOT save — keep current behavior

**Alternatives considered**:
- Separate "Test then Save" button — adds UI complexity, not needed
- Auto-save only on success, not on needsAuth — would require user to click Save after auth shield appears, breaking the flow

## 2. Auto-Test on Save

**Decision**: When "Save" is clicked without a prior successful test, run the connection test first. On success or needsAuth, proceed with save. On error, show error and do not save.

**Rationale**:
- Ensures every saved MCP has a validated connection
- For HTTP MCPs with needsAuth, auto-saves and opens OAuth2 popup
- For errors, keeps modal open so user can fix config
- Rely on `testResult` state to determine if a test has been run

**How to detect "already tested"**: The `testResult` state already stores the last test outcome. If `testResult` is non-null and matches the current transport config, skip auto-test. Otherwise, run the test.

**Alternatives considered**:
- Always auto-test on save, ignoring previous test result — simpler but re-tests unnecessarily
- Disable Save until Test is clicked — violates user expectation (Save should be available)

## 3. OAuth2 Popup on Auto-Save with needsAuth

**Decision**: After auto-save triggered by Save (not Test), if the result has `needsAuth: true` and the MCP has `clientId` configured, open the OAuth2 authorization popup automatically. The modal closes first, then the popup opens.

**Rationale**:
- The CardGrid's `handleAuth` function already handles the popup flow
- Modal must close first because `handleAuth` fetches the auth URL which reads from `.mcp.json`
- For missing `clientId`: save the MCP, show a warning toast, do NOT open popup — the shield icon on the card lets the user authorize later

**Flow**:
1. User clicks Save
2. Auto-test runs (or skips if already tested)
3. If success/needsAuth: save MCP, close modal
4. If needsAuth && clientId exists: open OAuth2 popup
5. If needsAuth && no clientId: show warning toast

**Alternatives considered**:
- Open popup before saving — token exchange requires MCP to be in .mcp.json first
- Block save until OAuth2 complete — too complex, breaks the model-close expectation

## 4. "Test Connection" Button in Edit Mode

**Decision**: Auto-save on Test also applies in Edit mode. The updated config is saved and the modal closes on success.

**Rationale**:
- Consistency with Add mode
- Editing an existing MCP: user changes transport config, clicks Test, config is saved
- On needsAuth: saves with updated config, shield icon visible

## 5. Button States During Auto-Test

**Decision**: During the auto-test triggered by Save, the Save button text changes to "Testing..." and is disabled. The Test Connection button is also disabled.

**Rationale**:
- Prevents double-submission
- Clear visual feedback that an operation is in progress
- Reuse existing `testing` state variable and button disabled logic

**Alternatives considered**:
- Show "Saving..." during save phase — unnecessary complexity; "Testing..." covers the entire flow
