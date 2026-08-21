## ADDED Requirements

### Requirement: Entity creation SHALL reject a type the campaign does not declare

`aleph entity create --type <type>` SHALL validate the type against the types registered for that
campaign and SHALL refuse an unknown one, naming the valid set in the error. Its help text SHALL NOT
advertise as an example any type that is not universally registered.

**The silent write is the defect.** The help read `Entity type (e.g. location, faction, npc)` while
`npc` is not a registered type for `Berlin en tinieblas`, whose set is `character, event, faction,
item, location, lore, note, quest, session`. The CLI accepted `--type npc` and wrote the entity, which
then existed as the only `npc` in a campaign that has no such type — a record the UI cannot
categorise, reachable only through the generic page. Refusing at the point of entry costs one request
and removes the whole class.

#### Scenario: An unregistered type is refused

- **WHEN** `entity create --type npc` runs against a campaign whose types do not include `npc`
- **THEN** the command SHALL exit non-zero without creating anything
- **AND** the error SHALL list the campaign's registered types

#### Scenario: A registered type is accepted

- **WHEN** the type is one the campaign declares
- **THEN** the entity SHALL be created as before

#### Scenario: The help does not suggest an unregistered type

- **WHEN** `entity create --help` is read
- **THEN** the examples SHALL be types that exist across campaigns, and SHALL NOT include `npc`
