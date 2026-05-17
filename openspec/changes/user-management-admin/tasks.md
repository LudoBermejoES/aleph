## 1. Database Migration

- [x] 1.1 Add Drizzle migration: `ALTER TABLE user ADD COLUMN role TEXT NOT NULL DEFAULT 'user'`
- [x] 1.2 Update `server/db/schema/auth.ts` to add `role` field to the `user` table definition
- [x] 1.3 In the migration script, after adding the column, run `UPDATE user SET role = 'admin' WHERE email = 'ludobermejo@gmail.com'` (no-op if the user does not exist)

## 2. Server API — Admin User Endpoints

- [x] 2.1 Create `server/api/admin/users/index.get.ts` — list all users (requires `role = 'admin'`)
- [x] 2.2 Create `server/api/admin/users/[id].patch.ts` — update name/email/password/role (admin only; 404 if not found)
- [x] 2.3 Create `server/api/admin/users/[id].delete.ts` — delete user (admin only; 403 if self; 404 if not found)
- [x] 2.4 Add shared `requireAdmin` guard helper in `server/utils/` used by all three endpoints

## 3. Tests — Integration

- [x] 3.1 Write integration tests for `GET /api/admin/users`: admin allowed, non-admin 403, unauthenticated 401
- [x] 3.2 Write integration tests for `PATCH /api/admin/users/:id`: update name, email, password; non-admin 403; missing user 404
- [x] 3.3 Write integration tests for `DELETE /api/admin/users/:id`: success 204; self-delete 403; missing user 404

## 4. Settings Page Refactor

- [x] 4.1 Convert `app/pages/settings.vue` → `app/pages/settings/index.vue` (move API keys content)
- [x] 4.2 Create `app/pages/settings/users.vue` — admin-only user management page
- [x] 4.3 Add admin-only "Manage users" nav link in `app/pages/settings/index.vue` (hidden for non-admins)
- [x] 4.4 Add route middleware on `/settings/users` to redirect non-admins

## 5. User Management UI Components

- [x] 5.1 Create `UserList` component (or inline in page): table of users with name, email, role, join date, edit/delete actions
- [x] 5.2 Create `UserEditDialog` component: form for name, email, password, role fields; calls PATCH endpoint
- [x] 5.3 Add delete confirmation (reuse existing `confirm()` pattern) calling DELETE endpoint
- [x] 5.4 Expose `user.role` from the auth composable/session so pages can conditionally render admin UI

## 6. i18n

- [x] 6.1 Add translation keys to `i18n/locales/en.json`: `adminUsers.title`, `adminUsers.editUser`, `adminUsers.deleteUser`, `adminUsers.name`, `adminUsers.email`, `adminUsers.role`, `adminUsers.joinDate`, `adminUsers.manageLink`
- [x] 6.2 Add the same keys to `i18n/locales/es.json`

## 7. Tests — E2E

- [x] 7.1 Write Playwright E2E test: admin can open `/settings/users`, see user list, edit a user, delete a user
- [x] 7.2 Write Playwright E2E test: non-admin is redirected away from `/settings/users`
