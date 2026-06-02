# The content model: files + database

Aleph stores every wiki entity **twice** — as a Markdown file on disk and as a row in SQLite — and keeps the two in sync. This is the core design decision the rest of the app is built around. This doc explains the format, the sync mechanism, and why it works this way.

## Why two stores

Neither store alone is enough:

- **Files alone** give you human-readable, git-friendly, app-independent content — but no fast queries, no permission scoping, no relevance-ranked search.
- **A database alone** gives you all of that — but locks your prose inside a binary blob you can only read through the app.

So Aleph uses each for what it's good at:

|                               | Source of truth for…                                                                                 |
| ----------------------------- | ---------------------------------------------------------------------------------------------------- |
| **Markdown file**             | content: prose body + frontmatter (name, aliases, tags, visibility, template, parent, custom fields) |
| **Database row** (`entities`) | metadata + indexing: campaign id, slug, file path, content hash, visibility, search index            |

## The file format

Path convention (resolved by `resolveEntityPath` in `server/services/content.ts`):

```
content/campaigns/<campaign-slug>/<type>/<entity-slug>.md
```

Each file is YAML frontmatter + a Markdown body:

```markdown
---
id: 7f3a… # uuid, links file ⇄ row
type: character
name: Gandalf the Grey
aliases: [Gandalf, Mithrandir]
tags: [wizard, istari]
visibility: members # who can see this entity
template: character # optional entity template
parent: null # optional hierarchy
created: 2024-01-01T00:00:00Z
modified: 2024-06-02T12:00:00Z
fields: # arbitrary template-defined fields
  birthYear: 1019
---

# Gandalf the Grey

A wizard of the Istari… mentions of other entities like
the [[Shire]] get auto-linked on render.
```

Frontmatter is parsed with `gray-matter` and validated with a Zod schema (`baseEntityFrontmatter` in `content.ts`). Unknown `fields` are allowed — that's how entity templates add custom data.

## How they stay in sync

The pairing key is the `id` in frontmatter, which equals the `entities.id` row id.

**On write** (API edit or a collaborative save):

1. Write the Markdown file (`writeEntityFile` bumps the `modified` timestamp and serializes frontmatter via `matter.stringify`).
2. Compute a content hash of the file.
3. Update the `entities` row: hash, name, visibility, modified, etc.
4. Re-index the entity in FTS5 (`indexEntity`).

**On read:** `readEntityFile` parses + validates the file and returns a typed object; the row supplies scoping/permission metadata.

**On delete:** the file is unlinked and the row + FTS entry are removed.

The **content hash** (stored in `entities.contentHash`) is what lets the system detect drift between file and row — useful when files are edited out-of-band, and the hook point for the file watcher (`server/services/watcher.ts`).

## Visibility & secret blocks

Two layers of access control live in the content model:

1. **Entity visibility** — the `visibility` frontmatter field gates the whole entity (e.g. `dm_only` entities 404 for players).
2. **Secret blocks** — inline regions hidden from lower roles, written as a Markdown directive:

   ```markdown
   :::secret{.dm}
   The duke is secretly a doppelganger.
   :::
   ```

   `stripSecretBlocks(content, userRole, revealedBlockIds)` removes these **on the server** before the content is sent, based on the requesting user's role (`dm > co_dm > editor > player > visitor`). Players never receive the bytes — this is real access control, not a CSS `display:none`. Implementation: `server/services/remark-strip-secrets.ts`.

## Full-text search (SQLite FTS5)

Search is powered by SQLite's built-in FTS5 engine, initialized in `server/services/search.ts`:

- Two tables: `entities_fts` (the FTS5 virtual table) and `entities_fts_map` (rowid ⇄ entity/campaign).
- Tokenizer: `porter unicode61` with prefix indexing (`prefix='2 3'`) for substring/stemmed matches.
- Indexed columns: name, aliases, tags, body.
- Ranking: `bm25(entities_fts, 10, 8, 2, 1)` — name weighted highest, body lowest.
- Results are campaign-scoped and returned with `snippet()` context highlights.

`indexEntity` is called from the same write flow described above, so search is always current. `searchEntities(campaignId, query)` is what the search UI and the CLI `search` command hit.

## Entity types, templates & tags

- **Entity types** (`entity-types.ts`) let a campaign define its own kinds of things beyond the built-ins.
- **Templates** standardize an entity type's `fields` so every NPC, location, etc. has a consistent shape.
- **Tags** (`tags`, `entityTags`) are campaign-scoped, color-coded, and indexed for search.

## Relations & the graph

Entity-to-entity relationships live in `relations.ts` (note: the field names are `sourceSlug` / `targetSlug`, not `source_entity_slug`). The relationship graph UI and the family-tree genealogy both read from here; `server/services/graph-builder.ts` turns relations into the Cytoscape graph, and `server/services/genealogy.ts` runs a layered Walker layout for family trees.
