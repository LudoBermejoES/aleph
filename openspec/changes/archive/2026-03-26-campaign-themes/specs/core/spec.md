## MODIFIED Requirements

### Requirement: Theming and Customization

The system SHALL support visual themes per campaign, implemented as 10 built-in RPG-flavored themes applied via CSS variable overrides.

Inspired by: Amsel (Pendragon/Neo Tokyo/Redrum themes), Chronica (3 themes), Kanka (theme builder, custom CSS), World Anvil (CSS per world)

#### Scenario: Applying a campaign theme
- **GIVEN** a Dungeon Master or Co-DM
- **WHEN** they select a visual theme for the campaign on create or edit
- **THEN** all campaign pages render with the chosen theme's CSS variable tokens applied to the main content area

#### Scenario: Theme selection at creation
- **GIVEN** a user creating a new campaign
- **WHEN** they select a theme from the picker in the creation form
- **THEN** the campaign is saved with that theme and renders it immediately on first visit
