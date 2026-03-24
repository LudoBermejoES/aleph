# Tasks: Relationship Graph

## 1. Database Schema

- [ ] 1.1 Create `relation_types` schema with forward/reverse labels and builtin flag
- [ ] 1.2 Create `entity_relations` schema with attitude score and metadata JSON
- [ ] 1.3 Generate and apply migration
- [ ] 1.4 Add seed function to create 17 built-in relation types on campaign creation

## 2. Service Layer (`server/services/relationships.ts`)

- [ ] 2.1 Implement `getRelationLabel(relation, fromEntityId)` -- returns forward or reverse label
- [ ] 2.2 Implement `validateRelationType(type)` -- validates against built-in + custom types
- [ ] 2.3 Implement `computeAttitudeColor(score)` -- maps -100..+100 to color

## 3. Relation CRUD API

- [ ] 3.1 Wire relation create handler (validates both entities exist in campaign)
- [ ] 3.2 Wire relation update handler (attitude, description, metadata, type)
- [ ] 3.3 Wire relation delete handler
- [ ] 3.4 Wire entity-centered relation query calling `getRelationLabel` service for label direction
- [ ] 3.5 Wire campaign-wide relation list handler with filters: entity type, relation type, attitude range
- [ ] 3.6 Filter relations by visibility based on requesting user's role

## 4. Relation Types API

- [ ] 4.1 Wire relation type list handler (built-in + custom)
- [ ] 4.2 Wire custom relation type create handler with forward/reverse labels
- [ ] 4.3 Wire custom relation type update/delete handler (built-in types are immutable)

## 5. Graph Data API

- [ ] 5.1 Wire graph endpoint returning nodes and edges in v-network-graph format, using `computeAttitudeColor` for edge styling
- [ ] 5.2 Apply visibility filtering to graph data
- [ ] 5.3 Include entity type and attitude data for node/edge styling

## 6. Entity-Centered Graph View

- [ ] 6.1 Create `EntityGraphView.vue` component using v-network-graph
- [ ] 6.2 Configure force-directed layout with d3-force
- [ ] 6.3 Render nodes with entity name and type icon
- [ ] 6.4 Render edges with relation label and attitude-based coloring (using `computeAttitudeColor`)
- [ ] 6.5 Implement click-to-navigate on node click
- [ ] 6.6 Embed graph view on entity detail page as a tab/section

## 7. Campaign-Wide Graph View

- [ ] 7.1 Create `app/pages/campaigns/[id]/graph.vue`
- [ ] 7.2 Build filter panel: entity type checkboxes, relation type checkboxes, attitude range slider
- [ ] 7.3 Implement zoom, pan, and node drag interactions
- [ ] 7.4 Add node count detection and automatic fallback to cytoscape.js above 500 nodes

## 8. Cytoscape.js Fallback

- [ ] 8.1 Create `CampaignGraphCytoscape.vue` component
- [ ] 8.2 Configure `cose-bilkent` layout for large graphs
- [ ] 8.3 Match visual styling (node colors, edge colors, labels) with v-network-graph version
- [ ] 8.4 Implement same click-to-navigate interaction

## 9. Tests (TDD)

### Unit Tests -- Service Functions (Vitest)

- [ ] 9.1 Test `getRelationLabel`: relation with forward="parent of" / reverse="child of" returns "parent of" when queried from source, "child of" when queried from target
- [ ] 9.2 Test `getRelationLabel`: symmetric relations (e.g., "ally of" / "ally of") return same label from either direction
- [ ] 9.3 Test `validateRelationType`: accepts valid built-in and custom types; rejects unknown type IDs
- [ ] 9.4 Test `computeAttitudeColor`: -100 returns red, 0 returns gray, +100 returns green; null returns gray
- [ ] 9.5 Test `computeAttitudeColor`: score outside valid range (-100 to 100) is rejected

### Schema Tests (`:memory:` SQLite)

- [ ] 9.6 Test relation_types table: is_builtin flag; forward/reverse labels required; campaign_id FK
- [ ] 9.7 Test entity_relations table: source/target entity FK constraints; attitude range check (-100 to 100); cascade delete on entity removal
- [ ] 9.8 Test built-in relation type seed: 17 built-in types created on campaign creation with correct forward/reverse labels

### Integration Tests (API)

- [ ] 9.9 Test relation CRUD: create relation between two entities; read returns relation with labels; update attitude score; delete removes relation
- [ ] 9.10 Test entity-centered relation query: entity with 3 relations returns all 3 with correct label direction (forward for outgoing, reverse for incoming)
- [ ] 9.11 Test relation visibility filtering: player cannot see relations involving entities they lack permission for; DM sees all
- [ ] 9.12 Test campaign-wide relation list: filters by entity type, relation type, and attitude range return correct subsets
- [ ] 9.13 Test relation type CRUD: create custom type with forward/reverse labels; built-in type update returns 403
- [ ] 9.14 Test graph data endpoint: returns nodes and edges in v-network-graph format with entity type and attitude data
- [ ] 9.15 Test graph data visibility: graph endpoint excludes nodes and edges the requesting user cannot see
- [ ] 9.16 Test relation validation: creating relation with non-existent entity returns 404; creating relation within wrong campaign returns 400

### Component Tests

- [ ] 9.17 Test filter panel component: entity type checkboxes and relation type checkboxes emit correct filter params
- [ ] 9.18 Test attitude range slider: emits min/max values on change
