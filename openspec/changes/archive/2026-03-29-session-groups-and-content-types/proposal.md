## Why

A campaign in Aleph can run multiple independent player groups simultaneously (e.g. "La Familia", "La Fuerza Oculta", "Genesis") — each with their own session history and content. Currently all sessions belong to the same flat list with no way to distinguish which group they belong to. Additionally, DMs produce multiple types of session content (manual notes, AI-generated notes, and post-session summaries) but the schema only supports a single log file per session, making it impossible to store and present all three content types distinctly.

## What Changes

- **Add `session_groups` table**: A new entity scoped to a campaign, with name, optional description, and optional image. Each group represents an independent player group running within the same campaign.
- **Add `groupId` to `gameSessions`**: Sessions are optionally assigned to a group. Sessions without a group remain visible in the global list.
- **Add `session_contents` table**: Replaces the single `logFilePath` on `gameSessions`. Each content record has a `type` (`manual_notes`, `ai_notes`, `summary`) and stores content as markdown (file path or inline text). A session can have one record per type.
- **Session list and detail UI**: Filter sessions by group; show content tabs (Manual Notes / AI Notes / Summary) on the session detail page.
- **Session create/edit UI**: Allow selecting a group and editing each content type independently.
- **CLI**: New `session-group` commands; `session show` and `session create` updated to accept group.

## Capabilities

### New Capabilities
- `session-groups`: Campaign-scoped player groups that sessions can be assigned to
- `session-content-types`: Per-session typed content slots (manual notes, AI notes, summary)

### Modified Capabilities
- `session-management`: Sessions now have an optional group and multiple content types instead of a single log file

## Impact

- **`server/db/schema/sessions.ts`** — Add `sessionGroups` table; add `groupId` to `gameSessions`; add `sessionContents` table
- **`server/db/migrations/`** — New migration file
- **`server/api/campaigns/[id]/session-groups/`** — New CRUD routes including image upload endpoint
- **`server/api/campaigns/[id]/sessions/[slug]/content/`** — New routes for reading/writing typed content
- **`server/api/campaigns/[id]/sessions/index.get.ts`** — Support `?groupId=` filter
- **`server/api/campaigns/[id]/sessions/[slug]/index.get.ts`** — Include content types in response
- **`app/pages/campaigns/[id]/sessions/index.vue`** — Group filter UI
- **`app/pages/campaigns/[id]/sessions/[slug]/index.vue`** — Tabbed content display
- **`app/pages/campaigns/[id]/sessions/new.vue`** and **`edit.vue`** — Group selector + per-type content editors
- **`cli/src/commands/session.js`** — Add group support
- **`cli/`** — New `session-group` command file
- **`i18n/locales/en.json` and `es.json`** — New i18n keys
- **aleph-cli**: Affected — new session-group commands; session create/show updated
