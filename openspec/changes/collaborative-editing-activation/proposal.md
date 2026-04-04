# Activate Collaborative Editing

## Why

Aleph ships a fully functional Hocuspocus/Yjs collaboration backend (`server/plugins/hocuspocus.ts`) and the `MarkdownEditor.client.vue` component already supports `collaborative` and `documentName` props with live cursors via `@tiptap/extension-collaboration-caret`. However, **none of this is actually wired up**: every form that uses the editor (EntityForm, SessionForm, QuestForm, CharacterForm, LocationForm) passes only `v-model`, `placeholder`, `campaign-id`, and `draft-key` -- never `collaborative`, `documentName`, `userName`, or `userColor`.

The result is a dormant feature that cost significant effort to build but delivers zero value to users. Meanwhile, the entity detail page already computes `isCollaborative` from the `?collab=true` query param but never passes it through to any editor.

Two additional problems block activation:

1. **Hardcoded WebSocket URL** -- the Hocuspocus provider connects to `ws://${window.location.hostname}:3334`, which only works in local dev. In production (where Aleph runs behind a reverse proxy at `aleph.ludobermejo.es`), this fails silently.
2. **No visual feedback** -- when collaborative mode is active, there is no indicator showing who else is editing. The caret labels exist in CSS but users have no way to know the session is shared.

## What Changes

1. Add `runtimeConfig.public.hocuspocusUrl` to `nuxt.config.ts` so the WS endpoint is configurable per environment (falls back to deriving from `window.location` when not set).
2. Wire `collaborative`, `documentName`, `userName`, and `userColor` props through all relevant form components (EntityForm, SessionForm, QuestForm).
3. Create a `CollaborationIndicator` component that shows connected peers (avatar dots + names).
4. Expose the indicator in MarkdownEditor when collaborative mode is active.
5. Clean up the entity detail page's unused `isCollaborative` computed and the stale `editing`/`saving` refs.

## Capabilities

- **Real-time co-editing** on entity, session, and quest content via the existing Hocuspocus backend.
- **Live cursor presence** showing each connected user's name and color.
- **Collaboration indicator** bar above or below the editor showing who is currently editing.
- **Production-ready WS URL** derived from runtime config or the current page origin.

## Impact

- **Files modified**: `nuxt.config.ts`, `MarkdownEditor.client.vue`, `EntityForm.vue`, `SessionForm.vue`, `QuestForm.vue`, entity detail page, plus a new `CollaborationIndicator.vue` component.
- **No new API endpoints** -- this activates existing infrastructure only.
- **aleph-cli**: Not affected. No API surface changes; collaboration is purely a frontend/WebSocket concern.
- **i18n**: New keys needed for collaboration indicator strings (e.g. "X is also editing", "You are editing alone").
- **Testing**: Unit tests for WS URL derivation logic, integration tests for Hocuspocus connection with proper URL, E2E tests for collaborative editing flow.
