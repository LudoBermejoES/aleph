## Context

`PUT /api/campaigns/[id]/characters/[slug]` accepts `name`, `race`, `class`, `alignment`, `status`, `content`, `aliases`, `tags`, `visibility`. It applies only the fields present in the body. The CLI `put()` helper in `client.js` sends JSON.

## Goals / Non-Goals

**Goals:** Expose all editable character fields via CLI flags. Support piping markdown content via `--stdin` (same pattern as `entity edit`).

**Non-Goals:** Editing stats, abilities, connections, or folders (separate concerns).

## Decisions

**Reuse `put()` from client.js** — no new HTTP infrastructure needed. Build the body object from only the flags the user actually provided (omit undefined fields).

**`--stdin` for content** — reads `process.stdin` as UTF-8, same as `entity edit --stdin`. Mutually exclusive with `--content`.

**At least one field required** — if no flags provided, print usage and exit 1.

## Risks / Trade-offs

[Low] Sending `content: ""` would wipe the content. Mitigated by only including fields explicitly passed by the user.
