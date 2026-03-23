# session-management Specification

## Purpose
TBD - created by archiving change campaign-manager-study. Update Purpose after archive.
## Requirements
### Requirement: Campaign Structure

The system SHALL support creating and configuring campaigns as the top-level organizational unit.

#### Scenario: Creating a campaign
- GIVEN an authenticated user with campaign creation permission (Admin or DM)
- WHEN they create a campaign with: name, description, game system (freetext), and visibility (public/private)
- THEN the campaign directory structure is created on the filesystem
- AND the database records the campaign with the creator as Dungeon Master
- AND a default dashboard is generated

#### Scenario: Campaign dashboard
- GIVEN a user entering a campaign
- WHEN they view the dashboard
- THEN they see configurable widgets: recent entries, upcoming sessions, active quests, calendar preview, party summary, quick links
- AND the DM can customize which widgets appear and their order
- AND the dashboard respects the user's role (Players see less than DMs)

#### Scenario: Campaign settings
- GIVEN a DM in campaign settings
- WHEN they configure the campaign
- THEN they can set: name, description, banner image, theme, enabled entity types, visibility, calendar, default permissions, member management

### Requirement: Session Scheduling and Attendance

The system SHALL support scheduling game sessions and tracking player attendance.

#### Scenario: Scheduling a session
- GIVEN a DM or Co-DM
- WHEN they create a session with: date/time, location (IRL or virtual link), description
- THEN invited campaign members receive a notification
- AND the session appears on the campaign dashboard and user dashboards

#### Scenario: RSVP and attendance
- GIVEN a scheduled session
- WHEN players mark their attendance (attending, maybe, absent)
- THEN the DM can see an overview of RSVPs
- AND after the session, attendance is recorded as historical data

### Requirement: Session Logs and Adventure Notes

The system SHALL support detailed session logging as markdown files.

#### Scenario: Writing a session log
- GIVEN a session has been played
- WHEN the DM (or authorized Chronicler) creates a session log
- THEN a `.md` file is created at `content/campaigns/{slug}/sessions/session-{number}.md`
- AND the log can include: narrative recap, key decisions, NPCs encountered, locations visited, items gained/lost
- AND entity mentions in the log are auto-linked

#### Scenario: Player session contributions
- GIVEN a campaign where the DM has enabled player session contributions
- WHEN a Player writes their own session notes
- THEN their contribution is saved as a separate section or file (e.g., `session-001-player-alice.md`)
- AND the DM can review and optionally incorporate player contributions into the main log

#### Scenario: Session log with entity links
- GIVEN a session log mentioning "The party met Ireena in the Village of Barovia"
- WHEN rendered
- THEN "Ireena" and "Village of Barovia" are auto-linked to their respective entity pages
- AND those entities' "Appeared In" section lists this session

### Requirement: Story Arc Structure

The system SHALL support organizing campaigns into arcs, chapters, and scenes for narrative planning.

#### Scenario: Creating a story arc
- GIVEN a DM planning campaign structure
- WHEN they create an arc (e.g., "Death House") with chapters (e.g., "Arrival", "Exploration", "Basement")
- THEN the arc appears in the campaign's story structure view
- AND each chapter can contain scene descriptions and branching points

#### Scenario: Non-linear branching
- GIVEN a chapter with multiple possible outcomes
- WHEN the DM defines branch points (e.g., "Players side with the villagers" vs "Players side with Strahd")
- THEN each branch leads to different subsequent chapters/scenes
- AND the DM can mark which branch was taken during play
- AND untaken branches remain available for reference

### Requirement: Quest Tracking

The system SHALL support quest management with status tracking and entity connections.

#### Scenario: Creating a quest
- GIVEN a DM or QuestKeeper
- WHEN they create a quest with: name, description, status (active/completed/failed/hidden), objectives, linked entities
- THEN the quest appears in the campaign's quest log
- AND linked NPCs, locations, and items show the quest in their "Related Quests" section

#### Scenario: Quest chain nesting
- GIVEN a main quest with sub-quests
- WHEN the DM nests sub-quests under a parent quest
- THEN the quest log shows a collapsible hierarchy
- AND parent quest progress reflects child quest completion

#### Scenario: Secret quests
- GIVEN a quest marked with DM-only visibility
- WHEN a Player views the quest log
- THEN the secret quest is not visible
- AND the DM can reveal it later by changing visibility

### Requirement: Decision and Consequence Tracking

The system SHALL support tracking player decisions and their consequences throughout the campaign.

#### Scenario: Recording a decision
- GIVEN a branching point in the story
- WHEN the DM records a decision with: description, who decided, what options were available, which was chosen
- THEN the decision is logged with timestamp and session reference
- AND it can be linked to future consequences

#### Scenario: Consequence linking
- GIVEN a past decision "The party spared the goblin chief"
- WHEN the DM creates a future event "Goblin chief returns as an ally"
- THEN the DM can link the event to the original decision
- AND viewing either shows the cause-and-effect chain

#### Scenario: Decision dashboard
- GIVEN a campaign with multiple recorded decisions
- WHEN the DM views the decision tracker
- THEN all decisions are listed chronologically with their consequences (resolved and pending)
- AND decisions without linked consequences are flagged as "open threads"

