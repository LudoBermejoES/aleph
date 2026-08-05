## Why

Aleph's auto-link system (`autoLinkContent` in `server/services/autolink-render.ts`) rewrites entity name, alias, and nickname mentions into clickable `:entity-link{}` MDC directives, and is already wired into session content, character content, and generic wiki-entity content (NPCs, items, lore, locations, organizations, quests). It was never wired into the arcs list endpoint (`server/api/campaigns/[id]/arcs/index.get.ts`), which is the only arc-reading endpoint (there is no `arcs/[slug]/index.get.ts`). That endpoint already applies `stripSecretBlocks` to `arc.description` and each `chapter.description`, but never calls `autoLinkContent`. As a result, writing a character's name or nickname inside an arc or chapter description never becomes a link — unlike identical text in a session summary or an entity's content, which does. This is a pre-existing gap, unrelated to (but noticed alongside) the recent nicknames feature, and it should be closed so arc/chapter descriptions behave consistently with every other auto-linked content field.

## What Changes

- Wire `autoLinkContent` into `server/api/campaigns/[id]/arcs/index.get.ts`, applied to `arc.description` and each `chapter.description`, after the existing `stripSecretBlocks` call, using the campaign's `campaignId` and `db` already in scope for that handler.
- Chapters are included in this fix, not deferred: chapter descriptions are returned by the same endpoint, go through the same `stripSecretBlocks`-but-no-`autoLinkContent` gap, and render through the same `<MDC>` pattern on the same arc detail page.
- No new API endpoint, DB column, or CLI-visible field is introduced — this only changes how existing description text already returned by `GET /api/campaigns/[id]/arcs` is rendered before being sent to the client.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `markdown-content`: The "Markdown Rendering with Vue Components" requirement's auto-linking behavior is extended to cover arc and chapter descriptions returned by `GET /api/campaigns/[id]/arcs`, matching the auto-linking already applied to session, character, and wiki-entity content.

## Impact

**Server:**

- `server/api/campaigns/[id]/arcs/index.get.ts` — call `autoLinkContent(content, campaignId, null, db)` for `arc.description` and each `chapter.description` after `stripSecretBlocks`, mirroring the pattern used in the session/character/entity endpoints.
- No schema or migration changes. Arcs and chapters are not mirrored into the `entities` table (unlike quests, which recently gained `entities.id === quests.id` mirror rows); see design.md for how the `currentEntityId` argument is handled without one.

**Frontend:**

- None. `app/pages/campaigns/[id]/arcs/[slug]/index.vue` already renders `arc.description` and `chapter.description` via `<MDC :value="..." />` sourced from this same list endpoint's response — once the endpoint returns auto-linked content, the existing render path picks it up with no template changes.
- There is no separate arc/chapter render or live-preview endpoint (unlike sessions' `render.get.ts`); the arc detail page's `MarkdownEditor` shows raw markdown source while editing and only shows the rendered `<MDC>` view when not editing, sourced from the list endpoint. This change is purely a read/display-path fix; no preview-while-editing flow is affected.

**CLI (`cli/`):**

- None required. This change does not add or modify a server API endpoint, auth flow, or data model — it only changes how text already returned by the existing `GET /api/campaigns/[id]/arcs` endpoint is rendered. `cli/src/commands/arc.js` and `cli/src/commands/chapter.js` already pass `description` through unchanged (raw markdown in, same field out) and require no updates. `docs/claude-skill.md` and `.claude/skills/aleph-cli/SKILL.md` are unaffected for the same reason.
