## ADDED Requirements

### Requirement: A pin's popup SHALL show its linked entity's image and a short text excerpt

A pin whose linked entity has an image SHALL show that image in its popup, not only on the marker.
A pin whose linked entity has readable text (a `location` or `character`'s markdown, or an
`organization`'s description) SHALL show a short, plain-text excerpt of it in the popup. A pin with
no linked entity, or one of a type this requirement does not cover, SHALL show neither.

The popup SHALL have a maximum width, so an image-plus-text card does not grow wider than a small
screen.

#### Scenario: A location pin with an image and public text

- **WHEN** a pin is linked to a location that has an image and a markdown page with no secret
  content
- **THEN** its popup shows the location's image and a short excerpt of its text, in addition to the
  existing name, "Ver entidad" link, and delete affordance

#### Scenario: A character pin

- **WHEN** a pin is linked to a character
- **THEN** its popup shows the character's portrait (if any) and a short excerpt of the character's
  markdown text, using the same rules as a location

#### Scenario: An organization pin

- **WHEN** a pin is linked to an organization
- **THEN** its popup shows the organization's image (if any) and a short excerpt of its
  `description` field

#### Scenario: An entity type with no established text source

- **WHEN** a pin is linked to an entity type other than location, character, or organization
- **THEN** the popup shows no excerpt (no image/type/id fields already established are affected)

#### Scenario: A pin with no linked entity

- **WHEN** a pin has no `entityId`
- **THEN** the popup shows no image and no excerpt, exactly as before this change

### Requirement: The excerpt SHALL NEVER include secret content, and stripping SHALL happen before excerpting

A `location` or `character`'s excerpt SHALL be built from its markdown text only AFTER the same
secret-block stripping rule (`stripSecretBlocks`, gated on the viewer's campaign role) that entity's
own page already applies to it. The excerpt SHALL NOT be built from the raw file content and then
have secrets removed afterward, and it SHALL NOT be able to include any text originating inside a
`:::secret{...}` block the viewer's role does not clear.

An `organization`'s excerpt is built from its `description` column, which has no secret-block
convention; it is not passed through `stripSecretBlocks`. It SHALL still be withheld entirely (along
with the entity's image and type, per the existing visibility join) from a viewer who cannot see
that organization at all.

#### Scenario: A location's first paragraph is secret

- **WHEN** a location's markdown opens with a `:::secret{.dm}` block followed by public text, and
  the viewer's role is below the block's required role
- **THEN** the popup excerpt contains none of the secret block's text
- **AND** it contains the public text that follows it, if it fits within the excerpt length

#### Scenario: A DM-or-above viewer sees the same location

- **WHEN** the same location is viewed by a `dm` or `co_dm` role
- **THEN** the excerpt may include text from the secret block, per the same rule that already
  governs that role reading the location's full page

#### Scenario: An organization the viewer cannot see

- **WHEN** a pin links to an organization whose visibility excludes the current viewer
- **THEN** the popup shows no excerpt for it, exactly as it already shows no image or type

### Requirement: A missing or unreadable entity file SHALL NOT fail the pins request

If a `location` or `character` entity's markdown file cannot be read (missing from disk, permission
error, or any other read failure), that one pin's `entityExcerpt` SHALL be `null`. Every other pin on
the same map SHALL still return normally, including their own excerpts.

#### Scenario: One entity's file is missing

- **WHEN** a map has several pins and one linked entity's markdown file does not exist on disk
- **THEN** the pins request still succeeds
- **AND** every pin except the one with the missing file has its normal fields (including excerpt,
  where applicable)
- **AND** the pin with the missing file has `entityExcerpt: null`

### Requirement: Every field interpolated into the popup HTML SHALL be escaped

The image URL and the excerpt text, like every other field this popup already interpolates, SHALL be
HTML-escaped before being placed into the popup's HTML string.

#### Scenario: An excerpt containing HTML-significant characters

- **WHEN** an entity's text, once flattened to plain text, still contains characters like `<`, `>`,
  `&`, or `"`
- **THEN** the popup HTML contains their escaped form, not the raw characters
