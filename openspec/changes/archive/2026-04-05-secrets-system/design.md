# Design: Secrets System

## Decision 1: Extend SecretBlock syntax vs. new visibility system

**Decision:** Extend the existing `:::secret{.role}` MDC syntax with an optional `#id` attribute rather than building a separate per-section visibility system.

**Rationale:**

- The SecretBlock extension already handles the parsing, stripping, and Tiptap integration. Adding an ID attribute is a minimal change to a working system.
- A new per-section visibility system would require rethinking how markdown content maps to visibility rules, introducing section boundaries, and creating a parallel stripping pipeline. This is significantly more complex for marginal benefit.
- The `id` attribute enables targeted reveal/unreveal without changing the content model. The markdown source stays clean: `:::secret{.dm #ambush-plan}`.
- Backward compatible: blocks without `#id` continue to work as today (always stripped for insufficient roles, never individually revealable).

**Syntax extension:**

```markdown
:::secret{.dm #ambush-plan}
The goblins are hiding behind the waterfall.
:::

:::secret{.player:alice #alice-vision}
You notice something glinting in the dark.
:::
```

The `id` is scoped to the entity -- it does not need to be globally unique. The `secret_reveals` table references `(entity_id, secret_block_id)`.

## Decision 2: Preview mode -- role switcher vs. separate route

**Decision:** Role switcher on the same page via a query parameter (`?preview_as=player`), not a separate route.

**Rationale:**

- A separate route (e.g., `/preview/entity-slug`) would duplicate page components and require maintaining two rendering paths.
- A query parameter keeps the DM on the same URL, preserves navigation context, and is trivial to toggle on/off. The entity view page reads `preview_as` from the query and passes it to the render endpoint.
- The server render endpoint accepts an optional `preview_as` parameter. When present and the requesting user is DM/Co-DM, it overrides the effective role for content stripping only. Edit buttons, admin panels, and other DM UI remain visible (dimmed/disabled) so the DM retains context.
- Security: the server MUST verify the requesting user actually has DM/Co-DM role before honoring `preview_as`. A player sending `?preview_as=dm` gets their own role's view, not elevated access.

**UI component:**

- A dropdown/toggle in the entity view header: "Viewing as: DM | Co-DM | Editor | Player | Visitor"
- Only visible to DM/Co-DM users
- Selecting a role adds `?preview_as=role` to the URL and re-fetches the rendered content
- A colored banner indicates preview mode is active ("You are previewing as Player")

## Decision 3: Progressive reveal via WebSocket

**Decision:** Reveal state is persisted in a `secret_reveals` table and broadcast via the existing CrossWS campaign channel.

**Rationale:**

- Ephemeral-only reveal (WS broadcast without persistence) would mean players who join late or refresh the page miss reveals. Persisting to DB ensures consistency.
- The existing `emitCampaignMessage(campaignId, payload)` function broadcasts to all connected campaign members. Adding `secret:reveal` and `secret:unreveal` message types requires no infrastructure changes.
- The reveal API is DM/Co-DM only. The flow:
  1. DM calls `POST /api/campaigns/:id/entities/:slug/secrets` with `{ blockId: "ambush-plan" }`
  2. Server inserts into `secret_reveals`, returns success
  3. Server broadcasts `{ type: "secret:reveal", entitySlug, blockId }` to campaign WS
  4. Connected clients re-render the entity content with the block now visible
  5. Clients not currently viewing the entity ignore the message

**Unreveal:** DM can also unreveal (retract) a secret via `DELETE /api/campaigns/:id/entities/:slug/secrets/:blockId`. This removes the row from `secret_reveals` and broadcasts `secret:unreveal`. Useful when a DM reveals something prematurely.

## Decision 4: Entity-level secret notes storage

**Decision:** Separate `entity_secret_notes` table rather than a frontmatter field or inline content.

**Rationale:**

- Storing secret notes in entity frontmatter would mean they travel with the markdown file and could leak if file access is not carefully controlled. A separate table keeps them out of the content pipeline entirely.
- Storing them inline (like another secret block) would make them subject to the same stripping logic and create confusion about whether they are "content" or "metadata."
- A dedicated table with `(entity_id, content, updated_by, updated_at)` is simple, queryable, and clearly separated from the entity content.
- The API only returns secret notes to DM/Co-DM users. The field is never included in player-facing responses.

## Technical Details

### Schema additions

```sql
-- Tracks which secret blocks have been revealed
CREATE TABLE secret_reveals (
  id TEXT PRIMARY KEY,
  entity_id TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  secret_block_id TEXT NOT NULL,  -- matches the #id in :::secret{.role #id}
  revealed_by TEXT NOT NULL REFERENCES user(id),
  revealed_at INTEGER NOT NULL,   -- timestamp
  UNIQUE(entity_id, secret_block_id)
);

-- DM-only notes attached to an entity
CREATE TABLE entity_secret_notes (
  id TEXT PRIMARY KEY,
  entity_id TEXT NOT NULL UNIQUE REFERENCES entities(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  updated_by TEXT NOT NULL REFERENCES user(id),
  updated_at INTEGER NOT NULL
);
```

### Updated stripSecretBlocks flow

```
stripSecretBlocks(content, userRole, revealedBlockIds?)
  1. If user is co_dm+, return content unchanged (as today)
  2. For each :::secret{.spec #id} block:
     a. If id is in revealedBlockIds set, keep the block (strip the secret wrapper, show content as normal text)
     b. Else apply existing role-based stripping logic
  3. For blocks without #id, apply existing logic unchanged
```

### API endpoints

| Method | Path                                                 | Auth     | Description                     |
| ------ | ---------------------------------------------------- | -------- | ------------------------------- |
| POST   | `/api/campaigns/:id/entities/:slug/secrets`          | DM/Co-DM | Reveal a secret block           |
| DELETE | `/api/campaigns/:id/entities/:slug/secrets/:blockId` | DM/Co-DM | Unreveal a secret block         |
| GET    | `/api/campaigns/:id/entities/:slug/secrets`          | DM/Co-DM | List revealed blocks for entity |
| GET    | `/api/campaigns/:id/entities/:slug/secret-notes`     | DM/Co-DM | Get secret notes                |
| PUT    | `/api/campaigns/:id/entities/:slug/secret-notes`     | DM/Co-DM | Update secret notes             |

### WebSocket messages

```json
{ "type": "secret:reveal", "entitySlug": "dragon-lair", "blockId": "ambush-plan", "revealedBy": "user-id" }
{ "type": "secret:unreveal", "entitySlug": "dragon-lair", "blockId": "ambush-plan" }
```
