## ADDED Requirements

### Requirement: relation list shows entity names

The `relation list` command SHALL display entity names instead of raw UUIDs in the tabular output.

#### Scenario: names shown in table

- **WHEN** user runs `aleph relation list --campaign <id>` without `--json`
- **THEN** the source and target columns show entity names (e.g. "Diana", "Hotman") instead of UUIDs
- **THEN** if a name cannot be resolved, the UUID is shown as fallback

#### Scenario: JSON output unchanged

- **WHEN** user runs with `--json`
- **THEN** the raw entity UUIDs are preserved in the output

### Requirement: character connections shows entity names

The `character connections` command SHALL display the target entity name instead of the raw `targetEntityId` UUID.

#### Scenario: name shown in connections table

- **WHEN** user runs `aleph character connections <slug> --campaign <id>` without `--json`
- **THEN** the target column shows the entity name
- **THEN** if a name cannot be resolved, the UUID is shown as fallback

#### Scenario: JSON output unchanged

- **WHEN** user runs with `--json`
- **THEN** the raw `targetEntityId` UUID is preserved
