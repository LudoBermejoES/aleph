# server-utils Specification

## Purpose
TBD - created by archiving change server-refactor. Update Purpose after archive.
## Requirements
### Requirement: Shared permission constants
`server/utils/permissions.ts` SHALL export `ROLE_LEVEL` (alias for existing `ROLE_HIERARCHY`) and `VISIBILITY_MIN_ROLE` so API endpoints can import them instead of defining local copies.

#### Scenario: Constants are importable
- **WHEN** an API endpoint imports `{ ROLE_LEVEL, VISIBILITY_MIN_ROLE }` from `server/utils/permissions`
- **THEN** the values match the previously-inlined copies (dm=5, co_dm=4, editor=3, player=2, visitor=1; public=0, members=2, editors=3, dm_only=4, private=99)

### Requirement: Shared visibility filter builder
`server/utils/permissions.ts` SHALL export `buildVisibilityFilter(role, userId, conditions)` which appends the RBAC `or(inArray(...), and(...))` condition to `conditions` when the role is below `co_dm`.

#### Scenario: Filter applied for low-privilege role
- **WHEN** `buildVisibilityFilter('player', userId, conditions)` is called
- **THEN** a visibility condition is pushed onto `conditions` limiting results to rows the player may see

#### Scenario: No filter for co_dm or higher
- **WHEN** `buildVisibilityFilter('co_dm', userId, conditions)` is called
- **THEN** `conditions` is unchanged (no visibility restriction appended)

### Requirement: Unique slug helper
`server/utils/content-helpers.ts` SHALL export `ensureUniqueSlug(db, campaignId, baseName)` which returns a slug that does not already exist for that campaign, appending a timestamp suffix if needed.

#### Scenario: Slug is unique
- **WHEN** no entity with the generated slug exists in the campaign
- **THEN** the function returns the plain slugified name

#### Scenario: Slug collision resolved
- **WHEN** an entity with the generated slug already exists
- **THEN** the function returns the slug with a timestamp suffix appended

### Requirement: Safe entity file reader
`server/utils/content-helpers.ts` SHALL export `safeReadEntityFile(filePath)` which wraps `readEntityFile` in a try/catch and returns `null` on failure instead of throwing.

#### Scenario: File read succeeds
- **WHEN** the file exists and is valid
- **THEN** the function returns the parsed file object

#### Scenario: File read fails
- **WHEN** the file does not exist or cannot be parsed
- **THEN** the function returns `null` without throwing

