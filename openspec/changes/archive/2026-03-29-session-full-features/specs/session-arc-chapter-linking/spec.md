## ADDED Requirements

### Requirement: SessionForm allows linking a session to an arc

The SessionForm component SHALL include an Arc select field (shown only if the campaign has arcs). The options are fetched from `GET /api/campaigns/:id/arcs`. The selected arcId is included in the create/update body. The field has a "No arc" empty option.

#### Scenario: DM links a session to an arc when creating

GIVEN a campaign has at least one arc
WHEN a DM opens the new session form
THEN an Arc selector is visible
AND selecting an arc sets arcId in the submitted payload

#### Scenario: Arc selector not shown when campaign has no arcs

GIVEN a campaign with no arcs
WHEN a user opens the session create/edit form
THEN no Arc selector is rendered

### Requirement: SessionForm shows chapter picker when arc is selected

When an arc is selected in SessionForm, a Chapter select field SHALL appear with options fetched from `GET /api/campaigns/:id/arcs/:arcId/chapters`. Changing the arc resets the chapter selection. The chapterId is included in the submitted payload.

#### Scenario: Selecting an arc reveals chapter picker

GIVEN the session form has an arc selected
THEN a Chapter selector appears below the Arc selector with the arc's chapters

#### Scenario: Changing arc resets chapter selection

GIVEN a session form with arc A and chapter X selected
WHEN the user changes the arc to arc B
THEN the chapter selection is cleared
AND the chapter options update to arc B's chapters
