## ADDED Requirements

### Requirement: User can set own RSVP on a session

The session detail page SHALL show an Attendance section. Each logged-in user SHALL see their own RSVP status as a button group (pending / accepted / declined / tentative). Clicking a status calls `PATCH /api/campaigns/:id/sessions/:slug/attendance` with `{ rsvpStatus }` and updates the display immediately.

#### Scenario: Player RSVPs as accepted

GIVEN a player is on the session detail page
WHEN they click "Accepted" in the RSVP selector
THEN their RSVP status updates to accepted
AND the attendance list shows the green indicator for their entry

#### Scenario: User changes RSVP from accepted to declined

GIVEN a player's current RSVP is accepted
WHEN they click "Declined"
THEN the status changes to declined
AND the indicator turns red

### Requirement: Attendance list shows all attendees with status indicators

The Attendance section SHALL list all attendees with: colored status dot (green=accepted, red=declined, yellow=tentative/pending), user display name, character name if set, and (for dm/co_dm) an "attended" checkbox to mark actual attendance.

#### Scenario: DM marks a player as attended

GIVEN a dm is on the session detail page and attendance records exist
WHEN they check the "attended" checkbox for a player
THEN `PATCH /api/campaigns/:id/sessions/:slug/attendance` is called with `{ userId, attended: true }` (via admin path)
AND the row updates to show attendance confirmed

#### Scenario: Attendance section is empty with helpful message when no records

GIVEN a session with no attendance records yet
THEN the Attendance section shows "No attendance recorded yet"
