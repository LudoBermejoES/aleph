# Delta for Calendar Timeline

## ADDED Requirements

### Requirement: Calendar Rendering

The system SHALL render custom calendars with correct month/day layouts in the browser.

#### Scenario: Rendering a custom calendar month view
- GIVEN a campaign with a custom calendar definition (month names, days per month)
- WHEN the user navigates to the calendar view for a specific month
- THEN the browser renders a grid with the correct number of day cells for that month
- AND month and day names match the custom calendar definition

#### Scenario: Navigating between months
- GIVEN a rendered calendar month view
- WHEN the user clicks the next or previous month button
- THEN the view updates to show the adjacent month with correct day count
- AND year boundaries are handled correctly when moving past the last or first month
