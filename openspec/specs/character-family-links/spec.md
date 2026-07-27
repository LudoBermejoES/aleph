# character-family-links Specification

## Purpose

Models family relationships between characters on top of `entityRelations` using builtin parent, spouse and sibling relation types seeded per campaign, with helper endpoints that add and remove links, cycle prevention on parent links, soft warnings when birth and death years make a parent link implausible, and cascade deletion when a character is removed.

## Requirements

### Requirement: Builtin family relation types

On campaign creation (and as a one-time backfill migration for existing campaigns), the system SHALL seed three builtin rows in `relationTypes` with `isBuiltin=true`: `parent_of` (forwardLabel="parent of", reverseLabel="child of"), `spouse_of` (forwardLabel="spouse of", reverseLabel="spouse of"), and `sibling_of` (forwardLabel="sibling of", reverseLabel="sibling of"). These slugs MUST be treated as reserved — the API SHALL reject attempts to delete them or rewrite their labels through user-facing endpoints.

#### Scenario: New campaign seeds builtin family types

- **GIVEN** a DM creating a new campaign
- **WHEN** the campaign is created
- **THEN** the campaign's `relationTypes` contains rows with slugs `parent_of`, `spouse_of`, `sibling_of`, all with `isBuiltin=true`

#### Scenario: Backfill migration promotes or inserts for existing campaigns

- **GIVEN** a database with 5 pre-existing campaigns
- **WHEN** the migration runs
- **THEN** each of those 5 campaigns has the three family slugs present with `isBuiltin=true`; any pre-existing user row with the same slug has its `isBuiltin` promoted to `true` rather than being overwritten

#### Scenario: Reject deletion of a builtin family type

- **GIVEN** an authenticated DM
- **WHEN** the DM attempts `DELETE /api/campaigns/[id]/relation-types/parent_of`
- **THEN** the server responds 400 with an error indicating the type is builtin and cannot be deleted

### Requirement: Family link helper endpoints

The server SHALL expose `POST /api/campaigns/[id]/characters/[slug]/family` and `DELETE /api/campaigns/[id]/characters/[slug]/family/[relationId]` that wrap `entityRelations` with family-specific validation. The POST body SHALL accept `{ type: 'parent' | 'child' | 'spouse' | 'sibling', targetCharacterSlug: string }` and SHALL return the created `entityRelations` row (with `relationTypeId` pointing at the appropriate builtin type).

#### Scenario: Add a parent link

- **GIVEN** two characters "Agnus" and "Zen" in the same campaign
- **WHEN** an editor POSTs `{ type: 'parent', targetCharacterSlug: 'agnus' }` to `/characters/zen/family`
- **THEN** a single `entityRelations` row exists with `sourceEntityId=Zen.entityId`, `targetEntityId=Agnus.entityId`, relationType `parent_of`, and the response contains the row

#### Scenario: Add a child link (normalized to parent_of)

- **GIVEN** two characters "Agnus" and "Ben"
- **WHEN** an editor POSTs `{ type: 'child', targetCharacterSlug: 'ben' }` to `/characters/agnus/family`
- **THEN** a single `entityRelations` row exists with `sourceEntityId=Agnus.entityId`, `targetEntityId=Ben.entityId`, relationType `parent_of` — i.e. the `child` type was normalized into a parent-of relation with swapped source/target

#### Scenario: Add a spouse link (symmetric, canonical ordering)

- **GIVEN** two characters whose entity IDs are `"e_zzz"` and `"e_aaa"`
- **WHEN** an editor adds a spouse link between them (in either direction)
- **THEN** exactly one `entityRelations` row is created with `sourceEntityId="e_aaa"` and `targetEntityId="e_zzz"` (canonically ordered ascending by entityId) and type `spouse_of`

#### Scenario: Reject duplicate family link

- **GIVEN** a `parent_of` link already exists from Zen → Agnus
- **WHEN** an editor POSTs the same parent link again
- **THEN** the server responds 409 with an error indicating the link already exists

#### Scenario: Reject self-link

- **GIVEN** a character Ben
- **WHEN** an editor POSTs `{ type: 'spouse', targetCharacterSlug: 'ben' }` to `/characters/ben/family`
- **THEN** the server responds 400 with a self-link error

#### Scenario: Reject family link targeting non-character entity

- **GIVEN** a character Ben and a location "Winterhold"
- **WHEN** an editor POSTs `{ type: 'parent', targetCharacterSlug: 'winterhold' }` (or attempts via any path referencing a non-character entity)
- **THEN** the server responds 400 with an error that family links require both ends to be characters

#### Scenario: Reject family link across campaigns

- **GIVEN** a character "Ben" in campaign A and "Agnus" in campaign B
- **WHEN** an editor in campaign A attempts to link Ben to Agnus
- **THEN** the server responds 404 (target not found in this campaign)

#### Scenario: Delete a family link

- **GIVEN** a family link with id `rel_abc`
- **WHEN** an editor sends `DELETE /api/campaigns/[id]/characters/[slug]/family/rel_abc`
- **THEN** the row is removed and the server responds 204

#### Scenario: Unauthenticated request rejected

- **WHEN** a client without credentials POSTs to the family endpoint
- **THEN** the server responds 401

### Requirement: Cycle prevention on parent links

The server SHALL reject any `parent_of` insert that would create a cycle — that is, if the proposed parent is already a descendant (direct or transitive) of the proposed child. Cycle detection SHALL traverse at most 200 edges defensively.

#### Scenario: Reject direct cycle

- **GIVEN** an existing `parent_of` from Zen → Agnus (Zen is parent of Agnus)
- **WHEN** an editor attempts to add Agnus → Zen as a parent link
- **THEN** the server responds 400 with a cycle error and no row is inserted

#### Scenario: Reject transitive cycle

- **GIVEN** parent chain A → B → C (A is grandparent of C via B)
- **WHEN** an editor attempts to add C → A as a parent link
- **THEN** the server responds 400 with a cycle error

#### Scenario: Allow non-cycling parent insert

- **GIVEN** A is parent of B, no other family links
- **WHEN** an editor adds C as parent of A
- **THEN** the server 201s and stores the row

### Requirement: Soft-warn on implausible years

When inserting a `parent_of` link, if both the parent and child have `birthYear` set and the parent's `birthYear` is greater than or equal to the child's, or if the parent has a `deathYear` set that is less than the child's `birthYear`, the server SHALL allow the insert but include a `warnings: string[]` array in the response describing the anomaly.

#### Scenario: Warn when parent is younger than child

- **GIVEN** parent candidate with `birthYear=2000`, child candidate with `birthYear=1950`
- **WHEN** a `parent_of` link is inserted
- **THEN** the server 201s, stores the link, and the response `warnings` array contains a year-coherence message

#### Scenario: No warning when data is consistent

- **GIVEN** parent `birthYear=1900`, child `birthYear=1925`
- **WHEN** a `parent_of` link is inserted
- **THEN** the response `warnings` is empty or omitted

### Requirement: Cascade delete on character removal

When a character entity is deleted, all `entityRelations` rows pointing to or from that entity SHALL be removed automatically by the existing foreign-key cascade. Family links MUST be covered by this behavior.

#### Scenario: Family links disappear when character deleted

- **GIVEN** character Ben with a `parent_of` link to Carlos and a `spouse_of` link to Branka
- **WHEN** Ben is deleted
- **THEN** both family rows are removed from `entityRelations` and a subsequent `GET .../genealogy` for Carlos or Branka does not reference Ben
