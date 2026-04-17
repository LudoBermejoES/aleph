## ADDED Requirements

### Requirement: Character demographic fields

The `characters` table SHALL expose three nullable demographic fields — `birthYear` (integer), `deathYear` (integer), and `gender` (text) — readable and writable through the character API and CLI. These fields MUST be optional for backward compatibility with existing characters, and the server MUST persist `gender` as a lowercased, trimmed string.

#### Scenario: Create a character with demographic fields

- **GIVEN** an authenticated DM in a campaign
- **WHEN** the DM creates a character with `birthYear=1970`, `deathYear=2042`, `gender="Female"`
- **THEN** the character record stores `birthYear=1970`, `deathYear=2042`, `gender="female"` and returns the same values in the response

#### Scenario: Update a character's demographic fields

- **GIVEN** an existing character with no demographic data
- **WHEN** an editor sends `PUT /api/campaigns/[id]/characters/[slug]` with `{ birthYear: 985, deathYear: null, gender: "nonbinary" }`
- **THEN** the response 200s, the stored record reflects the new values, and subsequent GETs return them

#### Scenario: Omit demographic fields on update

- **GIVEN** a character with `birthYear=1500`
- **WHEN** a PUT omits the `birthYear` key entirely (not present in the JSON body)
- **THEN** the stored `birthYear` remains `1500` (partial updates do not wipe unspecified fields)

#### Scenario: Null out a demographic field

- **GIVEN** a character with `deathYear=2042`
- **WHEN** a PUT sends `{ deathYear: null }`
- **THEN** the stored `deathYear` becomes `NULL`

#### Scenario: Backward compatibility for existing characters

- **GIVEN** a character created before the migration ran
- **WHEN** a client fetches it after the migration
- **THEN** the response includes `birthYear: null`, `deathYear: null`, `gender: null`

### Requirement: Year coherence validation

The server SHALL hard-reject any write that would result in a character having both `birthYear` and `deathYear` set with `deathYear < birthYear`.

#### Scenario: Reject inconsistent years

- **GIVEN** an authenticated editor
- **WHEN** the editor sends a PUT with `{ birthYear: 2042, deathYear: 1970 }`
- **THEN** the server responds 400 with an error message identifying the year fields, and the character is not modified

#### Scenario: Allow equal years (same-year birth and death)

- **GIVEN** an authenticated editor
- **WHEN** the editor sends a PUT with `{ birthYear: 1945, deathYear: 1945 }`
- **THEN** the server 200s and stores both values

### Requirement: Unauthenticated requests rejected

The demographic fields are only writable via authenticated requests (cookie session or `X-API-Key`). Any unauthenticated request SHALL be rejected with 401.

#### Scenario: Unauthenticated PUT rejected

- **WHEN** a client without credentials sends `PUT /api/campaigns/[id]/characters/[slug]` with demographic fields
- **THEN** the server responds 401 and no modification occurs

### Requirement: Migration preserves existing data

A Drizzle migration SHALL add the three columns to `characters` as nullable with no default, leaving every existing row's demographic fields NULL.

#### Scenario: Migration adds nullable columns

- **GIVEN** a pre-migration database with 42 characters
- **WHEN** the migration runs
- **THEN** all 42 rows remain, schema shows three new nullable columns, and every existing row has NULL for each new column
