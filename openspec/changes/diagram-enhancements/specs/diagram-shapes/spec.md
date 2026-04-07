## MODIFIED Requirements

### Requirement: npcToken shape props include live-sync identity fields

The `npcToken` shape SHALL store `entityId` and `slug` as its canonical identity. All other display props (`characterName`, `portraitUrl`, `statusBadge`, `tags`) are treated as hydration targets — they may be stale between sessions and are overwritten by the entity hydration system on every canvas load. The shape MUST NOT crash or become invisible if hydration has not yet run.

#### Scenario: npcToken renders with last-known data before hydration

- **GIVEN** a canvas is loading
- **WHEN** the snapshot has loaded but hydration has not yet completed
- **THEN** the NPCToken renders using the persisted `characterName` and `portraitUrl` values

#### Scenario: npcToken props are updated after hydration

- **GIVEN** a character's name changed since the last canvas save
- **WHEN** entity hydration completes
- **THEN** the NPCToken `characterName` prop is updated to the new name via `editor.updateShapes()`

#### Scenario: npcToken shape schema includes statusBadge and tags props

- **WHEN** a new `npcToken` shape is created via drag-and-drop
- **THEN** the shape record in the tldraw store includes `statusBadge: undefined` and `tags: []` as default props

### Requirement: entityCard shape props include live-sync identity fields

The `entityCard` shape SHALL follow the same hydration contract as `npcToken`: `entityId` and `slug` are canonical; `name`, `type`, `portraitUrl` are hydration targets.

#### Scenario: entityCard name updates after entity rename

- **GIVEN** an entityCard for a wiki article that was renamed
- **WHEN** the canvas loads and hydration completes
- **THEN** the card displays the updated article name

### Requirement: locationPin shape props include live-sync identity fields

The `locationPin` shape SHALL store `entityId` and `slug` as canonical identity. `locationName` is a hydration target.

#### Scenario: locationPin name updates after location rename

- **GIVEN** a locationPin for "Old Mill" which was renamed to "Ruined Mill"
- **WHEN** the canvas loads and hydration completes
- **THEN** the pin displays "Ruined Mill"

### Requirement: questNode shape props include live-sync identity and status

The `questNode` shape SHALL store `entityId` and `slug` as canonical identity. `questName` and `status` are hydration targets — `status` determines the left-border color.

#### Scenario: questNode status color updates after quest completion

- **GIVEN** a questNode for an active quest (green border)
- **AND** the quest was marked completed in the campaign
- **WHEN** the canvas loads and hydration completes
- **THEN** the questNode border color reflects the completed status
