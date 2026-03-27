## Why

`@tiptap/extension-collaboration-cursor@2.26.2` has a peer dependency on `@tiptap/core@^2.7.0`, but the rest of the project uses `@tiptap/core@3.20.5`. This causes `npm ci` to fail in CI without `--legacy-peer-deps`, which just broke our first GitHub Actions deploy.

Tiptap v3 replaced the old extension with `@tiptap/extension-collaboration-caret` — a drop-in replacement that peers on `@tiptap/core@^3.20.6`, resolving the conflict cleanly.

## What Changes

- **Replace `@tiptap/extension-collaboration-cursor`** with `@tiptap/extension-collaboration-caret`
- **Update `MarkdownEditor.client.vue`** — swap import and extension configuration (`CollaborationCursor` → `CollaborationCaret`)
- **Update CSS class names** — the old extension uses `.collaboration-cursor__caret` / `.collaboration-cursor__label`; verify and update to whatever the new extension renders
- **Update E2E test** — `collaboration.spec.ts` selects `.collaboration-cursor__label`; update selector
- **Remove `--legacy-peer-deps`** workaround if the conflict was the only reason it was needed

## Capabilities

### New Capabilities

### Modified Capabilities

## Impact

- `package.json` — swap dependency
- `app/components/MarkdownEditor.client.vue` — import, config, CSS
- `tests/e2e/collaboration.spec.ts` — CSS selector update
- `.github/workflows/deploy.yml` — remove `--legacy-peer-deps` if no longer needed
- No API changes, no server changes
