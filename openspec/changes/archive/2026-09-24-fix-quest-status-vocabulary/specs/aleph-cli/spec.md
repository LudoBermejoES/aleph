## MODIFIED Requirements

### Requirement: Quests CLI Commands

The CLI SHALL provide commands to list, view, create, and update quests within a campaign.

#### Scenario: List quests

- GIVEN the user is authenticated
- WHEN the user runs `aleph quest list --campaign <id>`
- THEN the CLI displays a table of quests with name, status, and slug

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

#### Scenario: Reopen a completed quest

- GIVEN the user is authenticated and has editor or higher role
- AND a quest exists whose status is `completed`
- WHEN the user runs `aleph quest update --campaign <id> --slug <slug> --status active`
- THEN the server accepts the change
- AND reading the quest back shows status `active`

#### Scenario: Abandon a quest

- GIVEN the user is authenticated and has editor or higher role
- AND a quest exists whose status is `active`
- WHEN the user runs `aleph quest update --campaign <id> --slug <slug> --status abandoned`
- THEN the server accepts the change rather than rejecting `abandoned` as an invalid option
