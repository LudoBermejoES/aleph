# Entity Templates Management -- Spec

## ADDED Requirements

### Requirement: Template list page

The system SHALL provide a page that lists all entity templates for a campaign with their name, entity type, and field count.

#### Scenario: viewing the template list

- **Given** I am a campaign DM
- **And** the campaign has templates "NPC Profile" (entity type: character), "Location Sheet" (entity type: location), and "Item Card" (entity type: item)
- **When** I navigate to `/campaigns/{id}/templates/`
- **Then** I see a page heading "Entity Templates"
- **And** I see all three templates listed with their name and entity type badge
- **And** each template shows its field count

#### Scenario: empty template list

- **Given** I am a campaign DM
- **And** the campaign has no entity templates
- **When** I navigate to `/campaigns/{id}/templates/`
- **Then** I see an empty state with a prompt to create the first template

#### Scenario: creating a new template

- **Given** I am a campaign DM on the templates list page
- **When** I click "New Template"
- **Then** I am navigated to `/campaigns/{id}/templates/new`

#### Scenario: deleting a template

- **Given** I am a campaign DM on the templates list page
- **And** template "Item Card" exists with no entities using it
- **When** I click the delete button on "Item Card"
- **Then** I see a confirmation dialog
- **When** I confirm
- **Then** "Item Card" is removed from the list

### Requirement: Template editor page

The system SHALL provide an editor page for creating and editing entity templates with configurable typed fields that can be reordered.

#### Scenario: creating a template with fields

- **Given** I am a campaign DM on `/campaigns/{id}/templates/new`
- **When** I fill in the template name "NPC Profile" and select entity type "character"
- **And** I add a field with key "background", label "Background", type "text", required: true
- **And** I add a field with key "alignment", label "Alignment", type "select" with options "Lawful Good, Neutral, Chaotic Evil"
- **And** I add a field with key "level", label "Level", type "number"
- **And** I submit the form
- **Then** the template "NPC Profile" is created with 3 fields in order
- **And** I am navigated to the templates list

#### Scenario: editing an existing template

- **Given** I am a campaign DM
- **And** template "NPC Profile" exists with fields "Background" and "Alignment"
- **When** I navigate to `/campaigns/{id}/templates/{templateId}/edit`
- **Then** I see the template name pre-filled as "NPC Profile"
- **And** I see the two fields listed in order with their configuration
- **When** I change the template name to "NPC Character Sheet" and save
- **Then** the template is updated

#### Scenario: adding a section field

- **Given** I am editing a template
- **When** I add a field with type "section" and label "Combat Stats"
- **Then** the field appears as a section divider in the field list
- **And** section fields do not have a "required" toggle

#### Scenario: adding an entity_reference field

- **Given** I am editing a template
- **When** I add a field with type "entity_reference" and label "Patron"
- **Then** the field is configured to reference another entity in the campaign

#### Scenario: reordering fields with up/down buttons

- **Given** I am editing a template with fields "Background" (0), "Alignment" (1), "Level" (2)
- **When** I click the "move up" button on "Alignment"
- **Then** the order becomes "Alignment" (0), "Background" (1), "Level" (2)
- **And** the "move up" button is disabled on the first field
- **And** the "move down" button is disabled on the last field

#### Scenario: removing a field

- **Given** I am editing a template with fields "Background", "Alignment", "Level"
- **When** I click the remove button on "Alignment"
- **Then** "Alignment" is removed from the field list
- **And** the remaining fields are "Background" (0), "Level" (1)

#### Scenario: field type options

- **Given** I am adding a new field to a template
- **When** I open the field type dropdown
- **Then** I see options: text, number, checkbox, select, date, entity_reference, section
- **When** I select "select"
- **Then** an "Options" input appears where I can enter comma-separated values

### Requirement: Applying templates to entities

The system SHALL allow users to select an entity template during entity creation, rendering the template's fields as additional form inputs.

#### Scenario: selecting a template when creating an entity

- **Given** I am on the entity creation page (`/campaigns/{id}/entities/new`)
- **And** templates "NPC Profile" and "Location Sheet" exist
- **When** I see the template picker dropdown
- **And** I select "NPC Profile"
- **Then** additional form fields appear matching the template's fields (Background text input, Alignment select, Level number input)

#### Scenario: creating an entity without a template

- **Given** I am on the entity creation page
- **When** I leave the template picker as "None"
- **Then** only the standard entity fields are shown (name, type, visibility, content)

### Requirement: Template permissions

The system SHALL restrict template creation, editing, and deletion to DM roles, allowing players only read access.

#### Scenario: player cannot manage templates

- **Given** I am a campaign player
- **When** I navigate to `/campaigns/{id}/templates/`
- **Then** I see the template list in read-only mode
- **And** I do not see create, edit, or delete buttons

#### Scenario: DM can manage templates

- **Given** I am a campaign DM
- **When** I navigate to `/campaigns/{id}/templates/`
- **Then** I see create, edit, and delete controls for all templates
