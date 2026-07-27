# template-fields-display Specification

## Purpose

A reusable `<TemplateFieldsDisplay>` component that, given a campaign, a template and a set of field values, fetches the template definition and renders the values as a structured properties list -- wired into the character, entity, location and organization detail pages whenever the record's entity carries a `templateId`.

## Requirements

### Requirement: TemplateFieldsDisplay component renders template fields for an entity

The system SHALL provide a reusable `<TemplateFieldsDisplay>` component that, given a `campaignId`, a `templateId`, and a `fieldValues` object, fetches the template definition and renders each field value in a structured properties panel.

#### Scenario: renders text, number, textarea, date fields

- **Given** a template with fields: `background` (text), `level` (number), `bio` (textarea), `dob` (date)
- **And** the entity has `fieldValues = { background: "Farmer", level: 5, bio: "A long story...", dob: "1990-01-01" }`
- **When** the `<TemplateFieldsDisplay>` component is rendered with those props
- **Then** each field's label is displayed alongside its value
- **And** the panel is visible

#### Scenario: renders select field with human-readable label

- **Given** a template field `alignment` of type `select` with options `["Lawful Good", "Neutral", "Chaotic Evil"]`
- **And** the entity has `fieldValues = { alignment: "Neutral" }`
- **When** the component renders
- **Then** the displayed value is "Neutral" (the option label)

#### Scenario: renders checkbox field as yes/no

- **Given** a template field `isImmortal` of type `checkbox`
- **And** the entity has `fieldValues = { isImmortal: true }`
- **When** the component renders
- **Then** the displayed value for `isImmortal` is "Yes" (or a checkmark indicator)

#### Scenario: renders section field as a heading divider

- **Given** a template with fields in order: `section:Combat Stats`, `strength` (number), `dexterity` (number)
- **When** the component renders
- **Then** "Combat Stats" appears as a visual section heading above the following fields
- **And** section fields do not show a value column

#### Scenario: renders entity_reference field as a link

- **Given** a template field `patron` of type `entity_reference`
- **And** the entity has `fieldValues = { patron: "king-aldric" }`
- **When** the component renders
- **Then** "king-aldric" is rendered as a NuxtLink to `/campaigns/{campaignId}/entities/king-aldric`

#### Scenario: renders nothing when templateId is not set

- **Given** the component receives `templateId = null`
- **When** the component renders
- **Then** no template fields panel is shown (component renders nothing)

#### Scenario: handles missing field values gracefully

- **Given** a template with field `background` (text)
- **And** the entity has `fieldValues = {}` (no stored value for `background`)
- **When** the component renders
- **Then** the `background` field row is shown with an empty value (no crash)

#### Scenario: handles template not found gracefully

- **Given** the component receives a `templateId` that does not exist
- **When** the component tries to fetch the template and receives a 404
- **Then** the panel is hidden and no error is shown to the user

### Requirement: Character detail page displays template fields

The system SHALL display template fields on the character detail page when the character's entity has a `templateId`.

#### Scenario: character with template shows fields panel

- **Given** a character entity with `templateId` set to a template "NPC Profile" that has fields `background` (text) and `alignment` (select)
- **And** the character's frontmatter has `fields.background = "Merchant"` and `fields.alignment = "Neutral"`
- **When** I navigate to the character detail page
- **Then** I see a "Properties" panel below the header showing "Background: Merchant" and "Alignment: Neutral"

#### Scenario: character without template shows no fields panel

- **Given** a character entity with `templateId = null`
- **When** I navigate to the character detail page
- **Then** no "Properties" panel is shown

#### Scenario: character API returns templateId and fields

- **Given** a character entity with `templateId = "tmpl-1"` and frontmatter `fields = { background: "Farmer" }`
- **When** I send `GET /api/campaigns/{id}/characters/{slug}`
- **Then** the response includes `templateId: "tmpl-1"` and `fields: { background: "Farmer" }`

### Requirement: Entity detail page displays template fields

The system SHALL display template fields on the entity (wiki) detail page when the entity has a `templateId`.

#### Scenario: entity with template shows fields panel

- **Given** an entity with `templateId` set and `fields = { class: "Warrior", level: 10 }` in its frontmatter
- **When** I navigate to the entity detail page
- **Then** I see a "Properties" panel showing the template field labels and values

#### Scenario: entity without template shows no fields panel

- **Given** an entity with `templateId = null`
- **When** I navigate to the entity detail page
- **Then** no "Properties" panel is shown

### Requirement: Location detail page displays template fields

The system SHALL display template fields on the location detail page when the location entity has a `templateId`.

#### Scenario: location with template shows fields panel

- **Given** a location entity with `templateId` set and template fields `climate` (text) and `population` (number)
- **And** the location's frontmatter has `fields.climate = "Tropical"` and `fields.population = 5000`
- **When** I navigate to the location detail page
- **Then** I see a "Properties" panel showing "Climate: Tropical" and "Population: 5000"

#### Scenario: location without template shows no fields panel

- **Given** a location entity with no `templateId`
- **When** I navigate to the location detail page
- **Then** no template fields panel is shown

### Requirement: Organization detail page displays template fields

The system SHALL display template fields on the organization detail page when the organization entity has a `templateId`.

#### Scenario: organization with template shows fields panel

- **Given** an organization entity with `templateId` set and template fields `motto` (text) and `foundedYear` (number)
- **And** the organization's frontmatter has `fields.motto = "Unity"` and `fields.foundedYear = 1200`
- **When** I navigate to the organization detail page
- **Then** I see a "Properties" panel showing "Motto: Unity" and "Founded Year: 1200"

#### Scenario: organization without template shows no fields panel

- **Given** an organization entity with no `templateId`
- **When** I navigate to the organization detail page
- **Then** no template fields panel is shown
