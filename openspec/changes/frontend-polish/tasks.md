# Tasks: Frontend Polish & E2E Testing

## 1. Better Auth Client SDK

- [ ] 1.1 Create `app/composables/useAuth.ts` using `createAuthClient` from `better-auth/vue`
- [ ] 1.2 Export `signIn`, `signUp`, `signOut`, `useSession` from composable
- [ ] 1.3 Update `app/pages/login.vue` to use `signIn.email()` instead of raw `$fetch`
- [ ] 1.4 Update `app/pages/register.vue` to use `signUp.email()` instead of raw `$fetch`
- [ ] 1.5 Update `app/layouts/default.vue` logout to use `signOut()` from composable
- [ ] 1.6 Update `app/middleware/auth.global.ts` to use `useSession()` for validation

## 2. Health & Infrastructure

- [ ] 2.1 Create `server/api/health.get.ts` (no auth required, returns status/timestamp/version)
- [ ] 2.2 Add `/api/health` to auth middleware skip list
- [ ] 2.3 Create `app/pages/[...slug].vue` catch-all 404 page
- [ ] 2.4 Add error.vue global error page

## 3. Campaign Sidebar Navigation

- [ ] 3.1 Create `app/components/CampaignSidebar.vue` with links to all campaign sections
- [ ] 3.2 Update `app/layouts/default.vue` to show campaign sidebar when route is inside /campaigns/:id
- [ ] 3.3 Highlight active section in sidebar
- [ ] 3.4 Show campaign name in sidebar header

## 4. Loading & Error States

- [ ] 4.1 Add loading skeleton components for list pages
- [ ] 4.2 Add error toast/notification system
- [ ] 4.3 Add loading state to all page data fetches (consistent pattern)
- [ ] 4.4 Add empty state illustrations for empty lists

## 5. Playwright E2E Tests

- [ ] 5.1 Install Playwright browsers (`npx playwright install chromium`)
- [ ] 5.2 Test: Register new user → redirects to campaigns page
- [ ] 5.3 Test: Login with valid credentials → see campaigns list
- [ ] 5.4 Test: Login with invalid credentials → see error message
- [ ] 5.5 Test: Create campaign → redirected to campaign dashboard
- [ ] 5.6 Test: Create entity → view entity with markdown rendered
- [ ] 5.7 Test: Search (Ctrl+K) → type query → see results
- [ ] 5.8 Test: Unauthenticated access to /campaigns → redirect to /login
- [ ] 5.9 Test: Health endpoint returns 200 with status ok

## 6. Component Tests

- [ ] 6.1 Test useAuth composable: signIn returns session, signOut clears session
- [ ] 6.2 Test CampaignSidebar: renders correct links, highlights active section
- [ ] 6.3 Test auth middleware: redirects when no session, passes when session exists
