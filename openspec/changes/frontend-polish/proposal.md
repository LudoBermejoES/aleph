# Proposal: Frontend Polish & E2E Testing

## Why

The frontend is functionally complete (13 features, all pages exist) but critically broken for real usage. Login/register fail in the browser because the auth flow uses raw `$fetch` instead of Better Auth's client SDK. There are no E2E tests, no health endpoint, and the session management is fragile. This change fixes the auth flow, adds proper client-side session management, creates a health endpoint, and adds Playwright E2E tests for critical user flows.

## What Changes

- Integrate Better Auth client SDK (`better-auth/vue`) for proper auth flow
- Replace raw `$fetch` auth calls with SDK methods
- Fix auth middleware to use `useSession()` composable
- Add `/api/health` endpoint
- Add proper loading/error states across all pages
- Add Playwright E2E tests for critical flows
- Add proper navigation sidebar within campaigns
- Fix logout flow

## Scope

### In scope
- Better Auth client SDK integration
- Auth composable (`useAuth`) for session state
- Fix login/register pages to use SDK
- Fix auth middleware to validate session properly
- Health check endpoint
- Playwright E2E tests (5-8 critical flows)
- Campaign sidebar navigation
- Loading states and error boundaries
- Proper 404 page

### Out of scope
- New features
- Mobile responsive design
- i18n
