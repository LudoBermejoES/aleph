## Context

Aleph entities have `imageUrl` in the entities table, and characters have `portraitUrl` in the characters table. Both have dedicated image upload endpoints that accept multipart form data, validate MIME types and size, write files to the campaign's content directory, and update the DB record with the resulting URL.

Organizations live in a separate `organizations` table with no image column. The `factionCard` tldraw shape already renders a `crestUrl` prop (image with letter fallback), but it's never populated.

## Goals / Non-Goals

**Goals:**

- Organizations can have images stored and displayed
- Same upload UX pattern as entity images (multipart, MIME validation, size limits)
- Org images appear in diagrams (factionCard crestUrl), entity panel, and graph API
- CLI can upload org images
- Existing Arcadia org images can be bulk-uploaded

**Non-Goals:**

- Image cropping or resizing (same as entity images — uploaded as-is)
- Multiple images per org (single imageUrl, same as entities)
- Organization gallery/media management UI

## Decisions

### Decision 1: Mirror entity image upload pattern exactly

**Chosen:** The org image endpoint at `POST /api/campaigns/:id/organizations/:slug/image` uses the same validation (PNG/JPEG/WEBP, 10MB max, magic byte detection), directory structure (`content/campaigns/<slug>/organizations/<orgSlug>/image.ext`), and response format (`{ imageUrl }`) as the entity image endpoint.

**Why:** Consistency. One pattern to understand, one set of tests to maintain.

### Decision 2: imageUrl stored on organizations table, not as entity

**Chosen:** Add `imageUrl` column directly to the organizations table via ALTER TABLE migration.

**Alternative considered:** Making organizations into entities (adding entity rows for orgs). Rejected — too invasive, would change org IDs across the system and break existing org-member/org-location relationships.

### Decision 3: Image URL is the served path, not the file path

**Chosen:** Store `/api/campaigns/:id/organizations/:slug/image` as the imageUrl (like entity images), served by a corresponding GET endpoint.

**Why:** URLs are portable across server moves. File paths are implementation details.

### Decision 4: Add image.get.ts for serving org images

**Chosen:** Create `GET /api/campaigns/:id/organizations/:slug/image` that reads from the content directory and serves with appropriate Content-Type. Same pattern as entity image GET.

### Decision 5: buildFactionCardShape accepts optional imageUrl

**Chosen:** Extend the `org` parameter type to include `imageUrl?: string | null`. If present, set `crestUrl` in the shape props. Both server-side (`diagram-helpers.ts`) and client-side (`diagram-shapes.ts`) builders updated.

## Risks / Trade-offs

- **Migration on production DB** → ALTER TABLE ADD COLUMN on SQLite is safe and instant (no table rebuild needed for nullable column).
- **Storage growth** → Org images add disk usage. Mitigated by same 10MB limit as entity images, and orgs are far fewer than entities.
- **Cache invalidation** → Uploading a new image overwrites the old file. Browsers may cache the old image. Mitigated by tldraw re-fetching on diagram load.
