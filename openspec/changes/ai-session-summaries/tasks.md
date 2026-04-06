## 1. AI Provider Service

- [x] 1.1 Create `server/utils/ai.ts` with `generateText(prompt: string, systemPrompt: string): Promise<string>` function
- [x] 1.2 Implement Claude provider: POST to `https://api.anthropic.com/v1/messages` with `anthropic-version` header, reading `AI_API_KEY` and `AI_MODEL` from runtime config
- [x] 1.3 Implement OpenAI provider: POST to `https://api.openai.com/v1/chat/completions`, reading same config
- [x] 1.4 Add provider selection logic: read `AI_PROVIDER` from runtime config, dispatch to correct implementation, throw if unconfigured or unknown
- [x] 1.5 Add `isAiConfigured(): boolean` helper that checks whether `AI_PROVIDER` and `AI_API_KEY` are set
- [x] 1.6 Define prompt constants: `SUMMARY_SYSTEM_PROMPT` and `AI_NOTES_SYSTEM_PROMPT` as exported string constants

## 2. Runtime Configuration

- [x] 2.1 Add `ai.provider`, `ai.apiKey`, `ai.model` to `runtimeConfig` (server-only, not public) in `nuxt.config.ts`, reading from `AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL` env vars
- [x] 2.2 Add `AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL` entries to `.env.example` with descriptions (create file if it does not exist, or append if it does)

## 3. Generation Server Endpoint

- [x] 3.1 Create `server/api/campaigns/[id]/sessions/[slug]/generate.post.ts`
- [x] 3.2 Enforce minimum role `editor` (same as content update) via `hasMinRole`
- [x] 3.3 Validate `body.target` is `'summary'` or `'ai_notes'`; return 400 otherwise
- [x] 3.4 Look up session by campaign ID + slug; return 404 if not found
- [x] 3.5 Read `manual_notes` from `sessionContents`; return 400 if empty/null
- [x] 3.6 Check `isAiConfigured()`; return 503 if not configured
- [x] 3.7 Check cooldown: if target content `updatedAt` is within last 60 seconds, return 429
- [x] 3.8 Call `generateText()` with the appropriate prompt (summary or ai_notes) and the manual notes as user content
- [x] 3.9 Upsert the result into `sessionContents` for the target type (reuse the existing upsert pattern from `content/index.put.ts`)
- [x] 3.10 Return `{ target, content }` with status 200

## 4. Frontend: Generate Buttons and Loading State

- [x] 4.1 In `app/pages/campaigns/[id]/sessions/[slug]/index.vue`, add a "Generate Summary" button on the Summary tab and a "Generate AI Notes" button on the AI Notes tab
- [x] 4.2 Buttons are only visible when user role is `dm`, `co_dm`, or `editor`
- [x] 4.3 Buttons are disabled when `contentDraft.manual_notes` is empty, with a tooltip "Write manual notes first"
- [x] 4.4 Add `generating` ref; when true, button shows a spinner and is disabled
- [x] 4.5 On click: if target content already exists, show a confirmation dialog before proceeding
- [x] 4.6 Call `POST /api/campaigns/:id/sessions/:slug/generate` with `{ target }` via `useCampaignApi` or `$fetch`
- [x] 4.7 On success: update `contentDraft[target]` with the returned content, show a success toast
- [x] 4.8 On error: show a destructive toast with user-friendly message based on status code (400, 429, 502, 503)
- [x] 4.9 Handle case where AI is not configured: hide generate buttons entirely (check via an initial lightweight call or catch 503 on first attempt and set a reactive flag)

## 5. CLI: Session Summarize Command

- [x] 5.1 In `cli/src/commands/session.js`, add `summarize` subcommand: `session summarize <slug> --campaign <id> [--type summary|ai_notes] [--force]`
- [x] 5.2 Default `--type` to `summary`
- [x] 5.3 If `--force` is not passed and the session already has content for the target type, prompt for confirmation (use readline, consistent with session-group delete pattern)
- [x] 5.4 Send `POST /api/campaigns/:id/sessions/:slug/generate` with `{ target: type }`
- [x] 5.5 Print the generated content to stdout
- [x] 5.6 Handle error responses: print user-friendly messages for 400, 429, 502, 503 and exit with code 1
- [x] 5.7 Add `post()` helper to `cli/src/lib/client.js` if not already present

## 6. i18n

- [x] 6.1 Add keys to `i18n/locales/en.json`: `sessions.content.generateSummary`, `sessions.content.generateAiNotes`, `sessions.content.generating`, `sessions.content.generateConfirm`, `sessions.content.generateSuccess`, `sessions.content.noManualNotes`, `sessions.content.aiNotConfigured`, `sessions.content.cooldownError`, `sessions.content.generateError`
- [x] 6.2 Add matching keys to `i18n/locales/es.json`

## 7. Skill File Updates

- [x] 7.1 Update `docs/claude-skill.md` -- document `session summarize <slug> --campaign <id> [--type summary|ai_notes] [--force]` command
- [x] 7.2 Update `.claude/skills/aleph-cli/SKILL.md` -- mirror the same command documentation, bump version in frontmatter

## 8. Tests

- [x] 8.1 Unit test (`tests/unit/ai-provider.test.ts`): test `generateText` dispatches to correct provider based on config; test prompt constants are non-empty; test `isAiConfigured` returns false when vars are missing
- [x] 8.2 Unit test (`tests/unit/ai-provider.test.ts`): test error handling -- mock fetch failures produce structured errors; test unknown provider throws
- [x] 8.3 Integration test (`tests/integration/generate-endpoint.test.ts`): POST to generate endpoint with valid auth returns 200 (mock the AI provider response); verify content is saved to DB
- [x] 8.4 Integration test (`tests/integration/generate-endpoint.test.ts`): test 403 for player role, 400 for empty notes, 400 for invalid target, 429 for cooldown, 503 for unconfigured provider
- [x] 8.5 Integration test (`tests/integration/generate-endpoint.test.ts`): test unauthenticated request returns 401
- [x] 8.6 E2E test (`tests/e2e/session-generate.spec.ts`): DM sees generate button on Summary tab; button is disabled when no manual notes; button triggers generation and result appears in content area
- [x] 8.7 E2E test (`tests/e2e/session-generate.spec.ts`): confirmation dialog appears when overwriting existing content

## 9. Verification

- [x] 9.1 Run `npx vitest run tests/unit/` -- all unit tests pass
- [x] 9.2 Run `npx vitest run tests/integration/` -- all integration tests pass (with server running on port 3333)
- [x] 9.3 Run `npx playwright test tests/e2e/session-generate.spec.ts` -- all E2E tests pass
- [x] 9.4 Run `npm run build` -- no build errors (pre-existing quests/index.vue issue fixed)
- [x] 9.5 Run `npm run lint` -- no lint errors
