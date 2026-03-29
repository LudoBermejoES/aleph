## ADDED Requirements

### Requirement: View decisions and consequences on session detail

The session detail page SHALL display a Decisions section below the content tabs. Each decision SHALL show its title, type badge, optional description, and a list of consequences. Consequences SHALL be filtered by role: dm/co_dm see all; other roles see only revealed ones.

#### Scenario: Player views decisions — hidden consequences are masked

GIVEN a session with one decision that has one revealed and one hidden consequence
WHEN a player navigates to the session detail page
THEN the revealed consequence text is shown
AND the hidden consequence is shown as "Hidden consequence" placeholder text

#### Scenario: DM views all consequences including hidden

GIVEN a session with a decision with a hidden consequence
WHEN a dm navigates to the session detail page
THEN all consequences are shown including hidden ones (with visual indicator they are hidden)

### Requirement: DM can create a decision on a session

The session detail page SHALL show an "Add Decision" button (visible to dm/co_dm only). Clicking it reveals an inline form with fields: title (required), type (choice/role/count/destiny, default: choice), description (optional). On submit, the decision is saved via `POST /api/campaigns/:id/sessions/:slug/decisions` and the list refreshes.

#### Scenario: DM creates a decision

GIVEN a dm is on the session detail page
WHEN they click "Add Decision", fill in the title, and submit
THEN the decision appears in the decisions list
AND the form is hidden

#### Scenario: Player cannot see Add Decision button

GIVEN a player is on the session detail page
THEN the "Add Decision" button is not visible

### Requirement: DM can add a consequence to a decision

Each decision in the list SHALL have an "Add Consequence" button (dm/co_dm only). Clicking it shows an inline form with: description (required), revealed toggle (default: false). On submit, the consequence is saved via `POST /api/campaigns/:id/sessions/:slug/decisions/:decisionId/consequences`.

#### Scenario: DM adds a consequence

GIVEN a dm is on the session detail page
WHEN they click "Add Consequence" on a decision, fill in description, and submit
THEN the consequence appears under the decision

### Requirement: DM can reveal or hide a consequence

Each consequence visible to dm/co_dm SHALL have a reveal/hide toggle. Toggling calls `PATCH /api/campaigns/:id/sessions/:slug/decisions/:decisionId/consequences` with `{ consequenceId, revealed }` and the list updates immediately.

#### Scenario: DM reveals a hidden consequence

GIVEN a dm sees a consequence marked as hidden
WHEN they click the reveal toggle
THEN the consequence is immediately shown as revealed (optimistic UI update)
AND other users can now see it
