## MODIFIED Requirements

### Requirement: Quests CLI Commands

The CLI SHALL provide commands to list, view, create, and update quests within a campaign, including setting and clearing a quest's short description.

#### Scenario: List quests

- GIVEN the user is authenticated
- WHEN the user runs `aleph quest list --campaign <id>`
- THEN the CLI displays a table of quests with name, status, slug, and short description

#### Scenario: Create a quest

- GIVEN the user is authenticated and has editor or higher role
- WHEN the user runs `aleph quest create --campaign <id> --name "Find the Artifact" --status active`
- THEN the server creates the quest
- AND the CLI prints the new quest's slug and a success message

#### Scenario: Update quest status

- GIVEN the user is authenticated and has editor or higher role
- AND a quest exists with the given slug
- WHEN the user runs `aleph quest update --campaign <id> --slug <slug> --status completed`
- THEN the server updates the quest status
- AND the CLI prints a success message

#### Scenario: Create a quest with a short description

- GIVEN the user is authenticated and has editor or higher role
- WHEN the user runs `aleph quest create --campaign <id> --name "El juicio de Otto" --short-description "Symcha Landau reclama juzgar su Avatar."`
- THEN the server stores that short description on the new quest
- AND the CLI prints the new quest's slug and a success message

#### Scenario: Set and clear a short description on an existing quest

- GIVEN the user is authenticated and has editor or higher role
- AND a quest exists with the given slug
- WHEN the user runs `aleph quest update --campaign <id> --slug <slug> --short-description "Una amenaza de muerte sobre Otto."`
- THEN the server stores that short description
- AND WHEN the user runs the same command with `--short-description ""`
- THEN the stored short description becomes null
- AND the quest's long description is unchanged in both cases

#### Scenario: The CLI surfaces a rejected short description

- GIVEN the user is authenticated and has editor or higher role
- WHEN the user runs `aleph quest update` with a `--short-description` longer than 200 characters
- THEN the CLI exits with a non-zero status
- AND the CLI prints the server's validation error rather than reporting success
