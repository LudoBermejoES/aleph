## 1. Composable — useEditorDraft

- [x] 1.1 Create `app/composables/useEditorDraft.ts` — accepts `draftKey: Ref<string | null>` and `serverContent: Ref<string>`; watches content changes and writes to `localStorage` with 1 s debounce (flush on `beforeunload`); returns `{ hasDraft, draftContent, restoreDraft, discardDraft }`
- [x] 1.2 Catch `QuotaExceededError` in the write path and silently skip
- [x] 1.3 Compute `hasDraft` as `draftContent !== null && draftContent !== serverContent`

## 2. MarkdownEditor — draftKey prop + restore banner

- [x] 2.1 Add `draftKey` prop (`String | null`, default `null`) to `MarkdownEditor.client.vue`
- [x] 2.2 Call `useEditorDraft(draftKey, serverContent)` inside the editor; wire up the debounced watch to the editor's current content
- [x] 2.3 Render a restore banner (above the toolbar) when `hasDraft` is true — show "Restore draft" and "Discard" buttons
- [x] 2.4 "Restore draft" button sets the editor content to `draftContent` and dismisses the banner
- [x] 2.5 "Discard" button calls `discardDraft()` and dismisses the banner

## 3. Forms — pass draftKey and clear on save

- [x] 3.1 `CharacterForm.vue` — compute `draftKey` as `aleph:draft:${campaignId}:character:${slug ?? 'new'}`, pass to `MarkdownEditor`; call `discardDraft()` on successful submit
- [x] 3.2 `SessionForm.vue` — compute `draftKey` as `aleph:draft:${campaignId}:session:${slug ?? 'new'}`, pass to `MarkdownEditor`; call `discardDraft()` on successful submit
- [x] 3.3 `QuestForm.vue` — compute `draftKey` as `aleph:draft:${campaignId}:quest:${slug ?? 'new'}`, pass to `MarkdownEditor`; call `discardDraft()` on successful submit
- [x] 3.4 `EntityForm.vue` — compute `draftKey` as `aleph:draft:${campaignId}:entity:${slug ?? 'new'}`, pass to `MarkdownEditor`; call `discardDraft()` on successful submit

## 4. Unit Tests

- [x] 4.1 Write `tests/unit/useEditorDraft.test.ts` — test: draft written after debounce, draft NOT written when draftKey is null, `hasDraft` false when draft matches serverContent, `discardDraft` removes key, QuotaExceededError silently handled

## 5. E2E Tests

- [x] 5.1 Write `tests/e2e/autosave-editor.spec.ts` — test: type in editor, reload page, restore banner appears, click "Restore draft", content is restored
- [x] 5.2 Test: type in editor, reload page, click "Discard", banner disappears and server content is shown
- [x] 5.3 Test: save the form, reload page, no restore banner appears
