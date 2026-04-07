## ADDED Requirements

### Requirement: Card layout toggle interaction

The system SHALL provide a toolbar toggle that switches the graph between compact node display and card node display, with the state persisted per campaign.

#### Scenario: Toggling card layout from the toolbar

- **GIVEN** the campaign graph is open in compact mode
- **WHEN** the user clicks "Card view" in the graph toolbar
- **THEN** all nodes transition to card display (name, type badge, summary visible on node)
- AND the toolbar button label changes to "Compact view"
- AND the toggle state is saved to `localStorage` under key `graph-layout-mode:{campaignId}`

#### Scenario: Toggling back to compact mode

- **GIVEN** the campaign graph is open in card mode
- **WHEN** the user clicks "Compact view" in the graph toolbar
- **THEN** all nodes return to circle/avatar display
- AND the `localStorage` value is updated to `compact`

### Requirement: Mini-map click-to-pan interaction

The system SHALL allow clicking anywhere on the mini-map to pan the main graph viewport to the clicked position.

#### Scenario: Clicking mini-map to pan

- **GIVEN** the mini-map is visible (graph has 30+ nodes)
- **WHEN** the user clicks a position on the mini-map
- **THEN** the main graph pans so the corresponding world-space position is centered in the viewport
- AND the mini-map viewport rectangle updates immediately to reflect the new position

#### Scenario: Mini-map drag-to-pan

- **GIVEN** the mini-map is visible
- **WHEN** the user drags the viewport rectangle on the mini-map
- **THEN** the main graph pans in real time to follow the drag
- AND releasing the drag finalises the pan position
