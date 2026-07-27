## Context

The arc/chapter/session data model in `server/db/schema/sessions.ts`:

- `arcs` — `id`, `campaignId`, `name`, `slug`, `description`, `sortOrder`, `status`. Indexed
  by `idx_arcs_campaign`. **No uniqueness constraint on `(campaignId, slug)`.**
- `chapters` — `id`, `arcId` (FK, cascade), `name`, `slug`, `description`, `sortOrder`.
  **No `campaignId` column and no uniqueness constraint.** A chapter's campaign is reachable
  only through its arc.
- `game_sessions` — `arcId` and `chapterId` are independent nullable FKs. Nothing in the
  schema forces `chapterId`'s arc to equal `arcId`.
- `session_groups` — the contrasting case: `unique().on(campaignId, slug)`, which is why
  slug addressing is safe there.

Slugs come from `slugify(name)` at insert time (`arcs/index.post.ts:32`), so two arcs named
the same in one campaign silently share a slug. The existing arc PUT/DELETE handlers already
address arcs by slug with `.get()` (first row wins) — so slug addressing for arcs is the
established convention despite the missing constraint.

Existing slug-resolution precedent, in the very handler this change extends
(`sessions/[slug]/index.put.ts:45–62`): the client sends `groupSlug`, the server resolves it
against `(campaignId, slug)`, `null` or `''` clears the FK, and an unknown slug is a 404 with
the slug quoted in the message. `sessions/index.get.ts:14–24` mirrors it for reads, except
an unknown group slug there yields an **empty page**, not a 404.

## Goals / Non-Goals

**Goals:**

- A session can be put into (and taken out of) an arc and a chapter entirely from the CLI.
- Arcs and chapters can be ordered from the CLI.
- Arc membership is verifiable from the CLI (`session list --arc`, arc/chapter names in output).
- The CLI stays a thin wrapper: resolution and validation live server-side, shared with any
  other client.
- No arc/chapter endpoint changes — they already accept `sortOrder`.

**Non-Goals:**

- No DB migration, and specifically **no new unique constraint** on arc/chapter slugs. That
  is a data-integrity change with backfill implications for existing campaigns and belongs
  in its own change; this change instead defines deterministic behaviour under ambiguity.
- No moving a chapter between arcs (`chapters/[slug]/index.put.ts` accepts only `name`,
  `description`, `sortOrder`).
- No UI change; no `arcSlug` adoption by the session form.
- No bulk/batch assignment command (`session update` per session is enough; the CLI is
  scriptable).

## Decisions

### 1. `--arc <slug>`, not `--arc <arcId>`, resolved server-side

**Decision: mirror `groupSlug` exactly** — the CLI sends `arcSlug`/`chapterSlug` and the
sessions PUT/POST resolve them.

Reasons, in order of weight:

1. **Consistency with the rest of the CLI's arc surface.** `arc update`, `arc delete`,
   `chapter update`, `chapter delete` are all already `--slug`-addressed, and
   `session update --group` is slug-addressed. An id-only `--arc` would be the odd one out,
   and `arc list` prints slugs, not ids — so an id flag would force the operator to fetch
   `--json` just to translate.
2. **Server-side, not client-side, resolution.** Resolving in the CLI (GET `/arcs`, match
   locally, send `arcId`) would also work and needs no server change — it is the main
   alternative and it is rejected because: it costs an extra round trip per session (73
   sessions = 73 wasted GETs); it duplicates matching logic that the UI or any future client
   would have to re-implement; the check would be non-atomic (arc deleted between resolve
   and write); and error wording would then live in the CLI instead of once in the handler.
   The `groupSlug` precedent already settled this trade-off in this repo's favour.
3. **`arcId`/`chapterId` stay accepted.** The change is purely additive to the Zod schema, so
   the session form and any existing scripts keep working.

Ambiguity is the price of no unique constraint. **Decision: an ambiguous slug is an error,
not a silent first-match.** If more than one arc in the campaign carries the slug, the
handler returns 409 naming the slug and the count. This deliberately diverges from the
`.get()`-first-row-wins behaviour of the arc PUT/DELETE handlers because those _edit the arc
the operator named_, whereas here a wrong pick silently misfiles a session and is invisible
afterwards. A loud 409 is recoverable; a quiet mis-assignment across 73 sessions is not.

### 2. Unsetting: `--arc ''` works, and it clears the chapter too

**Decision: `--arc ''` (or `--arc` with an empty value) sets `arcId = NULL`, and also sets
`chapterId = NULL`.**

`--group <slug>`'s help text already reads "(empty string to unset)" and the handler already
treats `''` and `null` alike (`index.put.ts:46`), so empty-string-unsets is the house pattern
and needs no invention. The cascade to `chapterId` is the substantive decision: a chapter
belongs to an arc (`chapters.arcId`), so a session with `arcId = NULL` and a non-null
`chapterId` is a contradiction the schema permits but the domain does not. Clearing the arc
without clearing the chapter would leave rows that render as "no arc" in one place and
"chapter of Act I" in another. **`--chapter ''` unsets only the chapter** and leaves the arc
alone, which is the meaningful narrowing operation.

### 3. `--chapter` interaction with `--arc`: the chapter is authoritative

A chapter identifies its arc, so the two flags are not independent. **Decisions:**

- **`--chapter <slug>` alone → the arc is derived** from the resolved chapter's `arcId`. The
  session's `arcId` is set to it, overwriting any previous value. This is the behaviour that
  cannot produce an inconsistent row, and it saves the operator from passing redundant
  information.
- **Both flags given and consistent → applied as given.** Both given and _inconsistent_
  (the chapter's arc is not the named arc) → **422**, naming both slugs. Silently preferring
  either one would hide an operator mistake.
- **Chapter slug resolution is scoped to the campaign via the arc join**, and narrowed to
  the named arc when `--arc` is supplied. Scoping is not optional: `chapters` has no
  `campaignId`, and `chapters/[slug]/index.put.ts:18` shows the trap — it looks up the
  chapter by slug **globally** and only then checks the campaign, so a same-slug chapter in
  another campaign can shadow the right one and produce a spurious 404. The new resolution
  joins `chapters → arcs` and filters on `arcs.campaignId` from the start.
- Because chapter slugs are unique nowhere, an ambiguous chapter slug within the resolution
  scope is a **409**, as in decision 1 — and supplying `--arc` is the documented way to
  disambiguate.

### 4. `session list --arc <slug>`: yes, and unknown slug returns an empty page

**Decision: add it**, as an `arcSlug` query param on `sessions/index.get.ts`.

Without it the change is unverifiable from the CLI: the operator can assign 73 sessions and
has no terminal-side way to confirm the result, which is precisely the situation that
produced this proposal. Client-side filtering is not an option — the endpoint paginates
(default 50), so filtering after the fact would silently miss matches.

**Unknown arc slug → empty result set, not 404.** This looks inconsistent with the 404 that
decision 1 specifies for writes, and that split is intentional: it copies the two behaviours
the repo already has. `groupSlug` on the _write_ path 404s (`index.put.ts:57`) because a
write against a non-existent target is an operator error worth failing on; `groupSlug` on the
_read_ path returns an empty page (`index.get.ts:21–22`) because a filter matching nothing is
a legitimate answer. Following each precedent on its own path keeps the API predictable.
An ambiguous slug on the read path likewise stays permissive: it matches **all** arcs sharing
the slug rather than erroring, since a filter over-matching is visible in the output.

**`arcName` and `chapterName` are added to the projection** by left-joining `arcs` and
`chapters`, exactly as `groupName` is already joined (`index.get.ts:53,58`). Without it the
list would show opaque UUIDs, and the human-readable table has no room for them.

### 5. `--sort-order` is CLI-only; no arc/chapter endpoint change

Verified: `arcs/index.post.ts:20,34`, `arcs/[slug]/index.put.ts:28`,
`chapters/index.post.ts:20,34`, `chapters/[slug]/index.put.ts:31` all accept and apply
`sortOrder`. The CLI simply never sends it. So this is a four-flag CLI change with zero
server surface. Flag name is `--sort-order` (kebab-case, Commander maps it to `opts.sortOrder`)
and the value is parsed to a `Number` before sending, since the arcs POST schema is
`z.number()` and would 422 on a string.

### 6. `chapter list` is fixed over the arcs endpoint, not by changing the chapters endpoint

`aleph chapter list --campaign <id>` is broken today (400: `arc_id` required). Two ways to
fix it: relax `chapters/index.get.ts` to allow a campaign-wide listing, or have the CLI read
`GET /api/campaigns/:id/arcs`, which **already nests each arc's chapters in sort order**
(`arcs/index.get.ts:32–44`). **Decision: the CLI route.** It needs no server change, it is
one request instead of N (one per arc), and it yields a strictly better table — the arc's
**name/slug** per chapter instead of the raw `arcId` the command prints today. An optional
`--arc <slug>` narrows the output client-side from the same payload.

### 7. `chapter create --arc` accepts a slug, keeps accepting an id

Today it is `--arc <arcId>` and passes the value straight through as `arcId`, while every
neighbouring command is slug-addressed. **Decision: accept either.** The CLI resolves the
value against `GET /arcs` by slug; if no slug matches, it is passed through as an id. This is
client-side resolution — acceptable here (unlike decision 1) because the chapters POST
endpoint is not being modified in this change and a chapter is created once, not 73 times, so
the extra GET is immaterial. Existing invocations that pass an id keep working.

## Risks / Trade-offs

- **[Risk] Ambiguous arc slugs make `session update --arc` 409 in campaigns that already have
  duplicate-named arcs.** → Mitigation: the message names the slug and the duplicate count so
  the operator can rename one arc and retry. Failing loudly is the point; the alternative is
  undetectable misfiling. A follow-up change can add the unique constraint properly.
- **[Risk] Deriving the arc from `--chapter` silently rewrites a session's `arcId`.** →
  Mitigation: specified explicitly and documented in the CLI help text; the alternative
  (leaving a chapter whose arc differs from the session's arc) is a corrupt row.
- **[Risk] Two new left joins on the sessions list query.** → Mitigation: both are on indexed
  FK targets (`idx_sessions_arc`, `idx_sessions_chapter`) and the query is already paginated
  and already left-joins `session_groups`.
- **[Trade-off] Divergent 404-vs-empty and 409-vs-first-match behaviour between read and
  write paths.** → Accepted deliberately; each side follows the precedent already set for
  `groupSlug` on that same path, and the reasoning is recorded in decisions 1 and 4 so it is
  not re-litigated as an inconsistency.
- **[Risk] `chapter list` output shape changes (gains an arc name column, loses the raw
  `arcId` in table mode).** → Mitigation: the command is currently 100% broken, so no working
  invocation can regress; `--json` still carries every field.

## Migration Plan

No DB migration. Ship in layers, each independently testable: (1) sessions PUT/POST slug
resolution + integration tests; (2) sessions GET `arcSlug` filter and name joins; (3) CLI
`session` flags; (4) CLI `arc`/`chapter` `--sort-order`, `chapter list` fix, create-output
fix; (5) docs + both skill files. Rollback is dropping the new flags and query param — the
`arcId`/`chapterId` paths are untouched, so nothing to reverse in data.

## Open Questions

- Should `arcs`/`chapters` gain `unique().on(campaignId, slug)`? Out of scope here (needs a
  migration plus a dedupe/backfill for existing campaigns), but decision 1's 409 would become
  dead code once it lands. Recorded as the natural follow-up.
- Should `chapters` gain a `campaignId` column to make chapter scoping a single-table
  predicate rather than a join? Same reasoning: real improvement, separate change.
