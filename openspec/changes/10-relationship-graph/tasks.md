# Tasks: Relationship Graph

## 1. Database Schema

- [ ] 1.1 Create `relation_types` schema with forward/reverse labels and builtin flag
- [ ] 1.2 Create `entity_relations` schema with attitude score and metadata JSON
- [ ] 1.3 Generate and apply migration
- [ ] 1.4 Add seed function to create 17 built-in relation types on campaign creation

## 2. Relation CRUD API

- [ ] 2.1 Implement relation create (validates both entities exist in campaign)
- [ ] 2.2 Implement relation update (attitude, description, metadata, type)
- [ ] 2.3 Implement relation delete
- [ ] 2.4 Implement entity-centered relation query (returns all relations for one entity, flipping reverse labels)
- [ ] 2.5 Implement campaign-wide relation list with filters: entity type, relation type, attitude range
- [ ] 2.6 Filter relations by visibility based on requesting user's role

## 3. Relation Types API

- [ ] 3.1 Implement relation type list (built-in + custom)
- [ ] 3.2 Implement custom relation type create with forward/reverse labels
- [ ] 3.3 Implement custom relation type update/delete (built-in types are immutable)

## 4. Graph Data API

- [ ] 4.1 Implement graph endpoint returning nodes (entities) and edges (relations) in v-network-graph format
- [ ] 4.2 Apply visibility filtering to graph data
- [ ] 4.3 Include entity type and attitude data for node/edge styling

## 5. Entity-Centered Graph View

- [ ] 5.1 Create `EntityGraphView.vue` component using v-network-graph
- [ ] 5.2 Configure force-directed layout with d3-force
- [ ] 5.3 Render nodes with entity name and type icon
- [ ] 5.4 Render edges with relation label and attitude-based coloring
- [ ] 5.5 Implement click-to-navigate on node click
- [ ] 5.6 Embed graph view on entity detail page as a tab/section

## 6. Campaign-Wide Graph View

- [ ] 6.1 Create `app/pages/campaigns/[id]/graph.vue`
- [ ] 6.2 Build filter panel: entity type checkboxes, relation type checkboxes, attitude range slider
- [ ] 6.3 Implement zoom, pan, and node drag interactions
- [ ] 6.4 Add node count detection and automatic fallback to cytoscape.js above 500 nodes

## 7. Cytoscape.js Fallback

- [ ] 7.1 Create `CampaignGraphCytoscape.vue` component
- [ ] 7.2 Configure `cose-bilkent` layout for large graphs
- [ ] 7.3 Match visual styling (node colors, edge colors, labels) with v-network-graph version
- [ ] 7.4 Implement same click-to-navigate interaction
