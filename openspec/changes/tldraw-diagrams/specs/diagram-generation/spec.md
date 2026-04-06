## ADDED Requirements

### Requirement: Generate diagram from campaign data
A server endpoint reads campaign data and produces a tldraw snapshot with laid-out shapes.

#### Scenario: Generate entity relationship diagram
- **WHEN** POST `/api/campaigns/:id/diagrams/generate` is called with `{ type: 'entity-graph', title? }`
- **THEN** all campaign entities and their relationships are queried, shapes are created for each entity (using custom EntityCard shape), arrows connect related entities, a force-directed layout is applied, and the result is saved as a new diagram with the snapshot

#### Scenario: Generate quest dependency tree
- **WHEN** POST `/api/campaigns/:id/diagrams/generate` is called with `{ type: 'quest-tree' }`
- **THEN** all quests are queried with parent-child relationships, QuestNode shapes are created, arrows connect parent to child quests, a top-down tree layout is applied

#### Scenario: Generate faction web
- **WHEN** POST `/api/campaigns/:id/diagrams/generate` is called with `{ type: 'faction-web' }`
- **THEN** all organizations and their members/relationships are queried, shapes represent organizations and key NPCs, arrows show membership and alliances, a radial layout is applied

#### Scenario: Generate session timeline
- **WHEN** POST `/api/campaigns/:id/diagrams/generate` is called with `{ type: 'session-timeline' }`
- **THEN** all sessions are queried in chronological order, shapes represent each session with title and date, arranged left-to-right, key decisions are noted as child shapes

#### Scenario: Empty campaign data
- **WHEN** generation is requested but no relevant data exists (e.g., no entities for entity-graph)
- **THEN** 400 is returned with message explaining no data to generate from

#### Scenario: Auth enforcement
- **WHEN** a player or visitor requests diagram generation
- **THEN** 403 is returned (editor+ required)

### Requirement: Layout algorithms
Server-side layout algorithms position shapes without overlap.

#### Scenario: Force-directed layout
- **WHEN** entity-graph type is generated
- **THEN** shapes are positioned using a force-directed algorithm that spaces nodes evenly and minimizes edge crossings

#### Scenario: Tree layout
- **WHEN** quest-tree type is generated
- **THEN** shapes are arranged in a top-down tree with consistent spacing between levels and siblings

#### Scenario: Generated diagrams are editable
- **WHEN** a generated diagram is opened in the canvas
- **THEN** all shapes can be moved, resized, edited, or deleted — the generation is a starting point, not a live binding
