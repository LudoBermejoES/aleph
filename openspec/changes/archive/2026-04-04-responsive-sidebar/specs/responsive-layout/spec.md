# Delta for Responsive Layout

## ADDED Requirements

### Requirement: Mobile Sidebar with Hamburger Toggle

The system SHALL hide the navigation sidebar on screens narrower than 768px and provide a hamburger menu button that opens the sidebar as a slide-over overlay.

#### Scenario: Sidebar is hidden on mobile viewport
- GIVEN the user is on any page
- WHEN the viewport width is below 768px
- THEN the fixed sidebar is not visible
- AND a top bar with a hamburger menu button is visible

#### Scenario: Hamburger button opens sidebar overlay
- GIVEN the viewport width is below 768px
- AND the sidebar is hidden
- WHEN the user clicks the hamburger menu button
- THEN the sidebar slides in from the left as an overlay (Sheet)
- AND a backdrop overlay covers the main content

#### Scenario: Sidebar overlay closes on navigation
- GIVEN the sidebar overlay is open on mobile
- WHEN the user clicks a navigation link in the sidebar
- THEN the sidebar overlay closes
- AND the user is navigated to the selected page

#### Scenario: Sidebar overlay closes on backdrop click
- GIVEN the sidebar overlay is open on mobile
- WHEN the user clicks the backdrop area
- THEN the sidebar overlay closes

#### Scenario: Sidebar remains fixed on desktop
- GIVEN the user is on any page
- WHEN the viewport width is 768px or wider
- THEN the sidebar is visible as a fixed column (unchanged from current behavior)
- AND no hamburger button is visible

### Requirement: Responsive Table Scroll

The system SHALL wrap data tables in horizontally scrollable containers so they do not cause page overflow on narrow screens.

#### Scenario: Table scrolls horizontally on narrow screen
- GIVEN the user is viewing a page with a data table (attendance, transactions, or rolls)
- WHEN the viewport is too narrow to display all table columns
- THEN the table is horizontally scrollable within its container
- AND the page itself does not scroll horizontally

#### Scenario: Table displays normally on wide screen
- GIVEN the user is viewing a page with a data table
- WHEN the viewport is wide enough to display all columns
- THEN the table displays fully without a scroll indicator

### Requirement: Mobile Character Filters

The system SHALL adapt the Characters page filter sidebar into a Sheet on screens narrower than 768px, triggered by a "Filters" button.

#### Scenario: Filter sidebar is hidden on mobile
- GIVEN the user is on the Characters list page
- WHEN the viewport width is below 768px
- THEN the filter sidebar column is not visible
- AND a "Filters" button is visible above the character list

#### Scenario: Filters button opens filter Sheet
- GIVEN the user is on the Characters list page on mobile
- WHEN the user clicks the "Filters" button
- THEN a Sheet slides in containing all filter controls
- AND the filters function identically to the desktop sidebar filters

#### Scenario: Applying a filter closes the Sheet
- GIVEN the filter Sheet is open on mobile
- WHEN the user selects a filter value
- THEN the filter is applied to the character list
- AND the Sheet remains open so the user can adjust multiple filters

#### Scenario: Filter sidebar visible on desktop
- GIVEN the user is on the Characters list page
- WHEN the viewport width is 768px or wider
- THEN the filter sidebar is visible as a side column (unchanged)
- AND no "Filters" button is shown

### Requirement: Responsive Timeline Grid

The system SHALL adapt the timeline calendar grid to display fewer columns on narrow screens.

#### Scenario: Calendar grid shows reduced columns on mobile
- GIVEN the user is viewing a timeline calendar
- WHEN the viewport width is below 768px
- THEN the calendar grid displays 1 or 2 columns instead of 7
- AND all day cells remain visible and accessible by scrolling vertically

#### Scenario: Calendar grid shows 7 columns on desktop
- GIVEN the user is viewing a timeline calendar
- WHEN the viewport width is 768px or wider
- THEN the calendar grid displays the full 7-column layout

## MODIFIED Requirements

### Requirement: Default Layout Structure

The default layout SHALL be fully functional at all viewport widths from 375px to any desktop width.

#### Scenario: Layout does not overflow horizontally
- GIVEN the user is on any page
- WHEN the viewport width is 375px
- THEN no content overflows the viewport horizontally
- AND the main content area fills the available width
