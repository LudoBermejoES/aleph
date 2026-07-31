# Tasks: Character Public Notes

## 1. Database schema

- [ ] 1.1 Add `characterNotes` table to `server/db/schema/characters.ts` — `id`, `characterId`
      (FK → `characters.id`, cascade), `authorUserId` (FK → `user.id`, cascade), `body`,
      `createdAt`, `updatedAt`
- [ ] 1.2 Add `uniqueIndex('character_notes_char_author')` on `(characterId, authorUserId)` — this
      is the invariant that makes "one note per person per character" impossible to violate, not
      a lookup optimisation
- [ ] 1.3 Generate the Drizzle migration into `server/db/migrations/` and apply it
- [ ] 1.4 Verify both cascades against a real delete (character, then user) before moving on

## 2. Permissions

- [ ] 2.1 Add `canAnnotateCharacter(role: CampaignRole): boolean` to `server/services/characters.ts`
      — returns `false` for `visitor`, `true` otherwise
- [ ] 2.2 Leave `canEditCharacter()` untouched. Widening it is what this change must not do
- [ ] 2.3 Export the character-visibility resolution used by the read path so the note routes reuse
      it verbatim, rather than re-deriving who may see what

## 3. API — notes

- [ ] 3.1 `GET /api/campaigns/[id]/characters/[slug]/notes/me.get.ts` — resolve the character
      through the read visibility path (`404` when not readable), return the caller's note or
      `null` with `200`
- [ ] 3.2 `PUT .../notes/me.put.ts` — zod schema of **exactly** `{ body: string }`; reject
      `visitor` with `403`; upsert on the unique index; delete the row when the body is empty or
      whitespace-only
- [ ] 3.3 Wrap both in `withApiHandler`, matching the surrounding routes
- [ ] 3.4 Assert by test that the `PUT` ignores `ownerUserId` / `visibility` / `fields` if present
      in the payload

## 4. API — character read payload

- [ ] 4.1 Extend `.../characters/[slug]/index.get.ts` to join notes with the author's display name
      and return `notes: [{ authorUserId, authorName, body, updatedAt }]`
- [ ] 4.2 Order notes deterministically (`updatedAt` descending) so the page and the tests agree
- [ ] 4.3 Confirm `PUT .../characters/[slug]` is byte-for-byte unchanged

## 5. UI — character page and editor

- [ ] 5.1 In `app/pages/campaigns/[id]/characters/[slug]/index.vue`, compute an `canAnnotate`
      alongside the existing `canEdit` (which stays `['dm','co_dm','editor']`), and offer
      **Edit character** when either is true
- [ ] 5.2 In `.../[slug]/edit.vue`, add a restricted mode driven by `ownerUserId` + `campaignRole`
      that renders ONLY the note field — owner-only inputs must be **absent from the DOM**, not
      disabled, and the save must call the notes endpoint
- [ ] 5.3 Render all notes on the character page, each with author name and last-updated time, and
      mark the caller's own note visibly
- [ ] 5.4 Empty state: a character with no notes shows the invitation to add one, not a blank panel

## 6. i18n

- [ ] 6.1 Add keys to `i18n/locales/en.json` — panel title, empty state, save/saved, the
      restricted-editor explanation ("you can add your own notes to this character"), and the
      `visitor` refusal
- [ ] 6.2 Mirror every key in `i18n/locales/es.json`. Only `i18n/locales/` is loaded — do not
      touch `locales/` or `app/i18n/locales/`

## 7. aleph-cli — required, this change adds endpoints and a data model

- [ ] 7.1 Add a character-note read/write command under `cli/src/commands/`
- [ ] 7.2 Update `cli/src/lib/client.js` if the HTTP surface needs a new helper
- [ ] 7.3 Update `docs/claude-skill.md` (shareable skill, `aleph` / `npx aleph-cli`)
- [ ] 7.4 Update `.claude/skills/aleph-cli/SKILL.md` (local skill, absolute `node` path) and bump
      `version` in its frontmatter. Both skill files change together, always

## 8. Testing

- [ ] 8.1 Unit (`tests/unit/`) — `canAnnotateCharacter` across all five roles; the empty-body
      normalisation that turns a save into a delete
- [ ] 8.2 Integration (`tests/integration/`, server on port 3333) — every scenario in the spec
      delta: two members annotating without loss, same-author upsert, empty body deleting,
      `visitor` `403`, unreadable character `404`, unauthenticated `401`, `X-API-Key` success,
      notes present in the character payload, notes disappearing when visibility narrows to
      `dm_only`, and the character `PUT` still `403` for a non-owner
- [ ] 8.3 E2E (`tests/e2e/`) — a player opens a character they do not own, clicks **Edit
      character**, sees only the note field, saves, and the note appears attributed on the page.
      Assert the owner-only inputs are **absent from the DOM**, since that is the property 5.2
      claims
- [ ] 8.4 E2E — the owner still gets the full editor, and a `visitor` gets no edit action
- [ ] 8.5 Integration — the cascade tests from 1.4, as regression tests

## 9. Verification

- [ ] 9.1 `npx vitest run tests/unit/`
- [ ] 9.2 `npx vitest run tests/integration/` with the server running on **3333** — note that a
      dev server for another project on that port will silently hijack this suite
- [ ] 9.3 `npx playwright test`
- [ ] 9.4 Build and lint
- [ ] 9.5 `openspec validate add-character-public-notes --strict`
