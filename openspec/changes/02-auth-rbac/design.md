# Design: Authentication & RBAC

## Technical Approach

### Better Auth Integration

Better Auth with the Nuxt module (`nuxt-better-auth`) provides:
- Credential auth (email/password) with bcrypt hashing
- Database-backed sessions in SQLite via Drizzle adapter
- CSRF protection, rate limiting
- `useAuth()` composable on the client

### Permission Resolution Engine

Three-tier cascade implemented as a server utility:

```
Entity-level user override > Entity-level role override > Campaign role default
```

Cached in an in-memory LRU map (per userId, 5-minute TTL). Invalidated on role change, permission change, or entity visibility change.

### Server Middleware Stack

1. `server/middleware/01.auth.ts` -- Validates session, attaches `event.context.user`
2. `server/middleware/02.campaign.ts` -- For `/api/campaigns/:id/*` routes, resolves membership and attaches `event.context.campaignRole`

### Key API Routes

- `POST /api/auth/register` -- Create account
- `POST /api/auth/login` -- Login
- `POST /api/auth/logout` -- Logout
- `GET /api/campaigns` -- List user's campaigns
- `POST /api/campaigns` -- Create campaign
- `POST /api/campaigns/:id/invite` -- Generate invitation
- `POST /api/campaigns/:id/join` -- Accept invitation
- `GET /api/campaigns/:id/members` -- List members
- `PUT /api/campaigns/:id/members/:userId` -- Update role
- `DELETE /api/campaigns/:id/members/:userId` -- Remove member
- `PUT /api/campaigns/:id/entities/:entityId/permissions` -- Set entity overrides

### Database Tables

From the data-model spec: `users`, `sessions`, `accounts`, `campaigns`, `campaign_members`, `campaign_member_permissions`, `campaign_invitations`, `entity_permissions`, `entity_specific_viewers`
