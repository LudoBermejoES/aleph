## ADDED Requirements

### Requirement: Quest statuses are declared once

The system SHALL declare the quest status vocabulary — `active`, `completed`, `failed`,
`abandoned` — in exactly one module. The request validation schemas, the transition rules, the
quest form's status control and the tests SHALL all read that declaration. No layer SHALL spell the
vocabulary out independently.

#### Scenario: Every layer accepts the same four values

- **WHEN** a quest is created or updated with each of `active`, `completed`, `failed` and `abandoned`
- **THEN** the request validation accepts all four
- **AND** the transition rules recognise all four as known statuses

#### Scenario: A value outside the vocabulary is rejected on write

- **WHEN** a quest is created with a status of `on_hold`
- **THEN** the server responds with a validation error
- **AND** no quest is created

#### Scenario: The form cannot offer what the server refuses

- **WHEN** the quest form's status control is rendered
- **THEN** its options are exactly the declared vocabulary
- **AND** every option it offers is a value a create or update request would accept

### Requirement: A quest can always be moved out of its current status

The transition rules SHALL allow `active` to reach `completed`, `failed` and `abandoned`, and SHALL
allow `completed`, `failed` and `abandoned` to return to `active`. A status the rules do not
recognise SHALL still be allowed to move to `active`, so that no quest can become permanently
unchangeable.

#### Scenario: An active quest can be closed in any of the three ways

- **WHEN** an active quest is updated to `completed`, to `failed`, or to `abandoned`
- **THEN** each update is accepted

#### Scenario: A completed quest can be reopened

- **GIVEN** a quest whose status is `completed`
- **WHEN** it is updated to `active`
- **THEN** the update is accepted
- **AND** the stored status reads `active`

#### Scenario: A completed quest cannot jump straight to another closed status

- **GIVEN** a quest whose status is `completed`
- **WHEN** it is updated to `failed`
- **THEN** the update is refused
- **AND** the stored status still reads `completed`

#### Scenario: A failed or abandoned quest can be reopened

- **GIVEN** a quest whose status is `failed`
- **WHEN** it is updated to `active`
- **THEN** the update is accepted
- **AND** the same holds for a quest whose status is `abandoned`

#### Scenario: A quest holding an unrecognised status can still be rescued

- **GIVEN** a quest whose stored status is not part of the vocabulary
- **WHEN** it is updated to `active`
- **THEN** the update is accepted
- **AND** the quest is no longer stuck

#### Scenario: Setting a status to itself changes nothing and is not an escape

- **GIVEN** a quest whose stored status is not part of the vocabulary
- **WHEN** it is updated to that same unrecognised status
- **THEN** the request does not leave the quest in a state it cannot leave again

### Requirement: Existing quests outside the vocabulary are migrated

Applying this change SHALL move every stored quest status that is not part of the vocabulary to
`active`, so that narrowing the accepted values cannot strand a row that already exists.

#### Scenario: An on_hold quest becomes active

- **GIVEN** a quest stored with status `on_hold`
- **WHEN** the migration runs
- **THEN** its status reads `active`
- **AND** none of its other fields change

#### Scenario: Quests already in the vocabulary are untouched

- **GIVEN** quests stored as `active`, `completed`, `failed` and `abandoned`
- **WHEN** the migration runs
- **THEN** every one of them keeps the status it had
