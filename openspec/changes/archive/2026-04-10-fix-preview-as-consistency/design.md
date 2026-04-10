## Context

The codebase has two tiers of content entity:

**Tier 1 — file-backed entities** (characters, wiki entities, sessions log): content stored as `.md` files on disk, served via `readEntityFile` + `stripSecretBlocks`, with full secret-block support and `preview_as` query param.

**Tier 2 — DB-text entities** (arcs, quests, locations, organizations, items): description/content stored as a plain `text` column in SQLite. No secret-block stripping, no markdown rendering, no `preview_as` support. Some already use `MarkdownEditor` in their forms (locations, quests) but the viewer side was never updated.

Additionally, the `PreviewRoleSwitcher` component is mounted on arcs, quests, and locations pages but is not wired to anything — the URL changes but content never reloads.

Sessions has a broken `onPreviewRoleChange` that calls a non-existent `/render` endpoint.

## Goals / Non-Goals

**Goals:**

- All long-form text fields render as markdown with `MDC` and support secret blocks
- All pages with `PreviewRoleSwitcher` reactively reload content when the combobox changes
- Sessions `preview_as` works end-to-end
- Secret blocks are stripped server-side for non-DM roles on all entity types

**Non-Goals:**

- Migrating arc/quest/chapter descriptions to file-backed storage (stays in DB text — no migration needed, simpler)
- Adding secret-reveal toggle buttons to arcs/quests/organizations/items (out of scope — just stripping)
- Changing the DB schema for any table

## Decisions

### D1: Keep arc/quest/chapter/organization/item descriptions in DB text, not files

Locations, characters, and wiki entities are file-backed because they need large collaborative content. Arcs, quests, chapters, organizations, and items have shorter descriptions. Moving them to files would require a migration and adds complexity for little benefit.

**Consequence**: `stripSecretBlocks` runs directly on the DB text column value in the GET endpoint. No `filePath` needed.

**Alternative considered**: Migrate to files (like characters). Rejected — migration risk, no benefit for shorter content.

### D2: Use `watch(route.query.preview_as, ...)` pattern (characters approach) for all pages

The entities page uses `@change` event + `onPreviewRoleChange` + a separate `previewContent` ref. The characters page uses a route watcher that calls `load()`. The watcher approach is simpler and handles direct URL navigation (e.g. sharing a link with `?preview_as=player`).

All affected pages (arcs, quests, locations, organizations) will follow the characters pattern: `watch(route.query.preview_as, () => load())`.

**Consequence**: The entities page (`@change` pattern) is left as-is for now — it works, just fragile on direct URL navigation. Normalizing it is a separate concern.

**Alternative considered**: Standardize on `@change` everywhere. Rejected — watcher is strictly better and already proven.

### D3: Sessions render endpoint mirrors entities render endpoint

`sessions/[slug]/render.get.ts` will read `logContent` from the session file (already exists as `logFilePath`), run `stripSecretBlocks` with the effective role, and return `{ content, previewMode, effectiveRole }` — identical shape to the entity render response.

### D4: Locations viewer: replace `v-html` + `\n→<br>` with `<MDC>`

The location GET endpoint already calls `stripSecretBlocks` via `safeReadEntityFile`. The viewer just needs to switch from `v-html` to `<MDC :value="location.content">`.

### D5: No new DB columns or migrations

All changes are: server-side stripping added to GET endpoints, frontend viewer components swapped, route watchers added. Zero DB migrations.

## Risks / Trade-offs

- **Existing arc/quest plain text content with Markdown syntax** → After the change, any `**bold**` or `# heading` in existing arc descriptions will render as formatted HTML. This is intentional and desired.
- **Secret blocks in arc/quest descriptions written before this change** → They will now be stripped for players. This is correct behavior.
- **Sessions render endpoint added but sessions page still uses `@change`** → If someone navigates directly to a session URL with `?preview_as=player`, the preview won't load on mount. Known limitation, acceptable for now.
