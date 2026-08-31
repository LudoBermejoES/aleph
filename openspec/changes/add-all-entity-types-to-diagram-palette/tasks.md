# Tasks

## 1. Server — the type fan-out

- [x] 1.1 In `server/api/campaigns/[id]/diagrams/entities/index.get.ts`, read this campaign's
      `entity_types` rows (`slug`, `name`, `sortOrder`) ordered by `sortOrder`.
- [x] 1.2 Delete the `or(eq(entities.type,'entity'), eq(entities.type,'wiki'))` clause's role as
      the only generic group. Keep a `wiki` key (same query) so existing readers do not break.
- [x] 1.3 Emit one group per declared type excluding `character`, `location`, `quest`, `faction`
      **and** `organization` — both spellings, per design D2.
- [x] 1.4 Build `groups: { key, label, builtin }[]`: the four built-ins first (label = the i18n
      key's own name, `builtin: true`), then the campaign types in `sortOrder` (label =
      `entity_types.name`, `builtin: false`).
- [x] 1.5 Apply the existing `MAX_PER_TYPE` cap and the existing `like(name, ...)` search to every
      new group.
- [x] 1.6 Apply the same `dm_only` visibility filter the `batch` sibling applies. **The claim was
      verified before writing the code and it holds**: `grep -c visibility` is **0** in this endpoint
      and **3** in its `batch` sibling, and the campaign it was measured on has **39 of 372** entities
      at `dm_only`. So the palette was leaking the NAMES of 39 DM-only entities to any player who
      opened a diagram. Organizations and quests have no `visibility` column of their own; they are
      filtered through their nullable `entity_id`, and a null one stays visible.

## 2. Client — render what the server names

- [x] 2.1 `EntityPanel.vue`: replace the hardcoded `defs` array with the response's `groups`,
      translating only `builtin: true` labels.
- [x] 2.2 Keep the empty-group filter, so a campaign with no objects shows no Objetos group.
- [x] 2.3 Retitle the canvas filter's `wiki` option to "Other entities"/"Otras entidades" in both
      locale files (`i18n/locales/{en,es}.json` — the canonical directory, per aleph's CLAUDE.md).
- [x] 2.4 Add no i18n keys for campaign types; their names are user data.

## 3. Tests

- [x] 3.1 **Unit** — extract the group-building into a pure helper and test it: the four built-ins
      come first; campaign types follow in `sortOrder`; `character`/`location`/`quest`/`faction`/
      `organization` are excluded; a renamed type carries its new name; `builtin` is set correctly.
- [x] 3.2 **Integration** — seed a campaign with an `item` entity and assert it comes back in an
      `item` group with the campaign's label. This is the test the current suite lacks: assert a
      **row**, never just that a key exists.
- [x] 3.3 **Integration** — assert no entity appears in two groups, and that organizations appear
      only under `organizations`.
- [x] 3.4 **Integration** — a `player` does not receive a `dm_only` item.
- [x] 3.5 **Integration** — `batch` returns an `item` by id (D5: proves hydration was already
      type-agnostic, so a regression there would be caught).
- [x] 3.6 **E2E** — open a diagram in a campaign holding an object; assert the palette shows the
      objects group and that dragging the object onto the canvas creates a card bearing its name.
- [x] 3.7 **Mutation-check every new test.** Done at all three levels, and the check itself very
      nearly gave a false pass:
  - Unit: dropping the present-types union reddened 3 of 14; dropping `'organization'` from the
    exclusion set reddened 2 of 14. Both the right ones.
  - Integration: the bug was restored and the suite reported **15/15 GREEN, twice** (8s and 38s
    after the edit). That is not the guard failing — **`nuxt dev` does not hot-reload
    `server/api/**`**. After a server RESTART the same suite went **6/15 red**. Recorded in
`CLAUDE.md`, because a mutation check run this way concludes the exact opposite of the truth.
  - E2E: with the fan-out disabled, test 1 failed **on line 52**, at
    `[data-testid="entity-group-item"]` — the assertion, not the setup. Its sibling failed on a
    cold-page wait at line 85, which is NOT the mutation (it asserts absence, so it must survive
    it); that wait was hardened rather than left to read as a caught mutation.

## 4. Verify against real data

- [x] 4.1 Measured on `berlin-en-tinieblas`, all 8 pages walked: 372 entities, of which **120
      were unreachable** (99 `session`, 13 `arc`, 5 `lore`, 3 `item`). The fan-out reaches every one.
      Note the measurement itself took three attempts: `?type=<display name>` and `?type=<slug>` both
      answered 0 for every type, and the list endpoint returns its rows under `entities`, not `data` —
      reading the wrong key answered "0 entities" about a campaign holding 372.
- [ ] 4.2 Confirm against the LIVE campaign in a browser that the three real objects appear, that
      `el-traje-de-oro` shows its uploaded image on the card, and that a reload keeps it. Covered by
      the e2e test on a seeded campaign; not yet eyeballed on production data.
      **BLOCKED 2026-08-31 — declared gap, not a skipped check.** There is no way to reach the
      production UI from this environment: the only stored credential is an **API key**
      (`~/.config/aleph-nodejs/config.json`), and the app's page routes are gated **client-side**
      (`server/middleware/01.auth.ts:16` — _"Skip non-API routes (pages are handled by client-side
      middleware)"_), so the key authenticates `/api/*` and nothing else. Measured with headless
      Chromium against
      `/campaigns/4b2adca6-fa7e-47b9-87f9-b0a0e9c6e1e4/diagrams/ef061e4b-05da-4918-bb77-6baf0f02acd2`,
      twice: with **no** header and with `X-API-Key` set as a context-wide `extraHTTPHeaders`. Both
      ended at `https://aleph.ludobermejo.es/login` with `document.title` «Aleph — TTRPG Campaign
      Manager» and a 137-character body reading «Sign In / Enter your credentials…». The API key
      cannot help here by design: `/api/auth/*` is explicitly skipped by the API-key branch, so
      `useSession()` is null and the page middleware redirects.
      **What is still missing is only the RENDER**, and it needs an email+password login that this
      environment does not hold. The API side of 4.2 was already measured in 4.1; re-measuring it
      would not close this task and is not offered as if it did.

## 5. Docs

- [x] 5.1 No CLI surface changes, so `docs/claude-skill.md` and
      `.claude/skills/aleph-cli/SKILL.md` are untouched — state this explicitly in the PR rather than
      leaving it unexamined, since aleph's CLAUDE.md requires the question to be asked.
