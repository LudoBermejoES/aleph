# Delta for Worldbuilding Wiki

## ADDED Requirements

### Requirement: Aho-Corasick Implementation

The system SHALL use an Aho-Corasick automaton for entity name matching.

#### Scenario: Building the automaton from entity names
- GIVEN a campaign with multiple wiki entities each having a name and optional aliases
- WHEN the automaton is built or rebuilt
- THEN all entity names and aliases are inserted as patterns in the Aho-Corasick automaton
- AND the build completes in sub-second time for up to 10,000 patterns

#### Scenario: Matching entity mentions in content
- GIVEN a built Aho-Corasick automaton and a block of markdown text
- WHEN the text is scanned for matches
- THEN all occurrences of entity names and aliases are identified with their positions
- AND matching is case-insensitive
