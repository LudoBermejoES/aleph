## 1. Swap dependency

- [x] 1.1 `npm uninstall @tiptap/extension-collaboration-cursor && npm install @tiptap/extension-collaboration-caret` — verify it installs without peer dep errors
- [x] 1.2 Verify `npm ci` works without `--legacy-peer-deps` (run `rm -rf node_modules && npm ci`)

## 2. Update MarkdownEditor

- [x] 2.1 Replace import: `CollaborationCursor` from `@tiptap/extension-collaboration-cursor` → `CollaborationCaret` from `@tiptap/extension-collaboration-caret`
- [x] 2.2 Replace extension usage: `CollaborationCursor.configure(...)` → `CollaborationCaret.configure(...)` (same options: `provider`, `user`)
- [x] 2.3 Check the new extension's CSS class names (inspect source at `node_modules/@tiptap/extension-collaboration-caret/`) and update the `<style>` block if class names changed (`.collaboration-cursor__caret`, `.collaboration-cursor__label`)

## 3. Update E2E test

- [x] 3.1 Update `tests/e2e/collaboration.spec.ts` — replace `.collaboration-cursor__label` selector with the new class name

## 4. Clean up CI workflow

- [x] 4.1 Remove `--legacy-peer-deps` from all `npm ci` calls in `.github/workflows/deploy.yml` (only if step 1.2 confirmed it's no longer needed)
