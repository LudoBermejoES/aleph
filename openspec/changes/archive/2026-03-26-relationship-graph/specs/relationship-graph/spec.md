# Delta for Relationship Graph

## ADDED Requirements

### Requirement: Graph Rendering

The system SHALL render entity connection graphs using v-network-graph.

#### Scenario: Rendering a relationship graph
- GIVEN a set of entities with defined relationships in a campaign
- WHEN the user opens the relationship graph view
- THEN v-network-graph renders nodes for each entity and edges for each relationship
- AND nodes are labeled with the entity name and type icon

#### Scenario: Interacting with graph nodes
- GIVEN a rendered relationship graph
- WHEN the user clicks on a node
- THEN a detail panel shows the entity summary and its direct connections
- AND the user can navigate to the full entity page from the panel
