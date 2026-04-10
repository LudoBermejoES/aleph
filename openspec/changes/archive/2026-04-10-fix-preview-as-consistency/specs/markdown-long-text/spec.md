## ADDED Requirements

### Requirement: Arcs and chapters render description as markdown

Arc and chapter description fields SHALL be rendered using the MDC markdown component, not as plain text. The editor SHALL use `MarkdownEditor` so DMs can write formatted content including secret blocks.

#### Scenario: DM views arc with formatted description

- **WHEN** a DM navigates to `/campaigns/:id/arcs/:slug`
- **THEN** the arc description is rendered as formatted HTML (headings, bold, lists)
- **AND** any `:::secret{.dm}` blocks in the description are visible to the DM

#### Scenario: Player views arc — secret blocks stripped

- **WHEN** a player navigates to `/campaigns/:id/arcs/:slug`
- **THEN** secret blocks in the arc description are not visible
- **AND** public markdown content renders correctly

#### Scenario: DM edits arc description with markdown editor

- **WHEN** a DM opens the arc edit form
- **THEN** the description field uses the MarkdownEditor component with toolbar

---

### Requirement: Quests render description as markdown

Quest description fields SHALL be rendered using the MDC markdown component. The GET endpoint SHALL strip secret blocks based on the caller's role.

#### Scenario: DM views quest with secret block

- **WHEN** a DM navigates to `/campaigns/:id/quests/:slug`
- **THEN** secret blocks in the quest description are visible

#### Scenario: Player views quest — secret blocks stripped

- **WHEN** a player navigates to `/campaigns/:id/quests/:slug`
- **THEN** secret blocks in the quest description are not rendered

---

### Requirement: Locations render content as markdown via MDC

Location content SHALL be rendered using the MDC markdown component instead of `v-html` with newline-to-`<br>` conversion.

#### Scenario: Location content renders markdown formatting

- **WHEN** any user views a location page
- **THEN** markdown syntax (headings, bold, links) in the content renders as formatted HTML

#### Scenario: DM views location — secret blocks visible

- **WHEN** a DM views a location
- **THEN** `:::secret{.dm}` blocks in the content are rendered (already stripped server-side by existing endpoint)

---

### Requirement: Organizations render description as markdown

Organization description fields SHALL be rendered using MDC. The GET endpoint SHALL strip secret blocks.

#### Scenario: Player views organization — secret blocks stripped

- **WHEN** a player views an organization page
- **THEN** secret blocks in the description are not visible

---

### Requirement: Items description uses markdown editor

Item description fields SHALL use `MarkdownEditor` for input and MDC for display.

#### Scenario: User edits item description

- **WHEN** a user opens the item edit form
- **THEN** the description field uses the MarkdownEditor component
