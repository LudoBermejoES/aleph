## MODIFIED Requirements

### Requirement: Role Hierarchy

The system SHALL enforce a strict role hierarchy with clearly defined capabilities at each level. Roles are assigned per-campaign, except Admin which is system-wide.

#### Scenario: System-wide roles

- GIVEN the system role hierarchy: Admin > User
- WHEN a user is created
- THEN they receive the "User" system role by default (`role = 'user'` in the `user` table)
- AND only an Admin can promote another user to Admin via `PATCH /api/admin/users/:id`

#### Scenario: Campaign roles

- GIVEN the campaign role hierarchy: Dungeon Master > Co-DM > Editor > Player > Visitor
- WHEN a user joins a campaign
- THEN they are assigned a campaign role (default: Player via invitation, Visitor for public campaigns)
- AND the campaign creator automatically receives the Dungeon Master role

#### Scenario: Admin manages user accounts

- GIVEN a user with `role = 'admin'`
- WHEN they access `/api/admin/users` endpoints
- THEN they can list, update (name, email, password, role), and delete any user account
- AND they cannot delete their own account
