## Why

When a user is editing a character, session, quest, or wiki entity and accidentally closes the browser tab (or the tab crashes), all unsaved content is lost. There is no recovery path. This is a significant UX risk for long-form narrative writing which is core to Aleph's value.

## What Changes

- The `MarkdownEditor` component will persist its content to `localStorage` on every change, keyed by a stable identifier (entity type + campaign ID + entity slug/id, or "new" for new records).
- On mount, if a draft exists in `localStorage` that differs from the server-saved content, the user is shown a banner offering to restore it or discard it.
- When the form is successfully submitted (saved), the draft key is cleared from `localStorage`.
- Applies to all four forms that use `MarkdownEditor`: characters, sessions, quests, and wiki entities.

## Capabilities

### New Capabilities
- `editor-autosave`: Draft recovery for the Markdown editor — persists content to localStorage, prompts restore on revisit, clears on save.

### Modified Capabilities
<!-- No existing spec-level requirements change -->

## Impact

- `app/components/MarkdownEditor.client.vue` — add localStorage write on content change, accept a `draftKey` prop
- `app/components/forms/CharacterForm.vue`, `SessionForm.vue`, `QuestForm.vue`, `EntityForm.vue` — pass `draftKey`, clear draft on successful submit
- No server changes, no DB changes, no CLI impact.
- No new dependencies needed (`localStorage` is native).
