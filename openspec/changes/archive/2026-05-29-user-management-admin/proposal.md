## Why

Aleph has no way for an admin to manage user accounts from the UI — there is no list of registered users, no way to change a user's email or password, and no way to delete a user. This means all account corrections require direct database access, which is not sustainable as the number of users grows.

## What Changes

- Add a **Manage Users** link in the Settings page, visible only to admins.
- New `/settings/users` admin page that lists all registered users with their name, email, and creation date.
- Admins can **edit** a user's name, email, or password from that page.
- Admins can **delete** a user account (with confirmation).
- New server API endpoints under `/api/admin/users/` to support these operations (all require Admin system role).

## Capabilities

### New Capabilities

- `user-management-admin`: Admin UI and API for listing, editing (name/email/password), and deleting user accounts.

### Modified Capabilities

- `auth-roles`: The Admin system role gains explicit CRUD capabilities over user accounts (list all users, update any user, delete any user). No new roles added; no breaking changes to existing scenarios.

## Impact

- **`app/pages/settings/`**: Refactor `settings.vue` into a layout with sub-pages; add `settings/index.vue` (API keys) and `settings/users.vue` (user management, admin-only).
- **`server/api/admin/users/`**: New endpoints — `GET index.get.ts`, `PATCH [id].patch.ts`, `DELETE [id].delete.ts` — all guarded by Admin role check.
- **`i18n/locales/en.json` and `es.json`**: New translation keys for user management UI.
- **aleph-cli**: No new CLI commands needed for this change (admin UI feature only).
- **better-auth integration**: Updates to user records go through the `user` table via Drizzle directly (same pattern as existing admin backup route). Password changes require hashing via better-auth's argon2 utility.
