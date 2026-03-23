# Delta for Dice Tools

## ADDED Requirements

### Requirement: Dice Formula Parser

The system SHALL parse dice notation strings into executable roll instructions.

#### Scenario: Parsing standard dice notation
- GIVEN a dice notation string such as "2d6+4"
- WHEN the parser processes the string
- THEN it produces a structured instruction with count=2, sides=6, and modifier=+4
- AND invalid notation strings result in a descriptive parse error

#### Scenario: Parsing complex expressions
- GIVEN a compound dice notation such as "1d20+5 + 2d6"
- WHEN the parser processes the string
- THEN it produces multiple roll instructions that are evaluated and summed
- AND operator precedence and grouping are respected
