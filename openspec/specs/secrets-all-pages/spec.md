# secrets-all-pages Specification

## Purpose

TBD - created by archiving change secrets-all-pages. Update Purpose after archive.

## Requirements

### Requirement: useSecretReveals composable

A reusable composable SHALL encapsulate the logic for fetching revealed secret block IDs, injecting reveal/unreveal buttons into rendered content, and toggling reveals via API.

#### Scenario: Composable injects reveal buttons into content

- **WHEN** content with `[data-secret-id]` blocks is rendered and the user is DM/Co-DM
- **THEN** each secret block gets a reveal/unreveal toggle button

#### Scenario: Composable toggles reveal state

- **WHEN** DM clicks a reveal button
- **THEN** the composable calls POST or DELETE to `/api/campaigns/:id/entities/:slug/secrets` and updates the button

---

### Requirement: Character detail page shows secret UI

The character detail page SHALL show EntitySecretNotes, EntityPreviewRoleSwitcher, and secret reveal buttons when the user is DM or Co-DM.

#### Scenario: DM views character page

- **WHEN** a DM navigates to `/campaigns/:id/characters/:slug`
- **THEN** the PreviewRoleSwitcher appears at the top
- **AND** secret blocks in rendered content have reveal toggles
- **AND** the SecretNotes section appears at the bottom

#### Scenario: Player views character page

- **WHEN** a player navigates to the same character page
- **THEN** no PreviewRoleSwitcher, no reveal buttons, no SecretNotes section

---

### Requirement: Location detail page shows secret UI

The location detail page SHALL show secret UI for DM/Co-DM users.

#### Scenario: DM views location page

- **WHEN** a DM navigates to `/campaigns/:id/locations/:slug`
- **THEN** PreviewRoleSwitcher, secret reveal buttons, and SecretNotes are visible

---

### Requirement: Session detail page shows secret UI

The session detail page SHALL show secret UI for DM/Co-DM users.

#### Scenario: DM views session page

- **WHEN** a DM navigates to `/campaigns/:id/sessions/:slug`
- **THEN** PreviewRoleSwitcher, secret reveal buttons, and SecretNotes are visible

---

### Requirement: Quest detail page shows secret UI

The quest detail page SHALL show secret UI for DM/Co-DM users.

#### Scenario: DM views quest page

- **WHEN** a DM navigates to `/campaigns/:id/quests/:slug`
- **THEN** PreviewRoleSwitcher, secret reveal buttons, and SecretNotes are visible

---

### Requirement: Arc detail page shows secret UI

The arc detail page SHALL show secret UI for DM/Co-DM users.

#### Scenario: DM views arc page

- **WHEN** a DM navigates to `/campaigns/:id/arcs/:slug`
- **THEN** PreviewRoleSwitcher, secret reveal buttons, and SecretNotes are visible

---

### Requirement: Entity page refactored to use composable

The existing entity detail page SHALL be refactored to use `useSecretReveals` instead of inline reveal logic.

#### Scenario: Entity page still works after refactor

- **WHEN** a DM navigates to `/campaigns/:id/entities/:slug`
- **THEN** all secret functionality works identically to before

---

### Requirement: Organizations excluded

Organization detail pages SHALL NOT show secret UI since organizations lack entity backing.

#### Scenario: DM views organization page

- **WHEN** a DM navigates to `/campaigns/:id/organizations/:slug`
- **THEN** no SecretNotes, no PreviewRoleSwitcher, no reveal buttons are shown
