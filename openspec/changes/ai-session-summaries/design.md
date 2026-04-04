## Context

Aleph's session system already stores three content types per session (`manual_notes`, `ai_notes`, `summary`) and the UI has tabs for each. The infrastructure for reading and writing content exists at both the API and CLI level. This change adds server-side AI generation to fill the `ai_notes` and `summary` slots from `manual_notes` input.

The AI call is server-side only. The frontend never sees or handles API keys. The user triggers generation via a button (web) or command (CLI), the server calls the configured AI provider, and the result is saved through the existing `sessionContents` table.

## Goals / Non-Goals

**Goals:**
- DM can generate a narrative summary from manual session notes with one click
- DM can generate structured AI notes (decisions, NPCs, locations) from manual notes with one click
- AI provider is configurable (Claude or OpenAI) via environment variables
- API keys are never exposed to the frontend
- Generation is rate-limited to prevent runaway costs
- CLI users can trigger generation from the terminal
- Generation errors are handled gracefully with clear user feedback

**Non-Goals:**
- Real-time streaming of AI responses to the frontend (batch response is sufficient for v1; streaming can be added later)
- Audio transcription or voice-to-text (out of scope; manual notes are the input)
- Custom prompt editing by users (prompts are hardcoded server-side for v1)
- Multi-language prompt output (prompts are in English; future i18n of AI output is a separate concern)
- Automatic generation triggers (always user-initiated)

## Decisions

**Decision 1: AI provider abstraction via strategy pattern**
Create a `server/utils/ai.ts` module that exports a `generateText(prompt, systemPrompt)` function. Internally it reads `AI_PROVIDER` from runtime config and delegates to a Claude or OpenAI implementation. Each implementation is a simple function that calls the respective HTTP API directly (no SDK dependency needed -- both APIs accept a JSON POST with messages). This keeps the dependency footprint minimal and makes adding providers trivial.

Alternative considered: Installing `@anthropic-ai/sdk` and `openai` packages. Rejected because the generation use case only needs a single chat completion call, and adding two SDKs (~5MB combined) is not justified for that.

**Decision 2: Hardcoded prompts, tailored per target type**
Two server-side prompt templates:
- **Summary prompt**: "You are a TTRPG session chronicler. Given the following session notes, write a concise narrative summary suitable for players to review before the next session. Focus on key events, plot developments, and character moments. Write in past tense, third person."
- **AI Notes prompt**: "You are a TTRPG session analyst. Given the following session notes, extract structured information: (1) Key decisions made by the party, (2) NPCs mentioned or encountered, (3) Locations visited or referenced, (4) Plot hooks or unresolved threads. Format each section with a markdown heading."

Prompts live in `server/utils/ai.ts` as exported constants so they are easy to find and modify. No user-facing prompt customisation in v1.

**Decision 3: Batch response, not streaming**
The generate endpoint waits for the full AI response, saves it, and returns the complete text. The frontend shows a loading spinner during the request. Rationale: streaming adds significant complexity (SSE or WebSocket, partial saves, error recovery mid-stream) and session summaries are short enough (typically under 30 seconds) that a loading state is acceptable. Streaming can be added in v2 if users report the wait is frustrating.

**Decision 4: Rate limiting via per-session cooldown**
The generate endpoint checks `updatedAt` on the target content type. If the content was generated (updated) within the last 60 seconds, the request is rejected with 429 Too Many Requests. This prevents accidental double-clicks and runaway costs. There is no global rate limit in v1 (the per-session cooldown is sufficient for the expected user base).

**Decision 5: Overwrite with confirmation**
If the target content type already has content, the frontend shows a confirmation dialog ("This will replace the existing summary. Continue?"). The server endpoint does not enforce this -- it always overwrites -- because the CLI and API consumers may have their own confirmation flows. The `--force` flag on the CLI skips CLI-side confirmation.

**Decision 6: Error handling strategy**
AI API failures (network errors, rate limits, invalid keys, content policy rejections) are caught server-side and returned as structured error responses with appropriate HTTP status codes:
- 502 Bad Gateway for AI provider errors (network, server errors)
- 503 Service Unavailable if no AI provider is configured
- 429 Too Many Requests for cooldown violations
- 400 Bad Request if manual notes are empty

The frontend displays these as destructive toasts with actionable messages ("AI provider not configured -- contact your admin", "No manual notes to summarise -- write session notes first").

**Decision 7: Environment variable configuration**
Three env vars:
- `AI_PROVIDER`: `claude` or `openai` (no default -- feature is disabled if unset)
- `AI_API_KEY`: The provider's API key
- `AI_MODEL`: Model identifier (defaults to `claude-sonnet-4-20250514` for Claude, `gpt-4o` for OpenAI)

These are server-only runtime config (not in `runtimeConfig.public`). The frontend only needs to know whether AI is available, which it learns from a lightweight check or from the generate endpoint returning 503.

## Risks / Trade-offs

- [Risk] AI API costs could accumulate if many users generate summaries frequently -> Mitigation: per-session cooldown, and DM/co-DM role requirement (players cannot trigger generation). Future: add usage tracking/budget caps.
- [Risk] AI output quality varies with note quality -- garbage in, garbage out -> Mitigation: clear UI messaging ("Generate summary from your manual notes"). Future: allow DM to edit the result before saving (already possible since the content tab has an edit mode).
- [Risk] Direct HTTP calls to AI APIs may break if API schemas change -> Mitigation: pin expected API versions in request headers; the abstraction layer isolates breakage to one function per provider.
- [Risk] Long AI responses may time out on slow connections or large notes -> Mitigation: set a 120-second timeout on the AI API call; Nitro's default request timeout is sufficient. Return a clear error if it times out.
- [Risk] AI provider API key misconfiguration silently breaks the feature -> Mitigation: the endpoint returns 503 with a message explaining the feature is not configured; the frontend hides generate buttons when it detects this.
