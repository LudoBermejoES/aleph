# Tasks: Frontend Polish & E2E Testing

## 1. Auth Flow Fix

- [x] 1.1 Create `app/composables/useAuth.ts` with native fetch + credentials:include
- [x] 1.2 Export authSignIn, authSignUp, authSignOut helpers with FE logging
- [x] 1.3 Update `app/pages/login.vue` to use authSignIn + window.location.href redirect
- [x] 1.4 Update `app/pages/register.vue` to use authSignUp + window.location.href redirect
- [x] 1.5 Update `app/layouts/default.vue` logout to use authSignOut
- [x] 1.6 Update `app/middleware/auth.global.ts` to validate session via /api/auth/get-session

## 2. Health & Infrastructure

- [x] 2.1 Create `server/api/health.get.ts` (no auth required, returns status/timestamp/version)
- [x] 2.2 Add `/api/health` to auth middleware skip list
- [x] 2.3 Create `app/pages/[...slug].vue` catch-all 404 page
- [x] 2.4 Add error.vue global error page
- [x] 2.5 Set ssr: false (SPA mode) to avoid SSR crashes from client-only libs
- [x] 2.6 Install typescript@5.7 (Vue compiler requirement)
- [x] 2.7 Install lucide-vue-next (shadcn dialog dependency)
- [x] 2.8 Fix Button.vue: inline buttonVariants to avoid barrel import 404
- [x] 2.9 Remove all explicit ~/components/ui/ imports (use Nuxt auto-imports)
- [x] 2.10 Rename EntityGraphView.vue and MapViewer.vue to .client.vue (SSR-safe)

## 3. Campaign Sidebar Navigation

- [x] 3.1 Integrated campaign sidebar directly into default.vue layout
- [x] 3.2 Show campaign sections (Wiki, Characters, Maps, etc.) when inside /campaigns/:id
- [x] 3.3 Highlight active section with bg-sidebar-accent
- [ ] 3.4 Show campaign name in sidebar header (needs API call)

## 4. Logging & Observability

- [x] 4.1 Add [Aleph:Auth] console logs to auth composable (signIn, signUp status)
- [x] 4.2 Add [Aleph:Middleware] console logs to auth middleware (session validation)
- [x] 4.3 Add [Aleph] console logs to campaign creation flow
- [x] 4.4 Add Winston debug logs to server auth middleware (accepted/rejected)

## 5. Playwright E2E Tests

- [x] 5.1 Install Playwright chromium browser
- [x] 5.2 Test: Register new user → redirects to campaigns page
- [x] 5.3 Test: Login with valid credentials → see campaigns list
- [x] 5.4 Test: Login with invalid credentials → see error message
- [ ] 5.5 Test: Create campaign → redirected to campaign dashboard (Playwright click issue)
- [ ] 5.6 Test: Create entity → view entity with markdown rendered
- [ ] 5.7 Test: Search (Ctrl+K) → type query → see results
- [x] 5.8 Test: Unauthenticated access to /campaigns → redirect to /login
- [x] 5.9 Test: Health endpoint returns 200 with status ok

## 6. Loading & Error States

- [ ] 6.1 Add loading skeleton components for list pages
- [ ] 6.2 Add error toast/notification system
- [ ] 6.3 Add loading state to all page data fetches
- [ ] 6.4 Add empty state illustrations

## 7. Component Tests

- [ ] 7.1 Test auth middleware: redirects when no session, passes when valid
- [ ] 7.2 Test CampaignSidebar highlights active section
