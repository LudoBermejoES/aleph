## 1. Script Scaffolding

- [x] 1.1 Create `cli/bin/import-arcadia.js` — standalone entry point that loads config from `~/.aleph/config.json`, exits with error if not configured, then runs the importer
- [x] 1.2 Create `cli/src/commands/import-arcadia.js` — main importer module with helper functions: `apiGet`, `apiPost`, `apiPut`, `stripFrontmatter`, `parseDateFromFilename`, `readMarkdown`

## 2. Campaign Data Definitions

- [x] 2.1 Define the 6 campaigns as a static data array in the script: `la-familia` (La Familia, ~2010-2026), `genesis` (Génesis, 2013-2014), `la-fuerza-oculta` (La Fuerza Oculta, Feb 2024-present), `aun-sin-nombre` (Reformatorio Nueva Esperanza, Oct 2025), `crematorio-la-tranquilidad` (Crematorio La Tranquilidad, Oct 2025), `hospital` (Hospital)
- [x] 2.2 Define session group data for La Fuerza Oculta: "Los Fugitivos" (Jun 2025), "Profesionalización Heroica" (Jul 2025), "Independencia Heroica" (Aug 2025), "Operaciones Especializadas" (Sep-Oct 2025), "La Gran Crisis" (Nov-Dec 2025), "Nuevos Horizontes" (Jan-Mar 2026)
- [x] 2.3 Define the date-to-group mapping for La Fuerza Oculta sessions (map date ranges to group slugs)

## 3. Campaign Import Logic

- [x] 3.1 Implement `ensureCampaign(name, description)` — GET existing campaigns, find by name, create if missing, return campaign ID
- [x] 3.2 Implement `ensureSessionGroup(campaignId, name)` — GET existing groups, find by slug, create if missing, return group slug
- [x] 3.3 Wire up: for each campaign definition, call `ensureCampaign`, then for La Fuerza Oculta call `ensureSessionGroup` for each narrative phase

## 4. Session File Discovery and Parsing

- [x] 4.1 Implement `discoverSessions(campaignDir, pattern)` — scan campaign directory for session files matching glob patterns per campaign:
  - La Familia: `session-*.md` (exclude `index.md`, `summary`)
  - La Fuerza Oculta: `manual-notes/session-*.md`
  - Génesis, Hospital: `session-*.md`
  - Aun-sin-nombre: derive sessions from `ai-notes/` filenames (no manual session files)
  - Crematorio: `sessions/index.md` as single session
- [x] 4.2 Implement `parseDateFromFilename(filename)` — extract `YYYY-MM-DD` from filenames like `session-20-2025-06-15.md` or `2025-10-26-gemini-notes.md`; return null if no date found
- [x] 4.3 Implement `parseTitleFromFrontmatter(content)` — parse YAML front-matter `title` field; strip campaign prefix (e.g., `"La Familia - Sesión 01"` → `"Sesión 01"`)
- [x] 4.4 Implement `stripFrontmatter(content)` — remove `---...---` YAML block from top of file; return remaining markdown

## 5. Session Import Logic

- [x] 5.1 Implement `ensureSession(campaignId, title, date, groupSlug)` — POST to create session with `status: "completed"`; catch duplicate slug errors and skip gracefully; return session slug
- [x] 5.2 Implement `importSessionContent(campaignId, sessionSlug, manualNotes, aiNotes, summary)` — PUT each non-null content type to `/api/campaigns/:id/sessions/:slug/content`
- [x] 5.3 Implement `findMatchingNotes(dateStr, notesDir)` — given a date string, find the ai-notes file and ai-notes-summary file in the campaign's notes directories by matching the date substring in filenames

## 6. Per-Campaign Import Wiring

- [x] 6.1 La Familia: iterate `session-01.md` → `session-44.md`, parse title+date, import session + manual_notes content
- [x] 6.2 Génesis: iterate `session-01.md` → `session-06.md`, parse title, import session + manual_notes
- [x] 6.3 Hospital: iterate `session-01.md` → `session-02.md`, parse title, import session + manual_notes
- [x] 6.4 La Fuerza Oculta: iterate `manual-notes/session-*.md`, parse title+date, map date to group, import session + manual_notes + ai_notes + summary
- [x] 6.5 Reformatorio Nueva Esperanza (aun-sin-nombre): derive sessions from `ai-notes/` date filenames (9 sessions), import session + ai_notes + summary
- [x] 6.6 Crematorio La Tranquilidad: import 1 session from `sessions/index.md` title + ai_notes from `ai-notes/2025-10-25-Session-1.md`

## 7. Verification

- [ ] 7.1 Run the script against the local Aleph server (`node cli/bin/import-arcadia.js`) and confirm all campaigns are created
- [ ] 7.2 Verify session counts: La Familia ~45, La Fuerza Oculta ~53, Génesis 6, Hospital 2, Reformatorio 9, Crematorio 1
- [ ] 7.3 Verify session content is visible in the Aleph UI (check one session per campaign)
- [ ] 7.4 Run script a second time and confirm it is fully idempotent (no duplicates, no errors)
