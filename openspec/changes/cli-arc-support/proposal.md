## Why

Narrative arcs are a first-class part of the session model — `game_sessions.arcId` and
`game_sessions.chapterId` exist, `arcs.sortOrder` drives arc ordering in the UI, and the
arcs/chapters pages in `arcs-chapters-ui` are built on top of them. But **the CLI cannot
put a session into an arc**, which makes bulk narrative organisation impossible from the
terminal.

This was found empirically while assigning 73 existing sessions to arcs in a live campaign:

1. **`session update` cannot set a session's arc or chapter.** It offers `--campaign`,
   `--title`, `--date`, `--status`, `--group`, `--json` and nothing else
   (`cli/src/commands/session.js`). The server is already ready:
   `server/api/campaigns/[id]/sessions/[slug]/index.put.ts` validates `arcId` (line 23)
   and `chapterId` (line 24) and applies them (lines 43–44). `session create` has the same
   gap against the same fields on `sessions/index.post.ts` (lines 25–26, 82–83). The only
   way through was hand-built `PUT` calls with a manually assembled auth header — exactly
   the class of workaround the CLI exists to remove.
2. **`arc create` / `arc update` cannot set `sortOrder`.** `arcs.sortOrder`
   (`server/db/schema/sessions.ts:35`) is what `GET /api/campaigns/:id/arcs` orders on
   (`arcs/index.get.ts:28`) and what the UI renders in order. The **API already accepts
   `sortOrder`** — `arcs/index.post.ts:20,34` and `arcs/[slug]/index.put.ts:28`, and the
   chapter endpoints likewise (`chapters/index.post.ts:20,34`,
   `chapters/[slug]/index.put.ts:31`). Only the CLI omits the flag, so every
   CLI-created arc lands at `sortOrder: 0` and cannot be ordered without bypassing the CLI.
   **No arc/chapter endpoint change is required for this.**
3. **`session list` cannot filter by arc**, so an arc assignment cannot be verified from
   the CLI either. Unlike `sortOrder`, this one _does_ need a server change:
   `sessions/index.get.ts` accepts only `groupSlug` (line 14) and `status` (line 26), and
   its projection returns a bare `arcId` with no arc name (contrast `groupName`, line 53).
4. **Two live CLI defects block the same workflow.** `aleph chapter list --campaign <id>`
   always fails: it calls `GET /api/campaigns/:id/chapters` with no query string, but that
   endpoint hard-requires `arc_id` and returns 400 without it (`chapters/index.get.ts:10`).
   And `arc create` / `chapter create` print `(${data.slug})` while those POST handlers
   return only `{ id, name }` — so the success line literally reads
   `Arc created: The Dragon War (undefined)`, denying the operator the slug they need for
   the very next command.

## What Changes

- **`session update` gains `--arc <slug>` and `--chapter <slug>`**, resolved **server-side
  by slug** in the sessions PUT handler, mirroring the existing `groupSlug` pattern in that
  same file. `--arc ''` unsets the arc (and clears the chapter with it); `--chapter ''`
  unsets only the chapter.
- **`session create` gains the same `--arc` / `--chapter` flags**, resolved the same way in
  `sessions/index.post.ts`.
- **Sessions PUT/POST accept `arcSlug` and `chapterSlug`** alongside the existing
  `arcId`/`chapterId` (which stay accepted, unchanged, for the UI and back-compat).
  Unknown slug → 404 with a named message, matching `groupSlug`.
- **`session list` gains `--arc <slug>`**, backed by a new `arcSlug` query filter on
  `sessions/index.get.ts`, and the list projection gains `arcName` / `chapterName` so
  arc membership is visible in both table and `--json` output.
- **`arc create` / `arc update` gain `--sort-order <n>`**, and `chapter create` /
  `chapter update` gain `--sort-order <n>` too. Moving a chapter to a different arc is
  **explicitly out of scope** (see design): the chapters PUT handler does not accept
  `arcId`, so that would require a server change beyond this change's remit.
- **`chapter create --arc` starts accepting a slug** (today it takes a raw `arcId`),
  resolved CLI-side, with the id form still accepted.
- **Defect fixes:** `chapter list` is reimplemented over `GET /api/campaigns/:id/arcs`
  (which already nests each arc's chapters, `arcs/index.get.ts:41`) so it works without an
  `--arc`, and gains an optional `--arc <slug>` narrowing; `arc create` / `chapter create`
  print the real slug.
- **Docs/skills:** `docs/claude-skill.md` and `.claude/skills/aleph-cli/SKILL.md` updated
  together, skill `version` bumped.

## Capabilities

### Modified Capabilities

- `aleph-cli`: the existing `Arc & Chapter CLI Commands` requirement is restated to cover
  update/delete, `--sort-order`, slug-addressed `chapter create --arc`, the working
  `chapter list`, and truthful create output. Two new requirements cover assigning a
  session to an arc/chapter and filtering `session list` by arc.
- `session-management`: the sessions PUT/POST gain slug-based arc/chapter resolution and
  the sessions GET gains an `arcSlug` filter plus arc/chapter names in its projection.

### Unaffected Capabilities

- `arcs-chapters-ui`: no delta. It specifies the arcs list page, arc detail page with
  inline chapter management, the session-form picker link, and role gating — none of which
  change. The arc/chapter pickers keep sending `arcId`/`chapterId`, which the endpoints
  continue to accept.

## Impact

**aleph-cli (explicitly assessed — this is the point of the change):**
`cli/src/commands/session.js` — `list` (`--arc`, new columns), `create` and `update`
(`--arc`, `--chapter`, and the "provide at least one field" guard extended to the new
flags). `cli/src/commands/arc.js` — `create`/`update` gain `--sort-order`, `create` prints
the real slug, `list` shows sort order. `cli/src/commands/chapter.js` — `list` rebuilt over
the arcs endpoint and gains optional `--arc`, `create` accepts an arc slug and gains
`--sort-order` and prints the real slug, `update` gains `--sort-order`. No change to
`cli/src/lib/client.js`, `config.js`, or the login/logout flows: no new auth surface and no
new transport concern.

**Server API:** `server/api/campaigns/[id]/sessions/[slug]/index.put.ts` and
`sessions/index.post.ts` — add `arcSlug`/`chapterSlug` to the Zod schema and resolve them
against `arcs`/`chapters` scoped to the campaign. `sessions/index.get.ts` — add the
`arcSlug` filter and left-join `arcs`/`chapters` for names. **The arcs and chapters
endpoints are not touched**: they already accept `sortOrder`.

**Frontend (`app/`):** none. The session form keeps posting `arcId`/`chapterId`. The
`arcName`/`chapterName` additions to the sessions list payload are additive.

**Data model:** no schema change and no migration. Note for design: neither `arcs` nor
`chapters` has a uniqueness constraint on slug (`arcs` carries only
`index('idx_arcs_campaign')`; `chapters` has no `campaignId` column at all), unlike
`session_groups` which is `unique().on(campaignId, slug)` — so slug resolution must define
its behaviour when a slug is ambiguous.

**i18n:** none — CLI output is not localised.

**Tests:** integration tests for slug resolution, unsetting, ambiguity, cross-campaign
isolation, the `arcSlug` filter, and unauthenticated access; unit tests for the CLI
argument-to-body mapping and for `chapter list`'s flattening; no E2E (no UI change).
