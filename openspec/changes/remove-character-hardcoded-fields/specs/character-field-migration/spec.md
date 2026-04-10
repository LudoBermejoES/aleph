## ADDED Requirements

### Requirement: Migrate race, class, alignment column values to entity_fields

The system SHALL, as part of the Drizzle migration that drops the `race`, `class`, and `alignment` columns from the `characters` table, copy any non-null column values into the `entity_fields` table before dropping the columns.

#### Scenario: Character with race value gets an entity_fields row

- **GIVEN** a character row with `race = 'Elf'` and `entity_id = 'abc'`
- **WHEN** the migration runs
- **THEN** an `entity_fields` row exists with `entity_id = 'abc'`, `name = 'race'`, `value = 'Elf'`, `field_type = 'text'`, `template_field_id = NULL`

#### Scenario: Character with class value gets an entity_fields row

- **GIVEN** a character row with `class = 'Wizard'` and `entity_id = 'abc'`
- **WHEN** the migration runs
- **THEN** an `entity_fields` row exists with `entity_id = 'abc'`, `name = 'class'`, `value = 'Wizard'`, `field_type = 'text'`, `template_field_id = NULL`

#### Scenario: Character with alignment value gets an entity_fields row

- **GIVEN** a character row with `alignment = 'Lawful Good'` and `entity_id = 'abc'`
- **WHEN** the migration runs
- **THEN** an `entity_fields` row exists with `entity_id = 'abc'`, `name = 'alignment'`, `value = 'Lawful Good'`, `field_type = 'text'`, `template_field_id = NULL`

#### Scenario: Character with null values gets no entity_fields rows

- **GIVEN** a character row with `race = NULL`, `class = NULL`, `alignment = NULL`
- **WHEN** the migration runs
- **THEN** no `entity_fields` rows are created for this character for race, class, or alignment

#### Scenario: Columns are dropped after data is copied

- **WHEN** the migration completes
- **THEN** the `characters` table no longer has `race`, `class`, or `alignment` columns
