## MODIFIED Requirements

### Requirement: relation list human output

The `relation list` tabular output SHALL show entity names in source and target columns instead of UUIDs.

#### Scenario: readable output

- **WHEN** user runs `aleph relation list --campaign <id>` without `--json`
- **THEN** source and target columns contain human-readable entity names
