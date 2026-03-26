# campaign-themes Specification

## Purpose
TBD - created by archiving change campaign-themes. Update Purpose after archive.
## Requirements
### Requirement: Built-in RPG themes

The system SHALL provide at least 10 built-in visual themes optimized for different TTRPG settings. Each theme defines the full set of CSS color tokens (`--background`, `--foreground`, `--primary`, `--muted`, `--accent`, `--border`, `--sidebar-background`, etc.) as overrides applied via a `data-theme` attribute on the campaign layout wrapper.

The available themes SHALL be:
- `default` — neutral light theme (current design)
- `dark-fantasy` — dark backgrounds, blood-red accents, parchment text
- `cyberpunk` — near-black backgrounds, neon cyan/magenta accents
- `cosmic-horror` — deep purple/black, sickly green accents, desaturated text
- `high-fantasy` — warm ivory backgrounds, gold and deep blue accents
- `western` — sepia/tan backgrounds, terracotta and brown accents
- `steampunk` — dark bronze backgrounds, amber/copper accents
- `eldritch` — dark teal backgrounds, pale yellow accents
- `fey-wilds` — soft lavender backgrounds, pink/green accents
- `undead` — near-black with bone-white text, grey-green accents

#### Scenario: Theme tokens cover all UI elements
- **GIVEN** a campaign with any built-in theme applied
- **WHEN** a user views any campaign page (entities, characters, sessions, etc.)
- **THEN** all UI elements (backgrounds, text, borders, sidebar, buttons, cards) render using the theme's tokens with no unstyled fallback to the default theme

### Requirement: Theme stored per campaign

Each campaign SHALL have exactly one active theme stored in the `campaigns.theme` column. The value SHALL be the slug string of one of the built-in themes. If null or unrecognized, the system SHALL fall back to `default`.

#### Scenario: Theme persists across sessions
- **GIVEN** a DM sets their campaign theme to `dark-fantasy`
- **WHEN** any user visits that campaign on a different device or browser session
- **THEN** the campaign renders with the `dark-fantasy` theme

#### Scenario: Null theme defaults gracefully
- **GIVEN** a campaign with `theme = null` in the database
- **WHEN** any user visits that campaign
- **THEN** the campaign renders with the `default` theme and no errors occur

### Requirement: Theme picker in campaign creation

The campaign creation form SHALL include a theme picker that allows the DM to select a theme before creating the campaign. Each option SHALL show a visual preview (color swatches for background, primary, and accent colors) alongside the theme name.

#### Scenario: DM selects theme on create
- **GIVEN** a DM opens the "New Campaign" dialog
- **WHEN** they select the `cyberpunk` theme from the picker
- **AND** submit the form
- **THEN** the campaign is created with `theme = "cyberpunk"` in the database

#### Scenario: Default theme pre-selected
- **GIVEN** a DM opens the "New Campaign" dialog
- **WHEN** they have not changed the theme selector
- **THEN** the `default` theme is pre-selected

### Requirement: Theme picker in campaign settings

The campaign edit page (accessible to DM and Co-DM only) SHALL include the same theme picker, allowing the theme to be changed after campaign creation.

#### Scenario: DM changes theme via settings
- **GIVEN** a DM is on the campaign edit page
- **WHEN** they change the theme to `steampunk` and save
- **THEN** the campaign's theme is updated in the database
- **AND** all campaign pages immediately render with the `steampunk` theme

#### Scenario: Non-DM cannot change theme
- **GIVEN** a user with `player` or `visitor` role
- **WHEN** they visit the campaign edit page
- **THEN** they receive a 403 Forbidden response (enforced by existing role-based access)

### Requirement: Theme applied to campaign layout

The campaign layout (`default.vue`) SHALL read the active campaign's theme and apply it as a `data-theme` attribute on the main content wrapper. Theme changes made on the settings page SHALL apply without requiring a full page reload.

#### Scenario: Theme attribute on layout wrapper
- **GIVEN** a campaign with theme `high-fantasy`
- **WHEN** any campaign page renders
- **THEN** the main content area has `data-theme="high-fantasy"` in the DOM
- **AND** the sidebar does NOT receive the `data-theme` attribute (sidebar uses consistent default styling)

#### Scenario: Theme updates reactively
- **GIVEN** a DM changes the campaign theme from `default` to `western` on the settings page
- **WHEN** the save completes
- **THEN** the page re-renders with `data-theme="western"` without a full browser reload

