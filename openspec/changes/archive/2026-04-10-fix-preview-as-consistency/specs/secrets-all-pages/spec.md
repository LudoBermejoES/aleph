## MODIFIED Requirements

### Requirement: Character detail page shows secret UI

The character detail page SHALL show PreviewRoleSwitcher, secret reveal buttons, and SecretNotes when the user is DM or Co-DM. Switching the PreviewRoleSwitcher combobox SHALL reactively reload the page content without a full page refresh. The page SHALL also reload correctly when navigated to directly with a `?preview_as=` query parameter.

#### Scenario: DM views character page

- **WHEN** a DM navigates to `/campaigns/:id/characters/:slug`
- **THEN** the PreviewRoleSwitcher appears
- **AND** secret blocks in rendered content have reveal toggles
- **AND** the SecretNotes section appears at the bottom

#### Scenario: Player views character page

- **WHEN** a player navigates to the same character page
- **THEN** no PreviewRoleSwitcher, no reveal buttons, no SecretNotes section

#### Scenario: DM switches preview role via combobox

- **WHEN** a DM selects "Player" in the PreviewRoleSwitcher combobox
- **THEN** the page content reloads without a full browser refresh
- **AND** secret blocks disappear from the rendered content
- **AND** the URL updates to include `?preview_as=player`

#### Scenario: DM navigates directly with preview_as in URL

- **WHEN** a DM navigates to `/campaigns/:id/characters/:slug?preview_as=player`
- **THEN** the content loads already filtered as player view

---

## ADDED Requirements

### Requirement: Arc detail page preview_as reloads reactively

The arc detail page SHALL reload content when the PreviewRoleSwitcher combobox changes, without a full page refresh.

#### Scenario: DM switches preview to player on arc page

- **WHEN** a DM selects "Player" in the PreviewRoleSwitcher on an arc page
- **THEN** the arc description reloads with secret blocks stripped
- **AND** the URL updates to include `?preview_as=player`

---

### Requirement: Quest detail page preview_as reloads reactively

The quest detail page SHALL reload content when the PreviewRoleSwitcher combobox changes.

#### Scenario: DM switches preview to player on quest page

- **WHEN** a DM selects "Player" in the PreviewRoleSwitcher on a quest page
- **THEN** the quest description reloads with secret blocks stripped

---

### Requirement: Location detail page preview_as reloads reactively

The location detail page SHALL reload content when the PreviewRoleSwitcher combobox changes.

#### Scenario: DM switches preview to player on location page

- **WHEN** a DM selects "Player" in the PreviewRoleSwitcher on a location page
- **THEN** the location content reloads with secret blocks stripped

---

### Requirement: Sessions render endpoint exists

A `GET /api/campaigns/:id/sessions/:slug/render` endpoint SHALL exist that returns the session log content with secret blocks stripped for the effective role. It SHALL support the `preview_as` query param for DM/Co-DM.

#### Scenario: DM previews session as player

- **WHEN** a DM requests `/api/campaigns/:id/sessions/:slug/render?preview_as=player`
- **THEN** the response contains the session log with secret blocks removed
- **AND** `previewMode: true` and `effectiveRole: "player"` are in the response

#### Scenario: Player cannot escalate via preview_as

- **WHEN** a player requests the render endpoint with `?preview_as=dm`
- **THEN** the `preview_as` param is ignored
- **AND** the content is stripped as player
