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
