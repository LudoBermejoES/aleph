## Context

Aleph sessions are stored in `gameSessions` with a single `logFilePath` field for notes. The schema already has `arcs` and `chapters` for narrative structure, but no concept of separate player groups within a campaign. DMs running parallel groups need group-scoped session lists, and each session needs three distinct content slots (manual notes, AI notes, summary) rather than one file.

## Goals / Non-Goals

**Goals:**

- Add `session_groups` as a first-class campaign entity (name, description, sort order)
- Link sessions to groups optionally — sessions without a group are campaign-wide
- Replace `logFilePath` with a `session_contents` table supporting three content types
- Filter session list by group in the UI
- Show content as tabs on session detail
- Expose groups and content via API and CLI

**Non-Goals:**

- Access control per group (all campaign members see all groups)
- Moving arcs/chapters into groups (they remain campaign-wide)
- Real-time collaborative editing of session content (future)

## Decisions

### 1. `session_groups` table (new)

```sql
CREATE TABLE session_groups (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
)
```

Slug auto-generated from name. UNIQUE constraint on `(campaign_id, slug)`. `image_url` stores the relative API path (e.g. `/api/campaigns/:id/session-groups/:slug/image`); the image file is stored on disk at `content/campaigns/{slug}/session-groups/{groupSlug}/image.{ext}`.

### 2. `groupId` added to `gameSessions` (nullable)

```sql
ALTER TABLE game_sessions ADD COLUMN group_id TEXT REFERENCES session_groups(id) ON DELETE SET NULL
```

Sessions without a group appear in all group views (or in a "general" bucket).

### 3. `session_contents` table (new, replaces `logFilePath`)

```sql
CREATE TABLE session_contents (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  type TEXT NOT NULL,  -- 'manual_notes' | 'ai_notes' | 'summary'
  content TEXT,        -- markdown text stored inline
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(session_id, type)
)
```

Content stored as inline markdown (not file path). The old `logFilePath` column is kept for migration compatibility but ignored going forward. UNIQUE on `(session_id, type)` — one record per type per session, upserted.

### 4. API routes

**Session groups CRUD:**

- `GET /api/campaigns/:id/session-groups` — list all groups
- `POST /api/campaigns/:id/session-groups` — create group (editor+)
- `PUT /api/campaigns/:id/session-groups/:slug` — update (editor+)
- `DELETE /api/campaigns/:id/session-groups/:slug` — delete (dm/co_dm only)

**Session content:**

- `GET /api/campaigns/:id/sessions/:slug/content` — returns `{ manual_notes, ai_notes, summary }` object
- `PUT /api/campaigns/:id/sessions/:slug/content` — body `{ type, content }` — upserts one content record (editor+)

**Session list filter:**

- `GET /api/campaigns/:id/sessions?groupId=<slug>` — filter by group slug

**Session create/update:**

- `POST /api/campaigns/:id/sessions` accepts optional `groupId` (slug resolved to id)
- `PUT /api/campaigns/:id/sessions/:slug` accepts optional `groupId`

### 5. UI — Session list

A group filter bar appears above the session list when groups exist:

- "All" tab (default) — shows sessions from all groups
- One tab per group — shows only sessions in that group
- Sessions without a group always appear in "All"

### 6. UI — Session detail

Content displayed as tabs: **Manual Notes** | **AI Notes** | **Summary**. Each tab shows a markdown editor (edit mode) or rendered markdown (view mode). Empty tabs show a placeholder with an upload/write prompt.

### 7. UI — Session create/edit

A group selector dropdown is added to the session form. Defaults to none (no group).

### 8. Migration

New migration file:

1. Creates `session_groups` table
2. Creates `session_contents` table
3. `ALTER TABLE game_sessions ADD COLUMN group_id TEXT`

The old `logFilePath` data is left in place and not migrated (existing notes remain accessible via the old file path until a future cleanup task).

### 9. CLI

New `session-group` command:

```
aleph session-group list --campaign <id>
aleph session-group create --campaign <id> --name <name> [--description <desc>]
aleph session-group delete <slug> --campaign <id> [--yes]
```

Updated `session create` and `session show` to accept/display `--group <slug>`.
