# Design: Frontend Polish & E2E Testing

## Technical Approach

### Better Auth Client SDK

Replace raw `$fetch('/api/auth/sign-in/email')` with the official SDK:

```typescript
// app/composables/useAuth.ts
import { createAuthClient } from 'better-auth/vue'

export const { signIn, signUp, signOut, useSession } = createAuthClient({
  baseURL: '/api/auth',
})
```

This gives us:
- `signIn.email({ email, password })` -- handles CSRF, cookies, errors
- `signUp.email({ name, email, password })` -- same
- `signOut()` -- clears session properly
- `useSession()` -- reactive session state with auto-refresh

### Auth Middleware Fix

Replace cookie check with server-validated session:

```typescript
// app/middleware/auth.global.ts
export default defineNuxtRouteMiddleware(async (to) => {
  if (['/login', '/register'].includes(to.path)) return
  const { data: session } = useSession()
  if (!session.value) return navigateTo('/login')
})
```

### Health Endpoint

```typescript
// server/api/health.get.ts
export default defineEventHandler(() => ({
  status: 'ok',
  timestamp: new Date().toISOString(),
  version: '0.1.0',
}))
```

### Campaign Sidebar Navigation

When inside a campaign, the sidebar should show campaign-specific links (Wiki, Characters, Maps, Sessions, etc.) instead of just "Campaigns".

### Playwright E2E Tests

Critical flows:
1. Register → Login → See campaigns
2. Create campaign → See dashboard
3. Create entity → View entity → Edit → Search
4. Create character → View with stats
5. Login as player → Can't see DM-only content

### Service Layer (TDD)

No new services needed -- this change fixes existing frontend integration.

Test layers:
1. **E2E tests**: Playwright browser tests for critical user flows
2. **Component tests**: mountSuspended for auth composable behavior
