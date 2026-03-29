## 1. Auth Middleware

- [x] 1.1 Add `/join` to the public routes list in `app/middleware/auth.global.ts`

## 2. Join Page

- [x] 2.1 Create `app/pages/join.vue` with `definePageMeta({ layout: 'auth' })` and read `token` + `campaign` from `useRoute().query`
- [x] 2.2 Show error state if `token` or `campaign` params are missing
- [x] 2.3 On mount, if user is already authenticated, call join API immediately and redirect to campaign (handle 409 as success, show error for 404/410)
- [x] 2.4 If not authenticated, show login/register tabs (two tabs: Login, Register)
- [x] 2.5 Login tab: email + password form; on success call join API then redirect to campaign
- [x] 2.6 Register tab: name + email + password form; on success call join API then redirect to campaign
- [x] 2.7 Show loading state while join API is in flight

## 3. Members Page — Invite URL

- [x] 3.1 In `members.vue`, construct full join URL from `window.location.origin + /join?token=<token>&campaign=<campaignId>` after invite is generated
- [x] 3.2 Replace raw token `<code>` block with the full URL displayed in a styled box
- [x] 3.3 Add a "Copy" button next to the URL that copies to clipboard and shows brief "Copied!" feedback

## 4. CLI — member invite URL

- [x] 4.1 In `cli/src/commands/member.js`, after a successful invite, print the full join URL: `Join URL: <serverUrl>/join?token=<token>&campaign=<id>`

## 5. i18n

- [x] 5.1 Add `join.*` keys to `i18n/locales/en.json`: page title, subtitle, loginTab, registerTab, joining, success, errorInvalid, errorExpired, errorAlreadyMember, missingParams
- [x] 5.2 Add matching keys to `i18n/locales/es.json`

## 6. Skill Files

- [x] 6.1 Update `docs/claude-skill.md` — note that `member invite` now prints a full join URL
- [x] 6.2 Mirror to `.claude/skills/aleph-cli/SKILL.md`, bump version to 2.3

## 7. Tests

- [x] 7.1 E2E test: unauthenticated user opens invite URL, registers on join page, is redirected to campaign
- [x] 7.2 E2E test: authenticated user opens invite URL, is auto-joined and redirected
