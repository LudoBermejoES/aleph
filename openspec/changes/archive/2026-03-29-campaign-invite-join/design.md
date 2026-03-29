## Context

The invite API is complete. `POST /api/campaigns/:id/invite` returns `{ token, role, expiresAt }`. `POST /api/campaigns/:id/join` accepts `{ token }` with a cookie session and adds the user as a member. The only missing pieces are frontend UX.

The join URL format needs both the campaign ID and the token: `/join?token=<token>&campaign=<campaignId>`. The campaign ID is known at invite-generation time on the members page.

## Goals / Non-Goals

**Goals:**
- `/join` page works for unauthenticated users (register or login inline, then auto-join)
- `/join` page works for already-authenticated users (join immediately on load)
- Members page shows a full usable URL with one-click copy
- CLI `member invite` prints the full join URL

**Non-Goals:**
- No token preview/validation endpoint (not needed — join returns clear error messages)
- No invite management UI (list/revoke tokens) — separate feature
- No email sending — URL is shared manually

## Decisions

**Decision 1: URL format — `/join?token=X&campaign=Y`**
Flat route at `/join` with query params rather than `/campaigns/:id/join` (which is behind auth middleware in layout). Simpler to share and the page stands alone without campaign context.

**Decision 2: Inline auth on `/join` — tabs not redirect**
Redirecting to `/login?redirect=/join?...` would lose query params across double-encode. Instead, the `/join` page renders login and register forms inline in tabs. After successful auth, it automatically calls the join API and redirects. No round-trips via redirect chain.

**Decision 3: Auto-join for authenticated users on mount**
If the user is already logged in when they land on `/join`, call the join API immediately and redirect. No confirmation step — the token already encodes the campaign and role they agreed to join.

**Decision 4: Error states shown inline**
Show clear messages for: invalid/expired token, already a member (redirect to campaign), missing params. No generic error page.

## Risks / Trade-offs

- [Risk] Join page is public so anyone with the URL can attempt to join → Mitigation: server enforces token validity + expiry
- [Risk] Inline auth adds complexity to the join page → Mitigation: reuse the same form pattern as login.vue/register.vue, just embedded in tabs
