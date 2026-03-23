# Aleph -- Calendar & Timeline Specification

## Purpose

Define the custom in-game calendar system and chronological timeline features that allow DMs to track time progression, schedule events, manage seasons and celestial bodies, and visualize campaign history.

## ADDED Requirements

### Requirement: Custom Calendar System

The system SHALL support fully custom calendars with arbitrary structure, independent of real-world calendar rules.

#### Scenario: Defining a custom calendar
- GIVEN a DM in calendar settings
- WHEN they create a calendar with:
  - Custom month names and lengths (e.g., "Hammer" with 30 days, "Alturiak" with 28 days)
  - Custom weekday names and week length (e.g., 10-day "tenday" cycle)
  - Custom year naming or numbering (e.g., "1372 DR" or "Year of the Serpent")
  - Intercalary days/periods (days that exist between months, like "Midwinter" between Hammer and Alturiak)
- THEN the calendar renders correctly with all custom elements
- AND navigation between months/years works with the custom structure

#### Scenario: Multiple calendars per campaign
- GIVEN a campaign may have different cultures with different calendars
- WHEN the DM creates multiple calendars
- THEN events can be placed on any calendar
- AND an event on one calendar MAY optionally display on others (if date conversion is configured)

### Requirement: Moon Phases and Celestial Bodies

The system SHALL support tracking custom moons with configurable phase cycles.

#### Scenario: Defining moons
- GIVEN a DM in calendar settings
- WHEN they add a moon with: name, phase cycle length (e.g., 28 days), color, and starting phase
- THEN the calendar displays moon phase icons on each day
- AND multiple moons are supported simultaneously
- AND phase calculations account for the custom calendar structure

### Requirement: Seasons and Weather

The system SHALL support configurable seasons tied to the calendar.

#### Scenario: Defining seasons
- GIVEN a DM configuring seasons
- WHEN they define seasons with: name, start date, end date, color, and optional description
- THEN the calendar visually indicates the current season
- AND season boundaries are displayed on the calendar view

#### Scenario: Weather tracking
- GIVEN a DM tracking weather
- WHEN they set weather for a specific day (clear, rain, snow, storm, etc.)
- THEN the weather icon displays on that calendar day
- AND weather can optionally be generated randomly based on season

### Requirement: Calendar Events

The system SHALL support placing events on calendar dates with entity linking.

#### Scenario: Creating a calendar event
- GIVEN a DM adding an event to a calendar date
- WHEN they create an event with: name, description, date, optional end date, linked entities, visibility
- THEN the event appears on the calendar at the specified date
- AND clicking the event shows its details and linked entities
- AND the event is also accessible from linked entity pages

#### Scenario: Recurring events
- GIVEN an event like "Full Moon Ritual" that recurs
- WHEN the DM sets recurrence (every N days, weekly, monthly, yearly)
- THEN the event automatically appears on all applicable future dates

#### Scenario: Event visibility
- GIVEN events with different visibility levels
- WHEN a Player views the calendar
- THEN they see only events permitted for their role
- AND DM-only events (e.g., "BBEG attacks in 3 days") are hidden

### Requirement: Current Date Tracking

The system SHALL maintain a "current date" per campaign that can be advanced by the DM.

#### Scenario: Advancing campaign time
- GIVEN the DM on the calendar view
- WHEN they advance the current date (by days, weeks, or to a specific date)
- THEN the calendar highlights the new current date
- AND any events that now fall in the past are marked accordingly
- AND character ages are recalculated based on the new date

#### Scenario: Age auto-calculation
- GIVEN a character with a birth date on the custom calendar
- WHEN the campaign's current date is set or advanced
- THEN the character's age is automatically calculated using the custom calendar rules
- AND the age is displayed on the character's profile
- AND death dates also factor into the calculation (showing age at death)

### Requirement: Timeline Visualization

The system SHALL support visual timeline views for displaying chronological history.

#### Scenario: Chronicle view
- GIVEN a campaign with events across multiple years
- WHEN the user opens the timeline in chronicle view
- THEN events are displayed vertically in chronological order
- AND each event shows date, name, description, and linked entities
- AND events can be filtered by tag, entity type, or date range

#### Scenario: Parallel storylines
- GIVEN a timeline with events tagged to different storylines (e.g., "Party A", "Party B", "World Events")
- WHEN the user views the timeline
- THEN parallel tracks display side by side
- AND events at the same time are aligned horizontally

#### Scenario: Gantt-style view
- GIVEN events with both start and end dates (wars, journeys, reigns)
- WHEN the user switches to Gantt view
- THEN events render as horizontal bars showing duration
- AND overlapping events are visually clear

#### Scenario: Timeline eras
- GIVEN the DM defines eras (e.g., "Age of Kings", "The Sundering")
- WHEN the timeline is displayed
- THEN eras appear as labeled sections/backgrounds behind the events
- AND navigating between eras is supported
