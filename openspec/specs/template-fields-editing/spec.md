# template-fields-editing Specification

## Requirements

### Requirement: TemplateFieldsForm component renders editable inputs for all field types

The system SHALL provide a reusable `<TemplateFieldsForm>` component that, given a `campaignId`, a `templateId`, and a `modelValue` (current field values), fetches the template definition and renders an editable input for each field, emitting `update:modelValue` when any value changes.

#### Scenario: renders text input for text field

- **GIVEN** a template field with `fieldType: "text"` and `key: "background"`
- **WHEN** `TemplateFieldsForm` is rendered with `templateId` set
- **THEN** a text `<input>` is rendered with `v-model` bound to `modelValue.background`

#### Scenario: renders textarea for textarea field

- **GIVEN** a template field with `fieldType: "textarea"` and `key: "bio"`
- **WHEN** `TemplateFieldsForm` is rendered
- **THEN** a `<textarea>` is rendered bound to `modelValue.bio`

#### Scenario: renders number input for number field

- **GIVEN** a template field with `fieldType: "number"` and `key: "level"`
- **WHEN** `TemplateFieldsForm` is rendered
- **THEN** an `<input type="number">` is rendered bound to `modelValue.level`

#### Scenario: renders date input for date field

- **GIVEN** a template field with `fieldType: "date"` and `key: "founded"`
- **WHEN** `TemplateFieldsForm` is rendered
- **THEN** an `<input type="date">` is rendered bound to `modelValue.founded`

#### Scenario: renders select dropdown for select field

- **GIVEN** a template field with `fieldType: "select"`, `key: "faction"`, and `optionsJson: '["Alliance","Horde","Neutral"]'`
- **WHEN** `TemplateFieldsForm` is rendered
- **THEN** a `<select>` is rendered with options Alliance, Horde, Neutral

#### Scenario: renders checkbox for checkbox field

- **GIVEN** a template field with `fieldType: "checkbox"` and `key: "isLegendary"`
- **WHEN** `TemplateFieldsForm` is rendered
- **THEN** an `<input type="checkbox">` is rendered bound to `modelValue.isLegendary`

#### Scenario: renders text input for entity_reference field

- **GIVEN** a template field with `fieldType: "entity_reference"` and `key: "patron"`
- **WHEN** `TemplateFieldsForm` is rendered
- **THEN** a text `<input>` is rendered with a placeholder indicating an entity slug is expected

#### Scenario: renders section divider with no input

- **GIVEN** a template field with `fieldType: "section"` and `name: "Combat Stats"`
- **WHEN** `TemplateFieldsForm` is rendered
- **THEN** "Combat Stats" appears as a section heading with no input element

#### Scenario: pre-populates existing values when editing

- **GIVEN** a template field `background` (text)
- **AND** `modelValue = { background: "Farmer" }` is passed as the initial value
- **WHEN** `TemplateFieldsForm` mounts
- **THEN** the text input for `background` shows "Farmer"

#### Scenario: renders nothing when templateId is null

- **GIVEN** `templateId` prop is null or undefined
- **WHEN** `TemplateFieldsForm` is rendered
- **THEN** nothing is rendered

### Requirement: Template selector with auto-default on create forms

The system SHALL render a template selector dropdown on all entity create forms (character, entity, location, organization). When a default template exists for the entity type, it SHALL be pre-selected automatically on mount.

#### Scenario: default template pre-selected on character create

- **GIVEN** a campaign has a template "NPC Profile" with `isDefault: true` for entity type `character`
- **WHEN** I navigate to the character create page
- **THEN** "NPC Profile" is pre-selected in the template dropdown
- **AND** its fields are rendered as editable inputs immediately

#### Scenario: no default template — selector shows blank

- **GIVEN** a campaign has no default template for entity type `character`
- **WHEN** I navigate to the character create page
- **THEN** the template selector shows "No template" (empty selection)
- **AND** no template fields are rendered

#### Scenario: user can override the pre-selected template

- **GIVEN** a default template is pre-selected
- **WHEN** the user changes the template selector to a different template
- **THEN** the fields for the newly selected template are rendered
- **AND** the previous template's field values are cleared

### Requirement: Template fields form wired into character create/edit

The system SHALL render a template selector and `TemplateFieldsForm` on the character create and edit pages, and save the selected `templateId` and field values when the form is submitted.

#### Scenario: character created with template fields

- **GIVEN** I am on the character create page with template "Hero" selected
- **AND** I fill in field "Hometown" with "Rivendell"
- **WHEN** I submit the form
- **THEN** `POST /api/campaigns/{id}/characters` is called with `templateId` and `fields: { hometown: "Rivendell" }`
- **AND** the character detail page shows the Properties panel with "Hometown: Rivendell"

#### Scenario: character edited with existing template field values pre-populated

- **GIVEN** a character with `templateId` set and `fields: { hometown: "Rivendell" }`
- **WHEN** I navigate to the character edit page
- **THEN** the template is pre-selected in the selector
- **AND** the "Hometown" input shows "Rivendell"

#### Scenario: character updated with changed field values

- **GIVEN** I am on the character edit page with "Hometown" showing "Rivendell"
- **WHEN** I change "Hometown" to "Moria" and save
- **THEN** `PUT /api/campaigns/{id}/characters/{slug}` is called with `fields: { hometown: "Moria" }`
- **AND** the character detail page shows "Hometown: Moria"

### Requirement: Template fields form wired into location create/edit

The system SHALL render a template selector and `TemplateFieldsForm` on the location create and edit pages, and save the selected `templateId` and field values when the form is submitted.

#### Scenario: location created with template fields

- **GIVEN** I am on the location create page with template "Place" selected
- **AND** I fill in field "Climate" with "Tropical"
- **WHEN** I submit the form
- **THEN** `POST /api/campaigns/{id}/locations` is called with `templateId` and `fields: { climate: "Tropical" }`
- **AND** the location detail page shows the Properties panel with "Climate: Tropical"

#### Scenario: location edited with existing template field values pre-populated

- **GIVEN** a location with `templateId` set and `fields: { climate: "Tropical" }`
- **WHEN** I navigate to the location edit page
- **THEN** the template is pre-selected and "Climate" input shows "Tropical"

### Requirement: Template fields form wired into organization create/edit

The system SHALL render a template selector and `TemplateFieldsForm` on the organization create and edit pages.

#### Scenario: organization created with template fields

- **GIVEN** I am on the organization create page with template "Faction" selected
- **AND** I fill in field "Motto" with "Unity"
- **WHEN** I submit the form
- **THEN** `POST /api/campaigns/{id}/organizations` is called with `templateId` and `fields: { motto: "Unity" }`
- **AND** the organization detail page shows "Motto: Unity"

#### Scenario: organization edited with existing template field values pre-populated

- **GIVEN** an organization with `templateId` set and `fields: { motto: "Unity" }`
- **WHEN** I navigate to the organization edit page
- **THEN** the template is pre-selected and "Motto" input shows "Unity"
