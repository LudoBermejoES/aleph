## ADDED Requirements

### Requirement: Session detail shows recent dice rolls

The session detail page SHALL include a collapsible "Rolls" section at the bottom. When expanded, it fetches `GET /api/campaigns/:id/sessions/:slug/rolls` and displays the last rolls in a table: character name, formula, total, timestamp. If the session has no rolls, a placeholder "No rolls recorded for this session" is shown. The section is collapsed by default.

#### Scenario: Session has rolls — user expands the section

GIVEN a session with dice rolls attached to it
WHEN a user clicks to expand the Rolls section
THEN a list of rolls is shown with formula and total
AND rolls are ordered by most recent first

#### Scenario: Session has no rolls

GIVEN a session with no associated rolls
WHEN a user expands the Rolls section
THEN "No rolls recorded for this session" is shown

#### Scenario: Rolls are fetched lazily

GIVEN the session detail page loads
THEN NO request to `/sessions/:slug/rolls` is made on initial load
AND the request is made only when the user expands the Rolls section
