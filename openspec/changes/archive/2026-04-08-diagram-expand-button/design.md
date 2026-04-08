## Context

The diagram page (`diagramId.vue`) already tracks which entity shape is selected via `selectedEntityId`, `selectedEntityType`, `selectedEntitySlug`, `selectedEntityName` refs (added for the "Add Relationship" button). The graph API returns edges keyed as `org-member:<orgId>:<charId>`, `char-location:<entityId>:<locId>`, and `org-location:<orgId>:<locId>`, plus node data with name, slug, type, image.

`app/utils/diagram-layout.ts` exports `radialLayout(centerX, centerY, count, radius)` — a pure function that returns evenly-spaced positions in a circle. `handleEntityDrop` contains the shapeMap and shape-prop construction logic for creating each entity type as a tldraw shape.

## Goals / Non-Goals

**Goals:**

- Show "Expand" button when an org or location shape is selected
- Fetch graph, identify related entities, filter duplicates, create shapes in radial layout
- Draw arrows via syncRelations after expansion

**Non-Goals:**

- Expanding characters (too many relations, would clutter)
- Undo as a single batch (individual shape undo is fine)
- Capping the number of expanded entities (the graph API already limits what's available)
- Providing options for which relation types to expand (expand everything)

## Decisions

### Decision 1: Expand function reads the selected shape's position from the editor

**Chosen:** The expand function gets the selected shape via `editor.getShape(selectedShapeId)` to read its `x` and `y` coordinates. These become the center point for the radial layout. This way the expanded entities radiate from where the selected shape actually is, not from some arbitrary point.

### Decision 2: Entity data comes from graph API nodes, not a separate fetch

**Chosen:** The graph API response already includes node data (`name`, `slug`, `type`, `image`) for every entity involved in an edge. After identifying which entities to expand, their data is read directly from `graphData.nodes[entityId]`. For org nodes (which use `organizations.id`), the data is also in `graphData.nodes`. No separate batch fetch needed.

**Why:** Avoids an extra API call. The graph already has everything needed to construct shapes.

### Decision 3: Shape creation reuses handleEntityDrop's shapeMap pattern

**Chosen:** Extract the shape-prop construction into a local helper or inline it, following the same conventions: `npcToken` for characters (with `characterName`, `portraitUrl`), `locationPin` for locations (with `locationName`), `factionCard` for orgs (with `factionName`). This ensures expanded shapes look identical to manually dropped ones.

### Decision 4: Button placement next to "Add Relationship"

**Chosen:** The "Expand" button sits next to "Add Relationship" in the toolbar, visible only when `selectedEntityType` is `organization` or `location`. It uses `variant="outline"` to distinguish it visually from the primary "Add Relationship" button.

## Risks / Trade-offs

- **Large orgs** → An org with 20+ members expands all of them. Acceptable — user can undo.
- **Overlapping shapes** → If the selected shape is near the edge of the canvas, expanded shapes may be off-screen. Mitigation: the user can zoom out or reflow.
- **Graph cache** → The graph is fetched on every expand click. No caching — keeps it simple and always fresh.
