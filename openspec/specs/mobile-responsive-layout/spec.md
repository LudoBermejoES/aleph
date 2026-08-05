# mobile-responsive-layout Specification

## Purpose

TBD - created by archiving change mobile-responsive-layout. Update Purpose after archive.

## Requirements

### Requirement: Main content area is never shrunk by auxiliary layout elements

The root app layout (`app/layouts/default.vue`) SHALL NOT let any element other than the sidebar consume width from `<main>` inside the layout's flex row, on any viewport width.

#### Scenario: Main uses the full remaining width on mobile

- **GIVEN** a viewport narrower than the `md` breakpoint (e.g. 375px)
- **WHEN** any campaign page is rendered
- **THEN** `<main>`'s rendered width equals the full viewport width (the sidebar is hidden below `md`)

#### Scenario: Main uses the full remaining width on desktop

- **GIVEN** a viewport at or above the `md` breakpoint (e.g. 1280px)
- **WHEN** any campaign page is rendered
- **THEN** `<main>`'s rendered width equals the viewport width minus the sidebar's fixed width, with no additional width lost to other elements

#### Scenario: Global search remains reachable on desktop

- **GIVEN** a viewport at or above the `md` breakpoint
- **WHEN** the user clicks the search trigger (or presses the keyboard shortcut)
- **THEN** the search dialog opens, unaffected by the trigger's position in the layout

### Requirement: Page header rows wrap on narrow viewports

Every campaign list-index and entity detail page's title-and-actions header row SHALL wrap its contents onto multiple lines on narrow viewports instead of clipping the action buttons or requiring horizontal scroll.

#### Scenario: Header wraps instead of clipping on mobile

- **GIVEN** a viewport narrower than the `md` breakpoint (e.g. 375px)
- **WHEN** a campaign list-index page (e.g. dashboard, characters, sessions, quests, arcs) or an entity detail page (e.g. character, quest, session, arc, location, organization) is rendered
- **THEN** the header's title and its action button(s) are all fully visible without horizontal scrolling, wrapping onto a second line if needed

#### Scenario: Header remains unwrapped on desktop when it fits

- **GIVEN** a viewport wide enough for the header's title and actions to fit on one line
- **WHEN** the page is rendered
- **THEN** the header renders on a single line, unchanged from its pre-existing desktop appearance
