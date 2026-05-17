# user-management-admin Specification

## ADDED Requirements

### Requirement: System role on user accounts

The system SHALL store a `role` field on every user account. Valid values are `user` (default) and `admin`. Only an existing admin can promote another user to `admin`.

#### Scenario: Default role on registration

- **WHEN** a new user registers via email/password
- **THEN** their account is created with `role = 'user'`

#### Scenario: Seed admin on migration

- **GIVEN** the migration that adds the `role` column runs
- **WHEN** a user with email `ludobermejo@gmail.com` exists in the `user` table
- **THEN** that user's `role` is set to `admin`
- **AND** if no such user exists, no error is raised and the migration completes normally

#### Scenario: Admin promotes a user

- **GIVEN** an authenticated admin user
- **WHEN** they send `PATCH /api/admin/users/:id` with `{ "role": "admin" }`
- **THEN** the target user's role is updated to `admin`
- **AND** the response returns the updated user object

#### Scenario: Non-admin cannot change roles

- **GIVEN** an authenticated non-admin user
- **WHEN** they send `PATCH /api/admin/users/:id` with any body
- **THEN** the server returns `403 Forbidden`

### Requirement: Admin user list endpoint

The system SHALL provide `GET /api/admin/users` that returns all registered users (id, name, email, role, createdAt). Access is restricted to users with `role = 'admin'`.

#### Scenario: Admin lists users

- **GIVEN** an authenticated admin user
- **WHEN** they send `GET /api/admin/users`
- **THEN** the server returns `200 OK` with an array of user objects

#### Scenario: Unauthenticated request rejected

- **GIVEN** no session or API key
- **WHEN** a request is sent to `GET /api/admin/users`
- **THEN** the server returns `401 Unauthorized`

#### Scenario: Non-admin request rejected

- **GIVEN** an authenticated non-admin user
- **WHEN** they send `GET /api/admin/users`
- **THEN** the server returns `403 Forbidden`

### Requirement: Admin update user endpoint

The system SHALL provide `PATCH /api/admin/users/:id` to update a user's `name`, `email`, `password`, or `role`. Access is restricted to admins.

#### Scenario: Admin updates user name

- **GIVEN** an authenticated admin
- **WHEN** they send `PATCH /api/admin/users/:id` with `{ "name": "New Name" }`
- **THEN** the `user.name` is updated and `200 OK` is returned with the updated user

#### Scenario: Admin updates user email

- **GIVEN** an authenticated admin
- **WHEN** they send `PATCH /api/admin/users/:id` with `{ "email": "new@example.com" }`
- **THEN** the `user.email` is updated and `200 OK` is returned

#### Scenario: Admin updates user password

- **GIVEN** an authenticated admin
- **WHEN** they send `PATCH /api/admin/users/:id` with `{ "password": "newSecurePassword123" }`
- **THEN** the `account.password` for the user's credential provider is updated with the argon2-hashed new password
- **AND** the response returns `200 OK` without exposing the hashed password

#### Scenario: Admin cannot update a non-existent user

- **GIVEN** an authenticated admin
- **WHEN** they send `PATCH /api/admin/users/nonexistent-id` with a valid body
- **THEN** the server returns `404 Not Found`

### Requirement: Admin delete user endpoint

The system SHALL provide `DELETE /api/admin/users/:id` to permanently delete a user account. Access is restricted to admins. An admin cannot delete their own account.

#### Scenario: Admin deletes a user

- **GIVEN** an authenticated admin
- **WHEN** they send `DELETE /api/admin/users/:id` where `:id` is a different user
- **THEN** the user and all related sessions/accounts are deleted
- **AND** the server returns `204 No Content`

#### Scenario: Admin cannot delete themselves

- **GIVEN** an authenticated admin
- **WHEN** they send `DELETE /api/admin/users/:id` where `:id` matches their own user id
- **THEN** the server returns `403 Forbidden`

#### Scenario: Deleting a non-existent user

- **GIVEN** an authenticated admin
- **WHEN** they send `DELETE /api/admin/users/nonexistent-id`
- **THEN** the server returns `404 Not Found`

### Requirement: Admin settings UI page

The system SHALL provide a `/settings/users` page accessible only to admins. The page lists all users with their name, email, role, and join date. From this page, an admin can edit or delete any user.

#### Scenario: Admin sees user management link in settings

- **GIVEN** an authenticated admin visiting `/settings`
- **WHEN** the page renders
- **THEN** a link to "Manage users" (or translated equivalent) is visible

#### Scenario: Non-admin does not see user management link

- **GIVEN** an authenticated non-admin user visiting `/settings`
- **WHEN** the page renders
- **THEN** no link to user management is visible

#### Scenario: Admin accesses user management page

- **GIVEN** an authenticated admin navigating to `/settings/users`
- **WHEN** the page loads
- **THEN** a list of all registered users is displayed with name, email, role, and join date
- **AND** each user row has Edit and Delete actions

#### Scenario: Non-admin cannot access user management page

- **GIVEN** an authenticated non-admin user navigating to `/settings/users`
- **WHEN** the page loads
- **THEN** the user is redirected away or shown a 403 error

#### Scenario: Admin edits a user from the UI

- **GIVEN** an admin on `/settings/users`
- **WHEN** they click Edit on a user and submit changes to name, email, or password
- **THEN** the `PATCH /api/admin/users/:id` endpoint is called
- **AND** the list is refreshed showing the updated data

#### Scenario: Admin deletes a user from the UI

- **GIVEN** an admin on `/settings/users`
- **WHEN** they click Delete on a user and confirm the action
- **THEN** the `DELETE /api/admin/users/:id` endpoint is called
- **AND** the user is removed from the list
