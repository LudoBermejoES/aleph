# ai-summaries Specification

## Purpose

Generate a narrative session summary and structured AI notes (key decisions, NPCs, locations, plot hooks) from a session's manual notes, using Claude or OpenAI selected through server-side environment variables that are never exposed to the frontend. Generation is reachable from the session detail page and from the `session summarize` CLI command.

## Requirements

### Requirement: Generate session summary from manual notes

The system SHALL allow a DM or co-DM to generate an AI-written narrative summary from a session's manual notes. The result is saved as the `summary` content type for that session.

#### Scenario: DM generates a summary successfully

GIVEN the user has the `dm` role in the campaign
AND the session has `manual_notes` content with text
AND the AI provider is configured (`AI_PROVIDER` and `AI_API_KEY` env vars are set)
WHEN they send `POST /api/campaigns/:id/sessions/:slug/generate` with `{ "target": "summary" }`
THEN the server reads the session's `manual_notes`
AND sends them to the configured AI provider with the summary prompt
AND saves the AI response as the `summary` content type
AND returns `{ "target": "summary", "content": "<generated text>" }` with status 200

#### Scenario: DM generates a summary when one already exists

GIVEN the session already has `summary` content
WHEN the DM sends `POST /api/campaigns/:id/sessions/:slug/generate` with `{ "target": "summary" }`
THEN the existing summary is overwritten with the new AI-generated text
AND the `updatedAt` timestamp is refreshed

#### Scenario: Generation fails because manual notes are empty

GIVEN the session has no `manual_notes` content (null or empty string)
WHEN the user sends `POST /api/campaigns/:id/sessions/:slug/generate` with `{ "target": "summary" }`
THEN the server returns 400 with message "No manual notes available to generate from"

#### Scenario: Generation fails because AI provider is not configured

GIVEN `AI_PROVIDER` env var is not set
WHEN the user sends `POST /api/campaigns/:id/sessions/:slug/generate`
THEN the server returns 503 with message "AI generation is not configured"

#### Scenario: Generation is rate-limited by cooldown

GIVEN the `summary` content for this session was updated within the last 60 seconds
WHEN the user sends `POST /api/campaigns/:id/sessions/:slug/generate` with `{ "target": "summary" }`
THEN the server returns 429 with message "Please wait before generating again"

#### Scenario: Player cannot trigger generation

GIVEN the user has the `player` role in the campaign
WHEN they send `POST /api/campaigns/:id/sessions/:slug/generate`
THEN the server returns 403

#### Scenario: Unauthenticated request is rejected

GIVEN the request has no valid session cookie or `X-API-Key` header
WHEN they send `POST /api/campaigns/:id/sessions/:slug/generate`
THEN the server returns 401

### Requirement: Generate AI notes from manual notes

The system SHALL allow a DM or co-DM to generate structured AI notes (key decisions, NPCs, locations, plot hooks) from a session's manual notes. The result is saved as the `ai_notes` content type.

#### Scenario: DM generates AI notes successfully

GIVEN the user has the `dm` role in the campaign
AND the session has `manual_notes` content with text
AND the AI provider is configured
WHEN they send `POST /api/campaigns/:id/sessions/:slug/generate` with `{ "target": "ai_notes" }`
THEN the server reads the session's `manual_notes`
AND sends them to the configured AI provider with the structured extraction prompt
AND saves the AI response as the `ai_notes` content type
AND returns `{ "target": "ai_notes", "content": "<generated text>" }` with status 200

#### Scenario: AI notes generation extracts structured sections

GIVEN the session has manual notes mentioning NPCs, locations, and decisions
WHEN AI notes are generated
THEN the result contains markdown headings for: Key Decisions, NPCs, Locations, Plot Hooks

#### Scenario: Invalid target type is rejected

GIVEN the user sends `POST /api/campaigns/:id/sessions/:slug/generate` with `{ "target": "manual_notes" }`
THEN the server returns 400 with message "Target must be 'summary' or 'ai_notes'"

### Requirement: AI provider is configurable via environment variables

The server SHALL support Claude and OpenAI as AI providers, configured via `AI_PROVIDER`, `AI_API_KEY`, and `AI_MODEL` environment variables. These values are never exposed to the frontend.

#### Scenario: Claude provider is configured

GIVEN `AI_PROVIDER=claude` and `AI_API_KEY` is set
WHEN a generation request is made
THEN the server calls the Anthropic Messages API with the configured model

#### Scenario: OpenAI provider is configured

GIVEN `AI_PROVIDER=openai` and `AI_API_KEY` is set
WHEN a generation request is made
THEN the server calls the OpenAI Chat Completions API with the configured model

#### Scenario: Default model is used when AI_MODEL is not set

GIVEN `AI_PROVIDER=claude` and `AI_MODEL` is not set
WHEN a generation request is made
THEN the server uses `claude-sonnet-4-20250514` as the model

GIVEN `AI_PROVIDER=openai` and `AI_MODEL` is not set
WHEN a generation request is made
THEN the server uses `gpt-4o` as the model

#### Scenario: Invalid provider name is treated as unconfigured

GIVEN `AI_PROVIDER=gemini`
WHEN a generation request is made
THEN the server returns 503 with message "AI generation is not configured"

### Requirement: Frontend shows generate buttons with loading states

The session detail page SHALL show "Generate Summary" and "Generate AI Notes" buttons on their respective content tabs. Buttons are disabled when manual notes are empty or when the AI provider is not configured.

#### Scenario: Generate button is visible on the Summary tab

GIVEN the user is viewing a session detail page
AND the user has the `dm` or `co_dm` role
WHEN they select the Summary tab
THEN a "Generate Summary" button is visible

#### Scenario: Generate button is disabled when no manual notes exist

GIVEN the session has no manual notes
WHEN the DM views the Summary tab
THEN the "Generate Summary" button is disabled
AND a tooltip or hint explains "Write manual notes first"

#### Scenario: Loading state during generation

GIVEN the DM clicks "Generate Summary"
WHEN the request is in progress
THEN the button shows a loading spinner
AND the button is disabled to prevent double-clicks

#### Scenario: Confirmation dialog when overwriting existing content

GIVEN the Summary tab already has content
WHEN the DM clicks "Generate Summary"
THEN a confirmation dialog appears: "This will replace the existing summary. Continue?"
AND generation only proceeds if the user confirms

#### Scenario: Error is shown as toast on failure

GIVEN the AI generation request fails (503, 429, 502, etc.)
WHEN the error response is received
THEN a destructive toast is shown with a user-friendly message
AND the existing content is not modified

#### Scenario: Generate buttons are hidden for players

GIVEN the user has the `player` role
WHEN they view the session detail page
THEN no "Generate" buttons are visible on any content tab

### Requirement: CLI session summarize command

The CLI SHALL provide a `session summarize` subcommand that triggers server-side AI generation and outputs the result.

#### Scenario: Summarize via CLI

GIVEN the user runs `aleph session summarize <slug> --campaign <id>`
WHEN the command executes
THEN it sends `POST /api/campaigns/:id/sessions/:slug/generate` with `{ "target": "summary" }`
AND prints the generated summary to stdout

#### Scenario: Generate AI notes via CLI

GIVEN the user runs `aleph session summarize <slug> --campaign <id> --type ai_notes`
WHEN the command executes
THEN it sends the generate request with `{ "target": "ai_notes" }`
AND prints the generated AI notes to stdout

#### Scenario: CLI default type is summary

GIVEN the user runs `aleph session summarize <slug> --campaign <id>` without `--type`
WHEN the command executes
THEN `target` defaults to `summary`

#### Scenario: CLI shows error when AI is not configured

GIVEN the server has no AI provider configured
WHEN the user runs `aleph session summarize <slug> --campaign <id>`
THEN the CLI prints an error message: "AI generation is not configured on the server"
AND exits with code 1

#### Scenario: CLI --force flag skips confirmation

GIVEN the session already has summary content
WHEN the user runs `aleph session summarize <slug> --campaign <id> --force`
THEN no confirmation prompt is shown
AND the existing content is overwritten
