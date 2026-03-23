# auth-roles Specification

## Purpose
TBD - created by archiving change campaign-manager-study. Update Purpose after archive.
## Requirements
### Requirement: User Authentication

The system SHALL support secure user registration, login, and session management.

#### Scenario: User registration
- GIVEN a visitor on the registration page
- WHEN they submit a valid username, email, and password
- THEN a new user account is created with the default system role (Visitor)
- AND a session is established
- AND the password is stored as a bcrypt/argon2 hash, never in plaintext

#### Scenario: User login
- GIVEN a registered user
- WHEN they submit valid credentials
- THEN a session token is issued (httpOnly cookie)
- AND the user is redirected to their dashboard

#### Scenario: Invalid login
- GIVEN invalid credentials
- WHEN the user submits the login form
- THEN an error is displayed without revealing whether the username or password was wrong
- AND failed attempts are rate-limited (5 attempts per 15 minutes per IP)

#### Scenario: Session expiration
- GIVEN an authenticated user with an idle session
- WHEN the session exceeds the idle timeout (configurable, default 7 days)
- THEN the session is invalidated
- AND the user must re-authenticate

#### Scenario: Two-factor authentication (optional)
- GIVEN an Admin enables 2FA on their account
- WHEN they log in with valid credentials
- THEN they are prompted for a TOTP code before the session is established

### Requirement: Role Hierarchy

The system SHALL enforce a strict role hierarchy with clearly defined capabilities at each level. Roles are assigned per-campaign, except Admin which is system-wide.

#### Scenario: System-wide roles
- GIVEN the system role hierarchy: Admin > User
- WHEN a user is created
- THEN they receive the "User" system role by default
- AND only an Admin can promote another user to Admin

#### Scenario: Campaign roles
- GIVEN the campaign role hierarchy: Dungeon Master > Co-DM > Editor > Player > Visitor
- WHEN a user joins a campaign
- THEN they are assigned a campaign role (default: Player via invitation, Visitor for public campaigns)
- AND the campaign creator automatically receives the Dungeon Master role

#### Scenario: Role capabilities matrix

The following default capabilities SHALL apply:

| Capability | Admin | DM | Co-DM | Editor | Player | Visitor |
|---|---|---|---|---|---|---|
| System settings | YES | no | no | no | no | no |
| Manage all users | YES | no | no | no | no | no |
| Create campaigns | YES | YES | no | no | no | no |
| Delete campaign | YES | owner only | no | no | no | no |
| Campaign settings | YES | YES | no | no | no | no |
| Invite/remove members | YES | YES | YES | no | no | no |
| Assign roles | YES | YES | YES (up to Editor) | no | no | no |
| Create wiki entries | YES | YES | YES | YES | no | no |
| Edit any wiki entry | YES | YES | YES | YES | no | no |
| Delete wiki entries | YES | YES | YES | no | no | no |
| Manage maps | YES | YES | YES | YES | no | no |
| Create/edit sessions | YES | YES | YES | no | no | no |
| Write session logs | YES | YES | YES | configurable | configurable | no |
| Create/edit quests | YES | YES | YES | configurable | no | no |
| View DM-only content | YES | YES | YES | no | no | no |
| Manage own character | YES | YES | YES | YES | YES | no |
| View permitted content | YES | YES | YES | YES | YES | YES (public only) |
| Manage inventory | YES | YES | YES | YES | own only | no |
| Manage calendars | YES | YES | YES | YES | no | no |
| Roll dice | YES | YES | YES | YES | YES | no |

### Requirement: Granular Permission Overrides

The system SHALL support per-entity and per-user permission overrides that supersede role defaults.

#### Scenario: Entity-level permission override
- GIVEN a wiki entry with default Editor+ visibility
- WHEN the DM grants a specific Player read access to that entry
- THEN that Player can see the entry despite their role not normally allowing it
- AND other Players still cannot see it

#### Scenario: Revoking permissions per entity
- GIVEN an Editor with default create/edit access
- WHEN the DM revokes edit permission on a specific entity
- THEN that Editor can view but not edit that entity
- AND their permissions on all other entities are unchanged

#### Scenario: Permission resolution order
- GIVEN multiple permission levels may apply to a user+entity pair
- WHEN the system resolves access
- THEN it evaluates in this order: entity-level user override > entity-level role override > campaign role default
- AND the most specific applicable rule wins (deny beats allow at the same level)

### Requirement: Content Visibility Levels

The system SHALL support multiple visibility levels on all content types (entities, map pins, sessions, inventory, etc.).

#### Scenario: Visibility levels
- GIVEN the following visibility levels: Public, Members, Editors+, DM Only, Private (creator only), Specific Users
- WHEN content is created or edited
- THEN the creator can set its visibility level
- AND the system enforces the visibility at query time and render time

#### Scenario: Visibility inheritance on relations
- GIVEN an entity marked "DM Only" that is linked to other entities
- WHEN a Player views an entity that has a relation to the hidden entity
- THEN the relation itself is hidden (not shown as "unknown" or redacted)
- AND map pins pointing to the hidden entity are also hidden
- AND inventory items, quest elements, and timeline events referencing it are hidden

#### Scenario: Inline secrets in markdown content
- GIVEN a wiki entry with mixed-visibility content using secret fence syntax:
  ```markdown
  The village elder is respected by all.

  :::secret dm
  He is actually a vampire in disguise.
  :::

  :::secret player:alice,bob
  Alice and Bob noticed his fangs last session.
  :::
  ```
- WHEN a Player who is not Alice or Bob views this entry
- THEN they see only "The village elder is respected by all."
- AND the DM sees all three sections
- AND Alice and Bob see the first paragraph and their specific secret

### Requirement: Named Permission Roles (Granular)

The system SHALL support optional named permission grants that give Players specific elevated capabilities without a full role change.

#### Scenario: Assigning a named permission
- GIVEN a Player user in a campaign
- WHEN the DM grants them the "Chronicler" permission
- THEN that Player can write session logs (which Players normally cannot)
- AND all other permissions remain at Player level

#### Scenario: Available named permissions
- GIVEN the following named permissions:
  - **QuestKeeper**: Can create/edit quests
  - **LoreKeeper**: Can create/edit wiki entries
  - **Cartographer**: Can create/edit maps
  - **Shopkeeper**: Can manage in-game shops they own
  - **Chronicler**: Can write session logs and adventure notes
  - **Treasurer**: Can manage party inventory and wealth
- WHEN a DM assigns any combination of these to a Player
- THEN the Player gains those specific capabilities in addition to their base role

### Requirement: Campaign Membership Management

The system SHALL support inviting, managing, and removing campaign members.

#### Scenario: Inviting a user to a campaign
- GIVEN a DM or Co-DM
- WHEN they generate an invitation link or enter a username/email
- THEN the target user receives an invitation
- AND upon acceptance, they join the campaign with the specified role

#### Scenario: Removing a member
- GIVEN a DM removing a Player from a campaign
- WHEN the removal is processed
- THEN the Player loses access to all campaign content
- AND their character data is retained (ownership transfers to DM) for campaign continuity
- AND they can be re-invited later

#### Scenario: Self-joining a public campaign
- GIVEN a campaign marked as public
- WHEN a registered user requests to join
- THEN they are added with the Visitor role
- AND the DM MAY have configured auto-accept or manual approval

