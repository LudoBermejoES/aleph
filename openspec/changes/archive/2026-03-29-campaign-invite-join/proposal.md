## Why

Campaign invite links are broken end-to-end: the Members page shows a raw token with no instructions, and there is no `/join` page that processes the token. Players who receive a token have no way to use it from a browser. The token must be manually posted to the API, which is unusable for non-technical players.

## What Changes

- **`/join` page**: A public (unauthenticated) page at `/join?token=<token>&campaign=<campaignId>` that processes an invite token. If the user is not logged in, shows login/register tabs inline, then automatically joins after authentication. If already logged in, joins immediately and redirects to the campaign.
- **Members page — show full invite URL**: Replace the raw token display with a copyable full URL (`/join?token=X&campaign=Y`) and a copy-to-clipboard button.
- **Auth middleware — allow `/join`**: Add `/join` to the public routes list so unauthenticated users can land on the page.
- **i18n keys**: All new strings in en.json + es.json.

## Capabilities

### New Capabilities

- `campaign-join-page`: The `/join` page — handles token validation UX, inline auth (login + register tabs), automatic join on success, redirect to campaign, and error states (invalid token, expired, already a member).

### Modified Capabilities

- `campaign-invite-ui`: Members page shows a full clickable invite URL with copy button instead of raw token.

## Impact

- `app/pages/join.vue` — new page (public route)
- `app/middleware/auth.global.ts` — add `/join` to public routes
- `app/pages/campaigns/[id]/members.vue` — replace token display with full URL + copy button
- `i18n/locales/en.json` + `es.json` — new `join.*` keys
- No server changes needed — `/api/campaigns/:id/join` already exists and works
- CLI: `member invite` should print a usable URL — update output
- `docs/claude-skill.md` + `.claude/skills/aleph-cli/SKILL.md` — update invite docs
