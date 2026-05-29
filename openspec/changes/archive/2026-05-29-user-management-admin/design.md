## Context

The current codebase has no system-level role enforcement. The `user` table in `server/db/schema/auth.ts` has no `role` column; the backup admin endpoints check only that a user is authenticated. The settings page is a single file (`app/pages/settings.vue`) covering only API key management. Better-auth is configured with email/password only — no admin plugin.

The change must add: (1) a system-level `admin` role concept, (2) server endpoints to list/update/delete users, and (3) an admin-only settings sub-page.

## Goals / Non-Goals

**Goals:**

- Introduce a `role` field (`user` | `admin`) on the `user` table to distinguish admin accounts.
- Provide `/api/admin/users` endpoints: list, patch (name/email/password), delete.
- Add a `/settings/users` page accessible only to admins.
- Link to it from the settings index, conditionally rendered for admins.
- Password changes hash the new password through the `account.password` column (argon2, same as better-auth's email provider).

**Non-Goals:**

- Self-service user editing (users changing their own profile) — separate concern.
- Invitation or role-promotion UI — admin is assigned via initial seed/migration.
- Two-factor authentication management.
- Pagination beyond a simple limit (admin list will be small in practice).

## Decisions

### Add `role` column to `user` table directly (not better-auth admin plugin)

The better-auth `admin` plugin provides role management but requires opting in to its full API surface and couples the schema to the library's assumptions. Adding a `role: text('role').notNull().default('user')` column to the `user` table is the simpler approach: it's a single migration, the auth middleware already exposes `event.context.user`, and the admin check is one line (`if (user.role !== 'admin')`).

Alternatives considered:

- **better-auth admin plugin**: More features (impersonation, ban), but adds plugin dependency and changes how user data is fetched. Overkill for this use case.
- **Environment-variable admin list**: Fragile, can't be changed at runtime through the UI.

### Promote admin via database migration / seed

The first admin must be designated outside the UI (no admin yet exists to promote others). A Drizzle migration adds the column; a seed script or manual SQL sets the first admin's role. Future admins are promoted via the UI by an existing admin.

### Password update goes through `account` table (argon2 via better-auth utilities)

Better-auth stores hashed passwords in `account.password` for the `credential` provider. Updating password requires: hash new password with argon2 (same library better-auth uses: `@node-rs/argon2`), then `UPDATE account SET password = ? WHERE userId = ? AND providerId = 'credential'`.

### Settings page refactored to sub-pages

`app/pages/settings.vue` becomes a layout (`app/pages/settings/`) with:

- `app/pages/settings/index.vue` — API key management (moved from current settings.vue)
- `app/pages/settings/users.vue` — user management (new, admin-only)

The settings index page adds a nav card/link to `/settings/users` only when `user.role === 'admin'`.

## Risks / Trade-offs

- **No self-promotion guard needed** for initial seed since the UI requires an existing admin — risk is only that no admin is seeded at all. Mitigation: document the seeding step clearly in tasks.
- **Admin deleting themselves**: Should be blocked server-side to prevent lockout. Mitigation: `DELETE /api/admin/users/:id` returns 403 if `id === currentUser.id`.
- **Email change with existing sessions**: Changing a user's email doesn't invalidate their sessions. Mitigation: out of scope for this iteration; better-auth session tokens are ID-based, not email-based, so function is unaffected.
- **`role` column not in `event.context.user`**: The auth middleware resolves users via better-auth's session handler, which returns only the columns in the `user` table as configured. After the migration adds `role`, it will appear in the resolved user object automatically (drizzle adapter maps all columns).

## Migration Plan

1. Add Drizzle migration: `ALTER TABLE user ADD COLUMN role TEXT NOT NULL DEFAULT 'user'`.
2. Provide a one-time script or clear instructions to set the first admin: `UPDATE user SET role = 'admin' WHERE email = '<admin-email>'`.
3. No rollback complexity — the column has a default; removing it (rollback) restores all users to `role = 'user'` state.

## Open Questions

- Should the admin have a visible indicator in the UI nav (e.g., badge or different avatar)?
  Deferred — not required for functional admin management.
