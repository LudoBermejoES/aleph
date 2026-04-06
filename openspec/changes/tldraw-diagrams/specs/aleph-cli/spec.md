## MODIFIED Requirements

### Requirement: Diagram CLI commands
New `diagram` command group for managing diagrams from the terminal.

#### Scenario: List diagrams
- **WHEN** `aleph diagram list --campaign <id>` is executed
- **THEN** all diagrams for the campaign are listed with title, type, and last updated date

#### Scenario: Create diagram
- **WHEN** `aleph diagram create --campaign <id> --title <title> [--type <type>]` is executed
- **THEN** a new diagram is created and its ID is printed

#### Scenario: Delete diagram
- **WHEN** `aleph diagram delete <diagramId> --campaign <id> [--yes]` is executed
- **THEN** the diagram is deleted (with confirmation unless `--yes` is passed)

#### Scenario: Generate diagram
- **WHEN** `aleph diagram generate --campaign <id> --type <entity-graph|quest-tree|faction-web|session-timeline> [--title <title>]` is executed
- **THEN** a diagram is generated from campaign data and its ID is printed

#### Scenario: Output formats
- **WHEN** any diagram command includes `--json`
- **THEN** output is formatted as JSON
