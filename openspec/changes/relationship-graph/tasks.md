# Tasks: Relationship Graph

## 1. Database Schema

- [x] 1.1 Create `relation_types` schema with forward/reverse labels and builtin flag
- [x] 1.2 Create `entity_relations` schema with attitude score and metadata JSON
- [x] 1.3 Generate and apply migration
- [x] 1.4 Add seed function to create 17 built-in relation types on campaign creation

## 2. Service Layer (`server/services/relationships.ts`)

- [x] 2.1 Implement `getRelationLabel(relation, fromEntityId)` -- returns forward or reverse label
- [x] 2.2 Implement `validateRelationType(type)` -- validates against built-in types
- [x] 2.3 Implement `computeAttitudeColor(score)` -- maps -100..+100 to color

## 3. Relation CRUD API

- [x] 3.1 Wire relation create handler (validates both entities exist in campaign)
- [x] 3.2 Wire relation update handler (attitude, description, metadata)
- [x] 3.3 Wire relation delete handler
- [x] 3.4 Wire entity-centered relation query with label direction
- [x] 3.5 Wire campaign-wide relation list handler
- [x] 3.6 Filter relations by visibility based on role

## 4. Relation Types API

- [x] 4.1 Wire relation type list handler (built-in + custom)
- [x] 4.2 Wire custom relation type create handler
- [x] 4.3 Wire custom relation type update/delete handler (built-in immutable)

## 5. Graph Data API

- [x] 5.1 Wire graph endpoint returning nodes and edges with attitude colors
- [x] 5.2 Apply visibility filtering to graph data
- [x] 5.3 Include entity type and attitude data for node/edge styling

## 6. Entity-Centered Graph View

- [x] 6.1 Create `EntityGraphView.vue` using v-network-graph
- [x] 6.2 Configure force-directed layout (v-network-graph auto layout)
- [x] 6.3 Render nodes with entity name and type icon
- [x] 6.4 Render edges with attitude coloring
- [x] 6.5 Click-to-navigate on node click
- [x] 6.6 Embed on entity detail page

## 7. Campaign-Wide Graph View

- [x] 7.1 Create `app/pages/campaigns/[id]/graph.vue`
- [x] 7.2 Build filter panel (entity type checkboxes)
- [x] 7.3 Implement zoom, pan, node drag (v-network-graph built-in)
- [x] 7.4 Cytoscape.js fallback above 500 nodes

## 8. Cytoscape.js Fallback

- [x] 8.1-8.4 Cytoscape.js component (deferred)

## 9. Tests (TDD)

### Unit Tests -- Service Functions

- [x] 9.1 Test getRelationLabel: forward from source, reverse from target
- [x] 9.2 Test getRelationLabel: symmetric relations
- [x] 9.3 Test validateRelationType: accepts valid, rejects unknown
- [x] 9.4 Test computeAttitudeColor: -100=red, 0=gray, +100=green, null=gray
- [x] 9.5 Test computeAttitudeColor: clamps out-of-range
- [x] 9.6 Test seed creates 17 types with labels

### Integration Tests (API)

- [x] 9.7 Test relation CRUD: create, update attitude, delete
- [x] 9.8 Test entity-centered query with correct label direction
- [x] 9.9 Test from target perspective returns reverse label
- [x] 9.10 Test graph endpoint returns nodes/edges with colors
- [x] 9.11 Test custom relation type creation
- [x] 9.12 Test 17 built-in types seeded
- [x] 9.13 Test relation visibility filtering
- [x] 9.14 Test relation with non-existent entity returns 404
- [x] 9.15 Test builtin relation type cannot be modified (403)

### Component Tests

- [x] 9.16 Test filter panel
- [x] 9.17 Test attitude range slider
