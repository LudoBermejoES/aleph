# graph-enhancements Specification

## Purpose

Improve the campaign relationship graph with ideas drawn from Alkemion Studio's visual design approach. Alkemion is a TTRPG adventure-design tool that demonstrates several interaction and visual patterns directly applicable to Aleph's graph view. This spec captures improvements that are scoped, practical, and meaningfully improve the DM's ability to explore and understand campaign relationships.

The improvements are grouped into five areas:

1. Node visual variants (card-style layout option)
2. Edge label improvements (always-visible short labels, directional clarity)
3. Mini-map for large graphs
4. Type-based filtering UX improvements
5. "Alternate summary" for board card display

---

## Requirement: Node card layout option

The system SHALL offer a "card" display mode for graph nodes that shows the entity name, type badge, and a one-line summary directly on the node, in addition to the current compact circle/avatar layout.

**Rationale:** Alkemion's Content Card layout lets GMs see node content without clicking. For Aleph's graph, showing names and a brief summary on the node itself lets DMs orient quickly in a large campaign graph without relying only on hover tooltips.

### Scenario: Toggle between compact and card layouts

- **GIVEN** the campaign graph page is open
- **WHEN** the user clicks the "Card view / Compact view" toggle button in the graph toolbar
- **THEN** all nodes switch between compact (circle with portrait/icon) and card (rectangular card with name, type badge, and summary)
- AND the toggle state is persisted in `localStorage` keyed by campaign ID

### Scenario: Card nodes render at fixed width

- **GIVEN** card layout is active
- **WHEN** nodes are rendered
- **THEN** all card nodes have a fixed width of 160px and auto-height based on content
- AND the force simulation uses a bounding-circle collision radius of `max(80, height/2) * 1.1`
- AND cards with portraits show a 32×32px thumbnail left of the name

### Scenario: Card layout falls back gracefully when no summary exists

- **GIVEN** card layout is active and a node has no `summary` and no `boardSummary`
- **WHEN** the node is rendered
- **THEN** the card shows only the entity name and type badge
- AND the card height adjusts to fit without a summary row

### Scenario: Card layout is disabled in Cytoscape mode

- **GIVEN** a campaign graph with more than 500 nodes (Cytoscape fallback mode)
- **WHEN** the card layout toggle is visible
- **THEN** the toggle is disabled
- AND a tooltip reads "Card layout unavailable for large graphs"

---

## Requirement: Edge style variants by relation type

The system SHALL apply distinct line styles to edges based on their relation type category, making relationship semantics readable at a glance without requiring hover interaction.

**Rationale:** Alkemion uses solid/dashed/dotted lines plus directional head shapes (arrow, circle, diamond) to communicate relationship semantics visually. Currently Aleph uses only color to distinguish relation types; adding line style provides a second visual channel useful for colorblind users and denser graphs.

### Scenario: Line styles applied per relation category

- **GIVEN** edges rendered in the campaign graph
- **WHEN** the graph loads
- **THEN** edges receive line styles according to this mapping:

| Category                 | stroke-dasharray | Markers                  |
| ------------------------ | ---------------- | ------------------------ |
| ally / allied_with       | none             | arrow both ends          |
| enemy / at_war_with      | none             | arrow both ends          |
| rival                    | 8,4              | arrow both ends          |
| mentor / student         | none             | arrow toward student end |
| family (all subtypes)    | none             | none                     |
| located_in / occurred_at | 2,4              | arrow toward location    |
| owns / created_by        | 8,4              | arrow toward owner       |
| custom                   | none             | arrow both ends          |

- AND existing `RELATION_TYPE_COLORS` color coding is preserved alongside the line style

### Scenario: SVG markers defined in defs

- **GIVEN** the `EntityGraphView` component mounts
- **WHEN** the SVG is initialised
- **THEN** arrow, diamond, and circle marker definitions are added to the SVG `<defs>` block
- AND each edge references the correct marker via `marker-end` and/or `marker-start` attributes

### Scenario: Line style legend entries updated

- **GIVEN** the GraphLegend component renders
- **WHEN** the graph contains edges with varied line styles
- **THEN** each legend entry shows a short line sample (solid, dashed, or dotted) next to the color swatch
- AND the line sample matches the actual style applied to edges of that type

---

## Requirement: Mini-map navigation panel

The system SHALL show a mini-map thumbnail of the full graph with a viewport indicator when the graph has more than 30 nodes, helping DMs navigate large campaign webs.

**Rationale:** Alkemion's board supports scroll/pan navigation across large canvases. Aleph's graph for large campaigns (30–500 nodes) can disorient users after zooming. A mini-map provides spatial orientation and a quick way to jump to an area of the graph.

### Scenario: Mini-map appears for graphs with 30+ nodes

- **GIVEN** a campaign graph with 30 or more visible nodes
- **WHEN** the graph renders
- **THEN** a mini-map panel appears in the bottom-right corner of the graph container
- AND the mini-map shows a scaled-down representation of the full graph layout (nodes as dots, edges as thin lines)
- AND a semi-transparent rectangle on the mini-map indicates the current viewport region

### Scenario: Mini-map is hidden for small graphs

- **GIVEN** a campaign graph with fewer than 30 visible nodes
- **WHEN** the graph renders
- **THEN** no mini-map is shown
- AND no space is reserved for it

### Scenario: Clicking the mini-map pans the main graph

- **GIVEN** the mini-map is visible
- **WHEN** the user clicks a location on the mini-map
- **THEN** the main graph viewport pans so the clicked location becomes the center of the visible area
- AND the viewport rectangle on the mini-map updates to reflect the new position

### Scenario: Mini-map viewport indicator updates during pan/zoom

- **GIVEN** the mini-map is visible and the user pans or zooms the main graph
- **WHEN** the pan or zoom ends
- **THEN** the viewport rectangle on the mini-map redraws to reflect the current visible area
- AND the update occurs within one animation frame (no visible lag)

### Scenario: Mini-map can be collapsed

- **GIVEN** the mini-map is visible
- **WHEN** the user clicks a collapse/expand chevron on the mini-map panel
- **THEN** the mini-map collapses to a small icon button
- AND the collapsed state is saved in `localStorage`

---

## Requirement: Improved type filter UX with icon chips

The system SHALL replace the current entity type filter checkboxes with icon chip buttons that match the entity type icons used elsewhere in Aleph, and SHALL add a "show only connected nodes" toggle.

**Rationale:** Alkemion's node tree uses a type dropdown with visual indicators. Aleph currently uses plain checkboxes for type filtering. Replacing these with icon chips (matching the ICONS constant used across the app) makes the filter bar more compact and visually consistent. Adding a "connected only" toggle addresses the common need to hide isolated nodes.

### Scenario: Entity type filter chips rendered

- **GIVEN** the campaign graph page is open
- **WHEN** the graph toolbar is rendered
- **THEN** each entity type is shown as a pill/chip button containing the type's icon and short label
- AND active types are visually highlighted (filled background)
- AND inactive types appear dimmed (outline style)
- AND the chips use the same icons as `ICONS` in `app/utils/icons.ts`

### Scenario: Clicking a chip toggles that type

- **GIVEN** the type filter chips are visible
- **WHEN** the user clicks an active chip
- **THEN** that entity type is hidden from the graph
- AND nodes of that type disappear (with a brief fade)
- AND edges to/from those nodes also disappear

### Scenario: "All" shortcut chip

- **GIVEN** the type filter chips are visible
- **WHEN** the user clicks an "All" chip at the start of the chip row
- **THEN** all entity types are made visible
- AND all chips become active

### Scenario: "Connected only" toggle

- **GIVEN** the campaign graph is rendered
- **WHEN** the user activates the "Connected only" toggle in the toolbar
- **THEN** nodes with zero edges (isolated nodes) are hidden from the graph
- AND the graph re-layouts to use the freed space
- AND a count badge shows how many nodes were hidden (e.g., "3 hidden")

### Scenario: Filter state persists per campaign

- **GIVEN** a user has set type filters and the "connected only" toggle on a campaign graph
- **WHEN** the user navigates away and returns to the graph
- **THEN** the same filter state is restored from `localStorage`

---

## Requirement: Node "board summary" field for card display

The system SHALL add a `boardSummary` optional text field to entities, used exclusively for the card layout in the graph view, allowing DMs to write a short board-optimised description separate from the full entity content.

**Rationale:** Alkemion has "Content Card Alternative Versions" — shorter text specifically for the visual board. For Aleph, the entity `summary` field is already used for wiki previews and search results; overloading it for graph cards could push DMs to keep summaries very short. A separate `boardSummary` (max 120 chars) lets DMs write an at-a-glance description optimised for the board without constraining the main summary.

### Scenario: boardSummary stored per entity

- **GIVEN** a DM editing an entity
- **WHEN** they fill in the "Graph label" field (max 120 chars, shown in entity edit form under Summary)
- **THEN** the value is saved to the `board_summary` column on the `entities` table
- AND the field is optional; existing entities default to `null`

### Scenario: boardSummary used in card layout

- **GIVEN** the graph card layout is active
- **WHEN** rendering a node for an entity that has `boardSummary` set
- **THEN** the card displays `boardSummary` instead of the main `summary`
- AND if `boardSummary` is null, the card falls back to the first 80 chars of `summary`
- AND if both are null, only the name and type badge are shown

### Scenario: boardSummary exposed in graph API

- **GIVEN** an authenticated request to `GET /api/campaigns/{id}/graph`
- **WHEN** the response is serialised
- **THEN** each node object includes a `boardSummary` field (string or null)

### Scenario: boardSummary not shown in wiki or search

- **GIVEN** the wiki entity detail page or global search results
- **WHEN** entity summaries are displayed
- **THEN** `boardSummary` is NOT used; only the main `summary` field is shown
- AND `boardSummary` does not appear as a searchable field

---

## Non-goals

The following Alkemion features were considered but are explicitly out of scope for this spec:

- **Interactive map with POIs** — Aleph already has a maps feature; integrating map POIs into the graph is a separate initiative tracked under `maps` spec.
- **Group widgets / visual clustering boxes** — The existing convex hull org clustering covers the core need; draggable group containers add significant complexity for uncertain benefit.
- **Multiple independent link tokens between the same node pair** — Aleph's current model of one relation record per pair with forward/reverse labels is sufficient.
- **Custom node types** — Entity types in Aleph are application-defined; user-defined types are a broader data model change outside this scope.
- **Themes per graph** — Campaign-wide themes are handled by the `campaign-themes` spec.
