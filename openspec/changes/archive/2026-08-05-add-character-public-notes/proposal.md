# Proposal: Character Public Notes

## Why

A player who opens a character they do not own and clicks **Edit character** currently hits a
dead end: `PUT /api/campaigns/:id/characters/:slug` answers `403 You can only edit your own
character` (`server/api/campaigns/[id]/characters/[slug]/index.put.ts:57`).

> **Correction (2026-07-31), found during implementation.** This proposal originally claimed the
> detail page "never offers the button in the first place — `canEdit` is `['dm','co_dm','editor']`
> only". **That was wrong.** `canEdit` never gated that link: at `c229f52` the `NuxtLink` at
> `index.vue:78-81` carries **no `v-if` at all`, and `canEdit`is used only for`:editable` on a
different element (`:23`). So the button was offered to **everyone, visitors included**, and led
> straight to the 403. The dead end was worse than described, not milder. This also means the
> spec's "a visitor sees no editor" scenario was **false before this change\*\* — adding the gate is
> what makes it true, so that scenario is new behaviour, not a regression guard.

That is correct for the character's own data and wrong for the table's. Players accumulate real
knowledge about NPCs and about each other's characters — who lied to them, which alias belongs
to whom, what a faction owes them — and today there is nowhere in Aleph to put it. It ends up in
a private document nobody else can read, which is exactly the knowledge a campaign wiki exists
to hold.

This change gives every character a **public notes** area that any campaign member who can see
the character may write in, while leaving the character's own fields untouched and still owner /
editor-only.

## What Changes

- Add a **public notes** capability to characters: campaign members may annotate any character
  whose visibility already lets them read it.
- Store notes as **one row per (character, author)** rather than one shared column. See
  [design.md](design.md) — this preserves the requested behaviour (one public area, readable by
  every member, on any visible character) while removing the silent lost-update it would
  otherwise have.
- Add `GET` and `PUT` endpoints for a caller's own note on a character, and include all notes in
  the character read payload.
- Change the character detail page so **Edit character** is offered to players on characters they
  do not own, opening a restricted editor: every owner-only field is absent, not merely
  disabled, and only the note field is submittable.
- Render all notes on the character page, attributed to their author.
- Keep `PUT /characters/:slug` exactly as it is. A player editing a character they do not own
  still gets `403` from that route; the note travels on its own endpoint. No new way to reach
  owner-only fields is introduced.

## Scope

### In scope

- `character_notes` table + migration
- `GET`/`PUT` for the caller's own note, and notes in the character `GET` payload
- Restricted edit mode on the character detail/edit pages for non-owners
- Author attribution and display of all notes on a character
- i18n for `en` and `es`
- aleph-cli: a command to read and write a character note
- Unit, integration and E2E tests

### Out of scope

- Editing or deleting **another** member's note (a DM moderation path is a follow-up; see
  design.md "Deferred")
- Notes on entity types other than characters
- Real-time collaborative editing of a note (Hocuspocus); the note is a plain save
- Threading, replies or comment-style discussion
- Notifying the character owner that a note was added

## Impact

### Affected code

| Area        | Files                                                                                                      |
| ----------- | ---------------------------------------------------------------------------------------------------------- |
| Schema      | `server/db/schema/characters.ts` (new `characterNotes` table), `server/db/migrations/`                     |
| API         | new `server/api/campaigns/[id]/characters/[slug]/notes/` routes; `.../[slug]/index.get.ts` (include notes) |
| Permissions | `server/services/characters.ts` — new `canAnnotateCharacter()`, beside the existing `canEditCharacter()`   |
| Pages       | `app/pages/campaigns/[id]/characters/[slug]/index.vue`, `.../edit.vue`                                     |
| i18n        | `i18n/locales/en.json`, `i18n/locales/es.json`                                                             |

### aleph-cli impact — YES

This change adds server API endpoints and a data model, so per the project rules the CLI and
**both** skill files must be updated together:

- `cli/src/commands/` — a `character notes` read/write command
- `cli/src/lib/client.js` — if the HTTP surface needs a new helper
- `docs/claude-skill.md` — the shareable skill
- `.claude/skills/aleph-cli/SKILL.md` — the local skill, with a `version` bump in frontmatter

### Risks

- **A writable surface for a lower-privileged role.** `player` and `visitor` gain a write path
  where they had none. The mitigation is that the note endpoint accepts **only** a note body:
  it never reads the character update schema, so it cannot be used to reach `ownerUserId`,
  `visibility` or `fields`. The restricted editor omitting those inputs is a UI convenience, not
  the boundary.
- **Visibility coupling.** A note is readable by exactly whoever can read the character. If the
  character's visibility is later narrowed, the notes narrow with it — they are never a
  side-channel that outlives the restriction. This must be asserted by a test, not assumed.
- **`visitor` writes.** Whether `visitor` may annotate at all is a deliberate decision recorded
  in design.md, not an accident of `hasMinRole`.
- **A pre-existing stale-permission window that notes INHERIT, found during implementation.**
  `PUT /characters/:slug` never calls `invalidatePermissionCache()`, and `getCachedPermission`
  has a 5-minute TTL. A member who read a character _before_ its visibility was narrowed keeps
  reading it — and now its notes — until the entry expires. This is a read-path gap that public
  notes inherit rather than create; fixing it means touching `index.put.ts`, which this change
  forbids. Follow-up, not a blocker, and stated here so nobody reads the visibility-narrowing
  scenario as a stronger guarantee than it is.
