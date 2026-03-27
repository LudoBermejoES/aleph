## Context

The project uses Tiptap v3 (`@tiptap/core@3.20.5`) with Hocuspocus for real-time collaboration. All extensions are on v3 except `@tiptap/extension-collaboration-cursor@2.26.2` which still peers on `@tiptap/core@^2.7.0`. This is the sole cause of the `ERESOLVE` failure in CI.

Tiptap v3 introduced `@tiptap/extension-collaboration-caret` as the replacement. It peers on `@tiptap/core@^3.20.6` and `@tiptap/y-tiptap@^3.0.2` (both already installed).

## Goals / Non-Goals

**Goals:** Replace the v2 collaboration cursor extension with the v3 caret extension. Fix the CI peer dependency conflict. No functional changes to collaboration behavior.

**Non-Goals:** Migrating away from Hocuspocus. Changing the collaboration provider. Adding new collaboration features.

## Decisions

**Direct swap: `CollaborationCursor` → `CollaborationCaret`** — the new extension has the same configuration shape (`provider`, `user` with `name`/`color`). The import name changes but the config is compatible.

**CSS class names** — the new extension may use different class names (e.g. `.collaboration-caret__*` instead of `.collaboration-cursor__*`). After installing, inspect the rendered DOM or source to confirm the exact classes, then update the styles in MarkdownEditor and the E2E test selector.

**Remove `y-prosemirror` only if unused** — it was a peer dep of the old extension. The Hocuspocus server plugin (`server/plugins/hocuspocus.ts`) imports `prosemirrorJSONToYDoc` from it, so it must stay.

**Remove `--legacy-peer-deps` from CI** — after the swap, verify `npm ci` works clean. If other conflicts remain, keep the flag; otherwise remove it.

## Risks / Trade-offs

[Low] CSS class names may differ — mitigated by checking the source/rendered output before updating styles.

[Low] `updateUser` command name may differ — mitigated by checking the extension docs (it remains `updateUser`).
