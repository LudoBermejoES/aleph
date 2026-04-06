## Why

Session note-taking is the most time-consuming bookkeeping task for TTRPG game masters. After a 3-4 hour session, the DM still has to write a recap, extract key decisions, and catalogue which NPCs and locations appeared. Competing tools (LoreKeeper AI, Archivist AI) already offer AI-powered summaries and structured extraction, making this the most-requested feature category in 2025-2026 TTRPG tooling.

Aleph already has the data model for this: `session_contents` stores `manual_notes`, `ai_notes`, and `summary` as distinct content types, the session detail page has tabs for all three, and the CLI supports `content get` / `content set`. What is missing is any actual AI integration to generate that content.

Adding server-side AI generation closes the gap: the DM writes (or pastes) raw session notes, clicks a button, and gets a polished summary and structured AI notes without leaving the app.

## What Changes

1. **AI provider abstraction layer** (new) -- A server-side service that supports Claude API and OpenAI API, selectable via environment variable. API keys are stored as env vars, never exposed to the frontend.

2. **Summary generation endpoint** (new) -- `POST /api/campaigns/:id/sessions/:slug/generate` accepts a `target` parameter (`summary` or `ai_notes`), reads `manual_notes` from the database, sends them to the configured AI provider with a tailored prompt, and saves the result as the corresponding content type.

3. **Frontend "Generate" buttons** (modified) -- The session detail page gains "Generate Summary" and "Generate AI Notes" buttons on their respective tabs. Buttons show a loading/streaming state and are disabled when no manual notes exist.

4. **CLI `session summarize` command** (new) -- `aleph session summarize <slug> --campaign <id> [--type summary|ai_notes]` triggers server-side generation and prints the result.

5. **Configuration** -- `AI_PROVIDER` (claude | openai), `AI_API_KEY`, `AI_MODEL` env vars. Rate limiting to prevent runaway API costs.

## Capabilities

### New Capabilities

- `ai-summary-generation`: Generate a narrative session summary from manual notes using Claude or OpenAI.
- `ai-notes-extraction`: Extract structured AI notes (key decisions, NPCs mentioned, locations visited) from manual notes.
- `ai-provider-service`: Pluggable server-side AI provider abstraction supporting Claude and OpenAI APIs.

### Modified Capabilities

- `session-detail-ui`: Session detail page gains generate buttons with loading states on the AI Notes and Summary tabs.
- `cli-session-management`: New `session summarize` subcommand for triggering AI generation from the terminal.

## Impact

- `server/utils/ai.ts` (new) -- AI provider abstraction: prompt construction, API calls, response parsing
- `server/api/campaigns/[id]/sessions/[slug]/generate.post.ts` (new) -- Generation endpoint
- `app/pages/campaigns/[id]/sessions/[slug]/index.vue` -- Add generate buttons, loading states, error handling
- `cli/src/commands/session.js` -- Add `summarize` subcommand
- `cli/src/lib/client.js` -- Add `post()` helper if not present (generation uses POST)
- `nuxt.config.ts` -- Add `AI_PROVIDER`, `AI_MODEL` to runtime config
- `i18n/locales/en.json` + `i18n/locales/es.json` -- New keys for generate buttons, loading text, error messages, confirmation dialogs
- `docs/claude-skill.md` + `.claude/skills/aleph-cli/SKILL.md` -- Document `session summarize` command
- `tests/unit/` -- AI provider service tests (prompt construction, provider selection, error handling)
- `tests/integration/` -- Generation endpoint tests (auth, validation, content saving)
- `tests/e2e/` -- Generate button visibility, loading state, result display
