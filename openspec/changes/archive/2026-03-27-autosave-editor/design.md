## Context

Aleph has four entity-editing forms (characters, sessions, quests, wiki entities), each using `MarkdownEditor.client.vue` for long-form Markdown content. Content is only persisted when the user explicitly clicks Save. There is no crash/close recovery.

## Goals / Non-Goals

**Goals:**
- Persist editor content to `localStorage` on every change (debounced ~1 s)
- On mount, if a draft exists that differs from server content, show a restore banner
- Clear the draft from `localStorage` on successful form submit
- Work for both "new" records (no slug yet) and existing edit pages

**Non-Goals:**
- Full offline sync or conflict resolution against the server
- Persisting form fields other than the Markdown content (name, type, etc.)
- Server-side draft storage

## Decisions

### Draft key scheme
`aleph:draft:{campaignId}:{entityType}:{slug}` — e.g. `aleph:draft:abc123:character:gandalf` or `aleph:draft:abc123:character:new`.
- Passed to `MarkdownEditor` as a `draftKey` prop (string | null)
- When `draftKey` is null the autosave feature is disabled (e.g. read-only views)
- Forms compute `draftKey` from route params: `${campaignId}:${entityType}:${slug ?? 'new'}`

### Where the logic lives
A new composable `useEditorDraft(draftKey, serverContent)` handles:
- `watchEffect` to write to localStorage (debounced 1 s) when content changes
- Returns `hasDraft`, `draftContent`, `discardDraft()` so the form/editor can react

The restore banner is rendered inside `MarkdownEditor` itself (self-contained, no parent changes needed beyond passing `draftKey`).

### Restore banner UX
- Shown at top of the editor area when `hasDraft && draftContent !== serverContent`
- Two actions: **Restore draft** (replaces editor content) and **Discard** (clears localStorage key)
- Banner is dismissed either way

### Clear on save
Forms call `clearDraft(draftKey)` (exported from the composable or a utility) in the `onSuccess` callback of their submit handler. This removes the key from `localStorage`.

### Debounce
1 000 ms debounce on writes to avoid thrashing `localStorage` on every keystroke. On `beforeunload` the debounce is flushed immediately.

## Risks / Trade-offs

- `localStorage` is per-origin and per-browser — drafts don't roam across devices (acceptable for MVP)
- Key collisions if two tabs edit the same entity simultaneously — last write wins; acceptable given single-user campaigns are the norm
- `localStorage` quota (~5 MB) could be exhausted for very large campaigns; mitigation: catch `QuotaExceededError` and silently skip
