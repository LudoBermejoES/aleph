## MODIFIED Requirements

### Requirement: Edge color by relation type

The system SHALL color graph edges based on the relation type slug, using a consistent categorical palette across the campaign graph, AND SHALL additionally apply line style variants (solid/dashed/dotted) and directional SVG markers based on relation type category.

#### Scenario: Relation type colors are applied

- **GIVEN** edges in the graph with various relation type slugs
- **WHEN** the campaign graph is rendered
- **THEN** edges are colored according to this mapping:
  | Slug pattern | Color | Hex |
  |---|---|---|
  | ally, allied_with | Green | #22c55e |
  | enemy, at_war_with | Red | #ef4444 |
  | rival | Orange | #f97316 |
  | mentor | Amber | #f59e0b |
  | family:\* | Purple | #a855f7 |
  | member_of, leader_of | Blue | #3b82f6 |
  | located_in, occurred_at | Cyan | #06b6d4 |
  | owns, created_by | Yellow | #eab308 |
  | worships | Pink | #ec4899 |
  | custom | Gray | #6b7280 |
  | (default) | Gray | #6b7280 |

#### Scenario: Relation type line styles are applied

- **GIVEN** edges in the graph with various relation type slugs
- **WHEN** the campaign graph is rendered
- **THEN** edges receive `stroke-dasharray` based on their category:
  | Category | stroke-dasharray |
  |---|---|
  | ally / allied_with | none (solid) |
  | enemy / at_war_with | none (solid) |
  | rival | 8,4 (dashed) |
  | mentor / student | none (solid) |
  | family (all subtypes) | none (solid) |
  | located_in / occurred_at | 2,4 (dotted) |
  | owns / created_by | 8,4 (dashed) |
  | custom | none (solid) |
- AND SVG marker references (`marker-end`, `marker-start`) are set per the directionality rules in the graph-enhancements spec

#### Scenario: Edge style mapping function is pure and testable

- **GIVEN** a relation type slug string
- **WHEN** the `getEdgeStyle(slug)` utility in `app/utils/graph-helpers.ts` is called
- **THEN** it returns `{ color: string, dasharray: string, markerStart: string | null, markerEnd: string | null }`
- AND the function has no side effects and can be unit-tested in isolation
