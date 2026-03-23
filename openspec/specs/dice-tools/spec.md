# dice-tools Specification

## Purpose
TBD - created by archiving change campaign-manager-study. Update Purpose after archive.
## Requirements
### Requirement: Dice Roller

The system SHALL provide an integrated dice roller accessible from anywhere in the application.

#### Scenario: Basic dice roll
- GIVEN any authenticated campaign member
- WHEN they open the dice roller and select dice (d4, d6, d8, d10, d12, d20, d100)
- THEN they can set the number of dice and click Roll
- AND individual die results and the total are displayed
- AND dice results include a visual animation

#### Scenario: Formula-based rolls
- GIVEN a user entering a dice formula
- WHEN they type a formula like "2d6+4", "1d20+5", "4d6kh3" (keep highest 3), "2d10!" (exploding)
- THEN the system parses and evaluates the formula
- AND the breakdown shows: individual dice values, modifiers, and final total

#### Scenario: Custom dice
- GIVEN a user needing non-standard dice
- WHEN they enter a custom die size (e.g., d3, d17, d36)
- THEN the system rolls a random number from 1 to N

#### Scenario: Roll logging
- GIVEN a user rolling dice during a session
- WHEN the roll completes
- THEN the roll is optionally logged to the active session with: formula, result, roller name, timestamp
- AND logged rolls are visible to all campaign members in the session feed

#### Scenario: Quick-roll from stat blocks
- GIVEN a character or creature with stats displayed
- WHEN a user clicks a stat value or ability (e.g., "Athletics +5")
- THEN a d20+5 roll is automatically triggered
- AND the result is displayed inline

### Requirement: Whiteboard / Toolboard

The system SHALL support a freeform visual workspace for DM use during sessions.

#### Scenario: Creating a toolboard
- GIVEN a DM preparing for a session
- WHEN they create a new toolboard
- THEN they get a freeform canvas where they can place:
  - Sticky notes (colored, with text)
  - Images (from uploads or asset library)
  - Freehand drawing zones (sketch tool)
  - Custom meters (tracking points, resources, timers)
  - Text labels

#### Scenario: Using a toolboard during play
- GIVEN an active toolboard
- WHEN the DM interacts with it during a session
- THEN all elements are draggable and resizable
- AND changes are saved automatically
- AND the DM can optionally share the toolboard view with players (read-only)

#### Scenario: Multiple pre-configured toolboards
- GIVEN a DM with different encounters prepared
- WHEN they switch between toolboards
- THEN each toolboard retains its state independently
- AND toolboards can be named and organized in a list

### Requirement: Random Generators

The system SHALL support random content generators for DM improvisation.

#### Scenario: Built-in generators
- GIVEN the system provides generators for: names (fantasy, sci-fi, historical), tavern names, NPC traits, rumors, loot tables, weather
- WHEN the DM triggers a generator
- THEN a random result is displayed
- AND the result can be: copied, inserted into the current editor, or saved as a new entity

#### Scenario: Custom generators
- GIVEN a DM wanting to create a custom generator
- WHEN they define a generator with: name, tables (arrays of options), and optional weighting
- THEN the generator is available in the generator panel
- AND it can use nested tables (e.g., "{race} {profession} named {name}")

#### Scenario: Generator integration with entities
- GIVEN a generated result (e.g., "Grimhilda the Dwarven Blacksmith")
- WHEN the DM clicks "Save as Entity"
- THEN a new character entity is created pre-filled with the generated content
- AND the entity markdown file is created following the standard template

