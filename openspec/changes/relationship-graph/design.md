# Design: Relationship Graph

## Technical Approach

### Relation Storage

- `relation_types` table: `id, campaign_id, forward_label, reverse_label, is_builtin, color, icon, sort_order`
- `entity_relations` table: `id, campaign_id, source_entity_id, target_entity_id, relation_type_id, attitude (-100 to 100), description, metadata_json, visibility, created_at, updated_at`
- Relations are stored as directed rows but conceptually bidirectional: querying entity A's relations returns both rows where A is source and rows where A is target (with label flipped to reverse)

### Built-in Relation Types

17 seeded types created per campaign:

| Forward | Reverse |
|---------|---------|
| ally of | ally of |
| enemy of | enemy of |
| parent of | child of |
| sibling of | sibling of |
| spouse of | spouse of |
| mentor of | student of |
| vassal of | liege of |
| employer of | employee of |
| member of | has member |
| leader of | led by |
| trade partner of | trade partner of |
| rival of | rival of |
| worships | worshipped by |
| created | created by |
| owns | owned by |
| guards | guarded by |
| haunts | haunted by |

### Attitude Scoring

- Integer range: -100 (hostile) to +100 (devoted)
- Edge color interpolation: red (-100) → orange (-50) → gray (0) → light green (+50) → green (+100)
- Attitude is optional; null means unrated (gray edge, no score display)

### Visibility

- Relations inherit the campaign's RBAC model
- `visibility` field: `public` (everyone), `dm` (DM only), `players:user_id,user_id` (specific players)
- Server filters relations from API responses based on requesting user's role

### Graph Rendering

**Primary: v-network-graph** (Vue 3, SVG-based)
- Nodes: entity name + type icon, colored by entity type
- Edges: labeled with relation type, colored by attitude score
- Layout: force-directed (d3-force) for organic spacing
- Interactions: zoom (scroll), pan (drag canvas), drag nodes, click node to navigate to entity

**Fallback: cytoscape.js** (Canvas-based, >500 nodes)
- Same data model, different renderer
- Triggered automatically when node count exceeds threshold
- Uses `cose-bilkent` layout for better large-graph performance

### Graph Views

1. **Entity-centered**: Given one entity, fetch all direct relations (1 hop). Render the focal entity centered with connected entities around it.
2. **Campaign-wide**: Fetch all entities and relations for the campaign. Filter UI: entity type checkboxes, relation type checkboxes, attitude range slider.

### Service Layer (TDD)

Business logic extracted into `server/services/relationships.ts` -- pure functions tested in isolation:

- `getRelationLabel(relation, fromEntityId)` -- returns forward or reverse label
- `validateRelationType(type)` -- validates against built-in + custom types
- `computeAttitudeColor(score)` -- maps -100..+100 to color

Architecture: Write unit tests first (TDD red phase), then implement service functions (green phase), then refactor API handlers to call services. API handlers stay thin -- they call services + DB, return results.

Test layers:
1. **Unit tests**: service functions in isolation (no DB, no server)
2. **Schema tests**: DB constraints and cascades (`:memory:` SQLite)
3. **Integration tests**: API contracts against running server

### API Endpoints

```
GET/POST       /api/campaigns/:id/relations
GET/PUT/DELETE /api/campaigns/:id/relations/:relId
GET            /api/campaigns/:id/entities/:slug/relations    # entity-centered
GET            /api/campaigns/:id/relation-types
POST           /api/campaigns/:id/relation-types              # custom type
GET            /api/campaigns/:id/graph                       # full graph data
```
