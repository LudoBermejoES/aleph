# entity-search Specification

## Purpose

TBD - created by archiving change fix-campaign-search. Update Purpose after archive.

## Requirements

### Requirement: The search index SHALL NOT expose Narrator-only content

Content the viewer's role is not permitted to read SHALL NOT be reachable through search —
neither in a returned excerpt nor by the existence of a result.

Measured 2026-08-24: `indexEntity` writes raw markdown into `entities_fts.body`, secret
blocks included, and `search.ts:313` returns a snippet over that column. A query for a word
that occurs **only** inside a `:::secret{.dm}` block returns a result whose excerpt quotes
the secret text. The response-level filter added earlier catches only the case where the
block's fence falls inside the snippet window. `embeddings.ts:126` embeds `name\nbody`
unfiltered and has the same hole.

Resolved by holding two role-scoped copies of each index (`design.md` D2 option 2, chosen by
the owner): a full one, queried only at `co_dm` and above, and a filtered one built from text
`stripSecretBlocks` has already been applied to. The Narrator keeps searching their own
secrets, which is what a Narrator uses a search box for.

The threshold SHALL be `stripSecretBlocks`'s own, asked rather than restated, so the index
and the response filter cannot come to different answers about the same content. `editor`
(level 3) is below `co_dm` (4) and therefore reads the filtered index, matching the filtered
prose an editor already receives from every other endpoint.

#### Scenario: A term occurs only inside a secret block

- **WHEN** a viewer without Narrator access searches for a term that appears only inside a
  secret block
- **THEN** no result SHALL be returned for that entity on account of that term
- **AND** no excerpt SHALL contain any part of the secret block

#### Scenario: The semantic arm is not a second door

- **WHEN** the same query is made against the semantic search
- **THEN** it SHALL be subject to the same restriction

#### Scenario: The Narrator keeps their own search

- **WHEN** a viewer at `co_dm` or above searches for a term that appears only inside a secret
  block
- **THEN** the entity SHALL be returned, with an excerpt quoting the block

#### Scenario: A caller that does not state a role gets the restricted index

- **WHEN** search is invoked without a role
- **THEN** it SHALL answer from the filtered index

### Requirement: The two copies of the index SHALL NOT be able to diverge

Splitting one index into two creates two things that must agree about the same content. They
SHALL be derived in a single pass from a single entity and written under a single shared
identifier, so that no code path can write one without the other, and a guard SHALL fail when
either copy holds an entity the other does not.

Content equality is deliberately not required — the two bodies are meant to differ. What must
never differ is the SET of entities: a gap there is either a secret still reachable by a
player or a sheet the Narrator can no longer find.

#### Scenario: An entity is indexed, re-indexed, and removed

- **WHEN** any sequence of index, re-index and remove operations is applied
- **THEN** both copies SHALL hold exactly the same set of entities

#### Scenario: The guard is shown failing

- **WHEN** one copy is made to hold an entity the other does not
- **THEN** the guard SHALL report it and the assertion SHALL throw

### Requirement: Search SHALL match the morphology of the language it indexes

The index SHALL match inflected forms of the language its content is written in, and SHALL
NOT rely on an analyser built for a different language.

Measured against FTS5 with the configured `porter unicode61`: plurals (`muertos`/`muerto`)
and diacritics (`Inés`/`Ines`) do resolve, so the search appears to work; Spanish verb
morphology does not — `asesinar`/`asesinó`, `correr`/`corriendo` and `asesina`/`asesino` all
fail through the real query path.

Note, against the proposal's own bench: `desaparecer`/`desapareció` and `sangre`/`sangrienta`
were reported as failures but **already pass in production**. The proposal measured a bare
`MATCH 'term'`; `buildFtsQuery` appends `*`, and porter's English suffix-stripping plus that
prefix happens to reach both. The defect is real and narrower than stated.

The per-column BM25 weighting is out of scope and SHALL NOT change: it is measured and
sound, and changing it at the same time would make the improvement unattributable.

#### Scenario: A verb is searched in a different form than it was written

- **WHEN** a user searches for the infinitive of a verb that appears conjugated
- **THEN** the entity SHALL be found

#### Scenario: What already worked keeps working

- **WHEN** a user searches a plural for a singular, or an unaccented spelling of an accented
  name
- **THEN** the entity SHALL still be found

#### Scenario: The ranking is unchanged

- **WHEN** the morphology handling changes
- **THEN** the per-column weighting SHALL be unchanged, so any ranking difference is
  attributable to morphology alone

### Requirement: A stale index SHALL be rebuilt rather than half-used

An index written by a previous schema cannot answer the questions above. On startup it SHALL
be detected and rebuilt, atomically, and SHALL NOT be left in a state where part of it
answers and part of it does not.

The rebuild SHALL NOT be reconstructed from the filesystem when the stored index already
holds the same text: measured on this project's own database, re-reading 1,495 entity files
and re-embedding them costs ~7 minutes, against 146 ms to migrate 1,383 rows in place.

#### Scenario: Booting against an index from before the split

- **WHEN** the stored index lacks either the second copy or the morphology column
- **THEN** it SHALL be rebuilt from its own stored text, and the fact SHALL be logged

#### Scenario: Booting against a current index

- **WHEN** the stored index already has the current shape
- **THEN** it SHALL be left untouched

#### Scenario: The migration is interrupted

- **WHEN** the process is killed part-way through the rebuild
- **THEN** the previous, working index SHALL remain intact
- **AND** a later start SHALL still perform the migration

#### Scenario: An index is found inconsistent by some other route

- **WHEN** either copy is missing entities the mapping table knows about
- **THEN** the missing rows SHALL be rebuilt from whichever copy still holds the text
- **AND** any entity present in neither SHALL be reported rather than silently skipped

### Requirement: A one-time migration SHALL NOT hold the site down

Work that must happen once SHALL NOT block the server from serving requests, unless it is
required for correctness of the very first request.

The lexical split IS so required — a query reaching a half-migrated index could return a
secret — and is cheap, so it runs before the server accepts a request. The vector half is
not: an incomplete filtered vector table yields FEWER semantic results, never more, so it
SHALL run detached. Measured: 69 s of HTTP 500 on every start when it was awaited.

#### Scenario: Starting with the vector migration outstanding

- **WHEN** the server starts and the filtered vectors have not been built
- **THEN** the server SHALL serve requests immediately
- **AND** the lexical index SHALL already enforce the role split
- **AND** the vector migration SHALL complete in the background and log its outcome
