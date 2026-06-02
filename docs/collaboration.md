# Real-time collaboration: Hocuspocus + Yjs + Tiptap

Two players can edit the same wiki page, session log, or quest at once and see each other's cursors. This doc explains the pipeline that makes that possible while still storing everything as Markdown on disk.

## The three formats problem

Collaborative editing forces three representations of the same content to coexist:

| Layer              | Format               | Why                                                                                      |
| ------------------ | -------------------- | ---------------------------------------------------------------------------------------- |
| Transport / merge  | **Yjs CRDT**         | conflict-free real-time merging of concurrent edits                                      |
| Editor wire format | **ProseMirror JSON** | what Tiptap actually manipulates in the browser                                          |
| Storage            | **Markdown**         | human-readable, git-friendly, app-independent (see [content-model.md](content-model.md)) |

The job of the collaboration layer is to move losslessly between them.

## Server: Hocuspocus on port 3334

`server/plugins/hocuspocus.ts` boots a Hocuspocus server (a Nitro plugin) on port `3334`. Documents are addressed by name:

```
campaign:<campaignId>:<type>:<slug>
# e.g. campaign:abc123:entity:gandalf
```

`type` is one of `entity`, `session`, `quest`.

### Lifecycle hooks

- **`onAuthenticate`** — validates the connection via a short-lived WS token (from `/api/ws/token`) or the better-auth session cookie, checks `campaignMembers`, and enforces edit roles (`dm`, `co_dm`, `editor` can write; players/visitors are read-only). Returns a context object attached to the connection.
- **`onLoadDocument`** — reads the entity/session/quest file from disk, converts Markdown → ProseMirror JSON, and hydrates the Yjs document with `prosemirrorJSONToYDoc`.
- **`onStoreDocument`** — debounced (2s after the last edit, 10s max). Converts the Yjs doc back to ProseMirror JSON → Markdown, merges it with the existing frontmatter, writes the file, updates the content hash in the DB, and re-indexes for search. Retries with exponential backoff (3 attempts) and broadcasts a stateless error message on failure.

Because storage is debounced, real-time merges stay snappy while disk I/O is throttled.

## The conversion engine

`server/services/collaboration.ts` is where Markdown ⇄ ProseMirror JSON happens. The trick: it runs a **headless Tiptap editor** server-side, under `jsdom`, configured with the same extensions the browser uses:

- `StarterKit` (paragraphs, headings, lists, code blocks, …)
- `Markdown` (bidirectional parse/serialize)
- **`EntityLink`** — the custom `:entity-link{…}` directive (see [autolink.md](autolink.md))
- **`SecretBlock`** — the `:::secret{.role}` directive (see [content-model.md](content-model.md))

Conversions:

- **Markdown → JSON:** `editor.markdown.parse(md)`
- **JSON → Markdown:** `editor.getMarkdown()`
- **Round-trip safety:** `isRoundTripSafe()` checks that content survives a parse→serialize cycle unchanged, guarding against silent corruption.

Running the _same_ extension set on both client and server is what keeps the custom directives (entity links, secret blocks) intact through the round trip.

## Client

The Tiptap editor on the client (`app/components/MarkdownEditor.client.vue`) attaches a `HocuspocusProvider` pointed at `NUXT_PUBLIC_HOCUSPOCUS_URL` (default `ws://localhost:3334`), wired through `@tiptap/extension-collaboration` and `@tiptap/extension-collaboration-caret` for shared cursors. The Yjs document is the shared state; Tiptap renders it.

`app/composables/useCollaborationProvider.ts` centralizes provider/Yjs-doc creation and teardown so components don't leak connections.

## Operational notes

- **Hocuspocus v4** (current) is wire-compatible with v3, so server and client can be upgraded independently. Keep the provider's `sessionAwareness` at its default (`false`) during any mixed-version window.
- yjs stays on the `^13` major; Hocuspocus v4 does not require a yjs bump.
- The collab server needs the same Node runtime as the app (Node 22+).
