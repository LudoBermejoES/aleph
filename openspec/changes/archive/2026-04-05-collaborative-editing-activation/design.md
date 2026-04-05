# Collaborative Editing Activation -- Design

## Decision 1: Which pages should support collaborative editing?

**Chosen**: Entity edit, session edit, and quest edit.

**Rationale**: These are the content-heavy pages where multiple campaign members (DM + co-DM, editors) are most likely to work simultaneously. Character edit and location edit are typically single-author and can be added later. Location content uses the same EntityForm so it gets collaboration for free if entity editing has it, but we will not actively enable it by default.

**Activation mechanism**: Collaborative mode activates via a `?collab=true` query parameter. This keeps the feature opt-in and allows a simple toggle. The "Edit" button on detail pages gains a "Collaborate" variant that appends the query param. Default editing remains solo (local-only, no WS connection) to avoid unnecessary server load.

## Decision 2: How to derive the WebSocket URL

**Chosen**: `useRuntimeConfig().public.hocuspocusUrl` with automatic fallback.

**Fallback logic** (in a `useCollaborationUrl()` composable):
1. If `runtimeConfig.public.hocuspocusUrl` is set and non-empty, use it directly (e.g. `wss://aleph.ludobermejo.es/collab` for proxied setups, or `ws://localhost:3334` for dev).
2. Otherwise, derive from `window.location`: replace `http` with `ws`, replace `https` with `wss`, and append port `3334`.

This supports three deployment modes:
- **Local dev**: no config needed, falls back to `ws://localhost:3334`.
- **Production with separate WS port**: set `NUXT_PUBLIC_HOCUSPOCUS_URL=wss://aleph.ludobermejo.es:3334`.
- **Production behind reverse proxy**: set `NUXT_PUBLIC_HOCUSPOCUS_URL=wss://aleph.ludobermejo.es/collab` and configure the proxy to forward `/collab` to Hocuspocus.

## Decision 3: Collaboration indicator UX

**Chosen**: Compact avatar bar inside the editor chrome (between toolbar and content area).

**Design**:
- A thin bar that appears only when `collaborative` is true.
- Shows colored dots (matching cursor colors) with user names for each connected peer.
- Current user shown as "You" with their assigned color.
- When alone: shows "Editing alone" in muted text (reassures user the connection is live).
- When others join: shows "Editing with X, Y" with colored dots.
- Connection status: a small dot (green = connected, yellow = reconnecting, red = disconnected) at the left edge.

**Component**: `CollaborationIndicator.vue` receives the Hocuspocus `provider` instance and reads awareness states to render peer info. It lives inside `MarkdownEditor.client.vue`'s template, shown conditionally when `props.collaborative` is true.

## Decision 4: Document name convention

**Kept as-is**: `campaign:{campaignId}:entity:{slug}` -- already used by Hocuspocus `onAuthenticate` and `onLoadDocument`. For sessions and quests, extend the pattern:
- Sessions: `campaign:{campaignId}:session:{sessionId}`
- Quests: `campaign:{campaignId}:quest:{questId}`

The Hocuspocus plugin's `onAuthenticate` document name parser needs to be extended to accept `session` and `quest` as valid types (currently only allows `entity`).

## Decision 5: User identity for cursors

**Approach**: Fetch the current user's name and a deterministic color from the auth session. The edit pages already have access to user info via `useAuth()` or a fetch to `/api/auth/get-session`. Pass `userName` and `userColor` to the editor. Color is derived by hashing the user ID to produce a consistent hue.

## Decision 6: Form component changes

**Approach**: Add optional `collaborative`, `documentName`, `userName`, and `userColor` props to EntityForm, SessionForm, and QuestForm. These are passed through to MarkdownEditor. The parent page (edit route) is responsible for computing the document name and deciding whether to enable collaboration. This keeps forms reusable for both solo and collaborative modes.
