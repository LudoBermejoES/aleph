## MODIFIED Requirements

### Requirement: Markdown Rendering with Vue Components

The system SHALL render markdown content with support for embedded Vue components (MDC -- Markdown Components).

#### Scenario: Basic markdown rendering

- GIVEN a `.md` file with standard markdown (headings, bold, italic, lists, tables, links, images, code blocks)
- WHEN the content is rendered in the browser
- THEN all markdown elements display with proper formatting
- AND heading IDs are generated for anchor linking and table-of-contents

#### Scenario: Entity mention rendering

- GIVEN markdown content containing `@[Strahd von Zarovich](characters/strahd-von-zarovich)`
- WHEN rendered
- THEN the mention displays as a styled link with hover preview (name, type, image thumbnail)
- AND clicking navigates to the entity page

#### Scenario: Embedded Vue components in markdown

- GIVEN markdown using MDC syntax for custom components:

  ```markdown
  Here is the map of Barovia:

  ::map-embed{src="maps/barovia" zoom="5" center="village-of-barovia"}
  ::

  The party's health:

  ::meter{type="bar" entity="characters/fighter" field="hp" max-field="max_hp"}
  ::

  Roll for initiative:

  ::dice-roller{formula="1d20+3"}
  ::
  ```

- WHEN rendered
- THEN each `::component` block renders as the corresponding Vue component
- AND components are interactive (map is pannable, meter is editable by authorized users, dice roller is clickable)

#### Scenario: Auto-linked entity names

- GIVEN a markdown paragraph: "The party arrived at Castle Ravenloft where they met Strahd."
- WHEN rendered, and "Castle Ravenloft" and "Strahd" are known entity names/aliases
- THEN both names are automatically converted to entity links with hover previews
- AND auto-linking is case-insensitive ("castle ravenloft" also links)
- AND auto-linking does not apply inside code blocks, frontmatter, or existing links

#### Scenario: Auto-linked entity nicknames

- GIVEN the entity "Philip Holmes" has DB nicknames "Phillip" and "El hermético"
- WHEN a content field containing "El hermético discussed the pact with Phillip" is rendered
- THEN "El hermético" and "Phillip" are both converted to entity links pointing to `philip-holmes`
- AND the `name` attribute of each link reflects the matched text (not the primary entity name)
- AND nicknames are sourced from the `entity_nicknames` table, not from `.md` frontmatter `aliases`
