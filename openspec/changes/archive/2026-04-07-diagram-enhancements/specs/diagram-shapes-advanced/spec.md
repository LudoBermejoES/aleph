## ADDED Requirements

### Requirement: relationshipArrow shape

The system SHALL provide a `relationshipArrow` custom tldraw shape that represents a semantically typed directed relationship between two points on the canvas. The shape stores `relType` (one of: `ally`, `enemy`, `family`, `serves`, `hunts`, `knows`, `rival`, `custom`), `label` (optional string), and `bidirectional` (boolean). Color and line style are derived from `relType`.

#### Scenario: relationshipArrow renders with type-appropriate color and style

- **GIVEN** a `relationshipArrow` with `relType: 'enemy'`
- **WHEN** it is rendered on the canvas
- **THEN** the arrow line is red, solid, with a single arrowhead

#### Scenario: ally type renders green dashed line

- **GIVEN** a `relationshipArrow` with `relType: 'ally'`
- **WHEN** it is rendered
- **THEN** the line is green and dashed

#### Scenario: family type renders blue bidirectional line with no arrowheads

- **GIVEN** a `relationshipArrow` with `relType: 'family'` and `bidirectional: true`
- **WHEN** it is rendered
- **THEN** the line is blue with no arrowheads on either end

#### Scenario: label badge renders at midpoint

- **GIVEN** a `relationshipArrow` with `label: 'knows'`
- **WHEN** it is rendered
- **THEN** a pill-shaped label chip appears at the geometric midpoint of the arrow line

#### Scenario: custom toolbar appears on selection

- **GIVEN** a `relationshipArrow` is selected on the canvas
- **WHEN** the selection is active
- **THEN** a custom toolbar appears above the shape offering relType picker, label input, and bidirectional toggle

#### Scenario: relType change updates color and style immediately

- **GIVEN** a selected `relationshipArrow`
- **WHEN** the user changes `relType` from `ally` to `enemy` in the toolbar
- **THEN** the arrow re-renders immediately in red solid style

### Requirement: regionBox shape

The system SHALL provide a `regionBox` custom tldraw shape that acts as a spatial grouping container. It renders as a large semi-transparent colored rectangle with a corner title label. The shape is always kept at the back of the z-order.

#### Scenario: regionBox renders behind all other shapes

- **GIVEN** a `regionBox` and several NPCToken shapes on the same canvas
- **WHEN** the canvas is rendered
- **THEN** the regionBox is visually behind all other shapes

#### Scenario: regionBox is sent to back on selection

- **GIVEN** a `regionBox` that has been moved above other shapes in z-order
- **WHEN** the user selects it
- **THEN** `editor.sendToBack()` is called immediately, restoring it to the back

#### Scenario: double-click enters label edit mode

- **GIVEN** a `regionBox` on the canvas
- **WHEN** the user double-clicks it
- **THEN** the title label becomes an editable input field

#### Scenario: color picker applies background tint

- **GIVEN** a `regionBox` is selected
- **WHEN** the user picks a color from the custom toolbar
- **THEN** the background tint changes to the selected color at 15% opacity

### Requirement: factionCard shape

The system SHALL provide a `factionCard` custom tldraw shape for organization entities, visually distinct from `entityCard`. It displays a heraldic-style card with a crest image (or letter fallback), faction name, optional alignment badge, and member count.

#### Scenario: factionCard renders crest or letter fallback

- **GIVEN** a `factionCard` with no `crestUrl`
- **WHEN** it is rendered
- **THEN** the crest area shows the first letter of the faction name in a styled banner color

#### Scenario: factionCard renders crest image when provided

- **GIVEN** a `factionCard` with `crestUrl` set
- **WHEN** it is rendered
- **THEN** the crest image fills the banner area with `object-fit: cover`

#### Scenario: alignment badge is shown when set

- **GIVEN** a `factionCard` with `alignment: 'lawful evil'`
- **WHEN** it is rendered
- **THEN** a small red badge with the alignment text appears below the faction name

#### Scenario: member count is shown when > 0

- **GIVEN** a `factionCard` with `memberCount: 12`
- **WHEN** it is rendered
- **THEN** a "12 members" label appears at the bottom of the card

### Requirement: anchorToken shape

The system SHALL provide an `anchorToken` custom tldraw shape that navigates to another diagram within the campaign or to an external URL. It renders as a pill-shaped badge with an ↗ icon and a label. Double-click triggers navigation.

#### Scenario: anchorToken navigates to another diagram on double-click

- **GIVEN** an `anchorToken` with `targetType: 'diagram'` and `targetDiagramId` set
- **WHEN** the user double-clicks the token
- **THEN** the Vue layer receives the `aleph:navigate` event and uses `useRouter().push()` to navigate to `/campaigns/:id/diagrams/:diagramId`

#### Scenario: anchorToken opens external URL in new tab on double-click

- **GIVEN** an `anchorToken` with `targetType: 'external'` and `targetUrl: 'https://example.com'`
- **WHEN** the user double-clicks the token
- **THEN** `window.open(url, '_blank')` is called

#### Scenario: anchorToken shows broken state for missing target diagram

- **GIVEN** an `anchorToken` whose `targetDiagramId` refers to a deleted diagram
- **WHEN** it is rendered
- **THEN** the badge shows a warning icon and "Diagram not found" label

### Requirement: mapToken shape

The system SHALL provide a `mapToken` custom tldraw shape backed by a campaign map. It renders the map's thumbnail image with the map name label. Double-click opens the map in a modal overlay without navigating away from the diagram.

#### Scenario: mapToken renders map thumbnail

- **GIVEN** a `mapToken` with `thumbnailUrl` set
- **WHEN** it is rendered
- **THEN** the thumbnail image fills the shape area with the map name overlaid at the bottom

#### Scenario: double-click opens map modal overlay

- **GIVEN** a `mapToken` on the canvas
- **WHEN** the user double-clicks it
- **THEN** the Vue layer receives `aleph:open-map` event and opens `MapModal.vue` with the map ID, overlaid on the diagram page without navigation

#### Scenario: mapToken shows placeholder when thumbnail unavailable

- **GIVEN** a `mapToken` with no `thumbnailUrl`
- **WHEN** it is rendered
- **THEN** a map-pin icon placeholder with the map name is shown

### Requirement: stickyNote shape

The system SHALL provide a `stickyNote` custom tldraw shape styled as an amber/yellow card for GM annotations. The shape supports inline text editing via a `contenteditable` div.

#### Scenario: stickyNote text is editable inline

- **GIVEN** a `stickyNote` on the canvas
- **WHEN** the user double-clicks it
- **THEN** the text area becomes focused and editable without entering tldraw's built-in text edit mode

#### Scenario: text changes are persisted to the tldraw store

- **GIVEN** a user typing in a `stickyNote`
- **WHEN** 500ms elapses since the last keystroke
- **THEN** `editor.updateShape({ props: { text: newText } })` is called to persist the content

#### Scenario: stickyNote renders with amber styling

- **WHEN** a `stickyNote` is rendered
- **THEN** it displays with an amber/yellow background, a slightly rotated drop shadow, and a monospace-style font

### Requirement: canvasLabel shape

The system SHALL provide a `canvasLabel` custom tldraw shape for bold section header text on the canvas. It renders as large bold text with no background, used for labeling diagram areas.

#### Scenario: canvasLabel renders as large bold text

- **GIVEN** a `canvasLabel` with `text: 'Act I — The Beginning'`
- **WHEN** it is rendered
- **THEN** the text appears in a large (24px+), bold, muted-foreground font with no background or border

#### Scenario: canvasLabel text is editable on double-click

- **GIVEN** a `canvasLabel` on the canvas
- **WHEN** the user double-clicks it
- **THEN** the label text becomes editable inline
