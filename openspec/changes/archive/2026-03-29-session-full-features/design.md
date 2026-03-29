## Context

The Aleph session system has a fully implemented backend covering: session metadata, content (manual_notes/ai_notes/summary), attendance (rsvpStatus + attended boolean), decisions + consequences (with DM-only reveal), and dice roll history. The frontend only exposes a subset: content editing and a read-only decisions timeline. The CLI exposes even less: list, create, show, delete — no content, attendance, or update commands.

No schema or API changes are required. All features use existing endpoints.

## Goals / Non-Goals

**Goals:**
- Expose decisions/consequences CRUD in the session detail page (DMs can create, add consequences, reveal them)
- Add attendance RSVP section to session detail page (any user can set own RSVP; DMs mark actual attendance)
- Add session rolls viewer to session detail page (read-only, last 50 rolls from the session)
- Add arc/chapter pickers to SessionForm so DMs can link sessions to story arcs
- CLI `session update` subcommand to update metadata (title, date, status, group)
- CLI `session content` subcommand: get all content, set individual type from file or stdin
- CLI `session attendance` subcommand: set own RSVP status
- CLI `session-group update` subcommand
- Update both skill files (docs/claude-skill.md, .claude/skills/aleph-cli/SKILL.md)

**Non-Goals:**
- No new API endpoints or DB schema changes
- No bulk attendance management (setting others' attendance from UI — DM can only see, not set it for others)
- No consequence entity linking UI (entityId field exists but not exposed)
- No arc/chapter management pages (separate feature)

## Decisions

**Decision 1: Decisions section — inline forms vs. modals**
Use inline expandable forms within the decisions section rather than modals. The session detail page already has many sections; modals add z-index complexity. Inline forms collapse after save.

**Decision 2: Attendance display — minimal vs. rich**
Show compact row per attendee: avatar/name, RSVP dot, attended checkbox (DM only), character name if set. No separate attendance management page — it lives entirely in the session detail.

**Decision 3: Rolls viewer — lazy-loaded**
Rolls section renders only when expanded (accordion). Rolls can be empty for older sessions. No pagination needed — API already limits to last 50.

**Decision 4: CLI content — file vs. stdin**
`session content set` accepts `--file <path>` or reads from stdin (piped). This allows: `echo "notes" | aleph session content set slug --type manual_notes --campaign id` or `aleph session content set slug --type ai_notes --file notes.md --campaign id`.

**Decision 5: Arc/chapter pickers — conditional**
Arc picker only shown if campaign has arcs. Chapter picker shown only if an arc is selected. Uses `$fetch` in SessionForm component (same pattern as group picker already there).

## Risks / Trade-offs

- [Risk] Decisions section adds visual weight to session detail page → Mitigation: put decisions in a collapsible section
- [Risk] Rolls fetch adds a network request on session load → Mitigation: lazy-load when section is expanded
- [Risk] CLI `session content set --file` needs fs.readFileSync → Mitigation: standard Node.js, already used in import script

## Migration Plan

No migrations required. Pure UI/CLI additions.

Deploy: push to master → CI/CD auto-deploys. CLI changes require users to pull latest from npm (or local path).
