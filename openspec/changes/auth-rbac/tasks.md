# Tasks: Authentication & RBAC

## 1. Better Auth Setup

- [ ] 1.1 Install `better-auth` and `nuxt-better-auth`
- [ ] 1.2 Configure Better Auth with SQLite/Drizzle adapter
- [ ] 1.3 Generate auth database tables (users, sessions, accounts) via migration
- [ ] 1.4 Create `server/utils/auth.ts`: auth instance configuration

## 2. Auth Pages

- [ ] 2.1 Create `app/pages/login.vue`: email/password login form
- [ ] 2.2 Create `app/pages/register.vue`: registration form
- [ ] 2.3 Create auth layout (centered card, no sidebar)
- [ ] 2.4 Add `useAuth()` composable usage for client-side session state
- [ ] 2.5 Add global auth middleware: redirect unauthenticated users to /login

## 3. Campaign CRUD

- [ ] 3.1 Create Drizzle schema for campaigns table
- [ ] 3.2 Create `POST /api/campaigns`: create campaign + content directory
- [ ] 3.3 Create `GET /api/campaigns`: list user's campaigns
- [ ] 3.4 Create `GET /api/campaigns/:id`: get campaign details
- [ ] 3.5 Create `PUT /api/campaigns/:id`: update campaign settings
- [ ] 3.6 Create `DELETE /api/campaigns/:id`: delete campaign (DM only)
- [ ] 3.7 Create campaign list page and campaign creation dialog

## 4. Membership & Roles

- [ ] 4.1 Create Drizzle schema for campaign_members and campaign_member_permissions
- [ ] 4.2 Auto-assign DM role to campaign creator on creation
- [ ] 4.3 Create `POST /api/campaigns/:id/invite`: generate invitation token
- [ ] 4.4 Create `POST /api/campaigns/:id/join`: accept invitation with role
- [ ] 4.5 Create `GET /api/campaigns/:id/members`: list members with roles
- [ ] 4.6 Create `PUT /api/campaigns/:id/members/:userId`: change role
- [ ] 4.7 Create `DELETE /api/campaigns/:id/members/:userId`: remove member
- [ ] 4.8 Create `POST /api/campaigns/:id/members/:userId/permissions`: grant named permission
- [ ] 4.9 Create campaign members management page

## 5. Permission Engine

- [ ] 5.1 Create Drizzle schema for entity_permissions and entity_specific_viewers
- [ ] 5.2 Implement `canUserAccessEntity(userId, entityId, permission)` resolver
- [ ] 5.3 Implement `getVisibleEntitiesQuery()` SQL builder for list filtering
- [ ] 5.4 Implement LRU permission cache with 5-min TTL and invalidation hooks
- [ ] 5.5 Create `server/middleware/01.auth.ts`: session validation, attach user to context
- [ ] 5.6 Create `server/middleware/02.campaign.ts`: resolve campaign membership and role
- [ ] 5.7 Create `server/utils/permissions.ts`: role hierarchy, capability matrix, named permissions

## 6. Entity Permission UI

- [ ] 6.1 Create `PUT /api/campaigns/:id/entities/:entityId/permissions`: set overrides
- [ ] 6.2 Create permission editor component (assign allow/deny per user or role)
- [ ] 6.3 Create visibility selector component (dropdown for visibility levels)

## 7. Tests (TDD)

### Unit Tests (Vitest)

- [ ] 7.1 Test permission resolution engine: role hierarchy resolves correctly (DM > player > spectator)
- [ ] 7.2 Test permission resolution engine: entity-level override trumps role-level default
- [ ] 7.3 Test permission resolution engine: explicit deny beats implicit allow at same level
- [ ] 7.4 Test named permission grants: user with `manage_calendar` permission passes check, user without fails
- [ ] 7.5 Test LRU permission cache: repeated lookups return cached result; invalidation clears entry
- [ ] 7.6 Test `getVisibleEntitiesQuery()` SQL builder: returns only entities matching user's visibility level
- [ ] 7.7 Test invitation token generation: produces valid token; expired token is rejected

### Integration Tests (@nuxt/test-utils)

- [ ] 7.8 Test `POST /api/auth/register`: creates user, returns session cookie
- [ ] 7.9 Test `POST /api/auth/login`: valid credentials return session; invalid credentials return 401
- [ ] 7.10 Test session lifecycle: login sets cookie, authenticated request succeeds, logout invalidates session
- [ ] 7.11 Test campaign CRUD endpoints enforce authentication (unauthenticated requests return 401)
- [ ] 7.12 Test `POST /api/campaigns/:id/invite` + `POST /api/campaigns/:id/join`: full invitation flow assigns correct role
- [ ] 7.13 Test campaign delete is restricted to DM role (player receives 403)
- [ ] 7.14 Test `PUT /api/campaigns/:id/entities/:entityId/permissions`: DM can set overrides, player cannot
- [ ] 7.15 Test middleware auth guard: unauthenticated request to protected route returns 401; authenticated request passes

### Component Tests (@vue/test-utils)

- [ ] 7.16 Test login form component: submits credentials, displays validation errors on empty fields
- [ ] 7.17 Test permission editor component: renders allow/deny toggles per role, emits correct payload on save
- [ ] 7.18 Test visibility selector component: renders dropdown options, emits selected visibility level
