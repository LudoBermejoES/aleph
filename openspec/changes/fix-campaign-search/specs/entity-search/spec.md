## ADDED Requirements

### Requirement: The search index SHALL NOT expose Narrator-only content

Content the viewer's role is not permitted to read SHALL NOT be reachable through search —
neither in a returned excerpt nor by the existence of a result.

Measured 2026-08-24: `indexEntity` writes raw markdown into `entities_fts.body`, secret
blocks included, and `search.ts:313` returns a snippet over that column. A query for a word
that occurs **only** inside a `:::secret{.dm}` block returns a result whose excerpt quotes
the secret text. The response-level filter added earlier catches only the case where the
block's fence falls inside the snippet window. `embeddings.ts:126` embeds `name\nbody`
unfiltered and has the same hole.

#### Scenario: A term occurs only inside a secret block

- **WHEN** a viewer without Narrator access searches for a term that appears only inside a
  secret block
- **THEN** no result SHALL be returned for that entity on account of that term
- **AND** no excerpt SHALL contain any part of the secret block

#### Scenario: The semantic arm is not a second door

- **WHEN** the same query is made against the semantic search
- **THEN** it SHALL be subject to the same restriction

### Requirement: Search SHALL match the morphology of the language it indexes

The index SHALL match inflected forms of the language its content is written in, and SHALL
NOT rely on an analyser built for a different language.

Measured against FTS5 with the configured `porter unicode61`: plurals (`muertos`/`muerto`)
and diacritics (`Inés`/`Ines`) do resolve, so the search appears to work; Spanish verb and
derivational morphology does not — `asesinar`/`asesinó`, `desaparecer`/`desapareció`,
`correr`/`corriendo`, `asesina`/`asesino`, `sangre`/`sangrienta` all fail.

The per-column BM25 weighting is out of scope and SHALL NOT change: it is measured and
sound, and changing it at the same time would make the improvement unattributable.

#### Scenario: A verb is searched in a different form than it was written

- **WHEN** a user searches for the infinitive of a verb that appears conjugated
- **THEN** the entity SHALL be found

#### Scenario: The ranking is unchanged

- **WHEN** the morphology handling changes
- **THEN** the per-column weighting SHALL be unchanged, so any ranking difference is
  attributable to morphology alone
