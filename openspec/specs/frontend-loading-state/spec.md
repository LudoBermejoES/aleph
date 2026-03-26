# frontend-loading-state Specification

## Purpose
TBD - created by archiving change frontend-data-layer. Update Purpose after archive.
## Requirements
### Requirement: Unified page loading and error state
The system SHALL provide a `usePageState` composable that manages loading, error, and data state consistently across all pages. Pages SHALL NOT maintain ad-hoc `ref<boolean>` loading flags or inline `try/catch` error suppression.

#### Scenario: Page shows loading state while fetching
- **GIVEN** a page that fetches data on mount
- **WHEN** the fetch is in progress
- **THEN** a loading indicator is shown to the user
- **AND** the loading state is driven by the composable, not a manually set `ref`

#### Scenario: Page shows error state on fetch failure
- **GIVEN** a page that fetches data on mount
- **WHEN** the API call fails (network error or non-2xx response)
- **THEN** an error message is shown to the user
- **AND** the error is not silently swallowed by an empty `catch {}` block

#### Scenario: Consistent behavior across all pages
- **GIVEN** any campaign page in the application
- **WHEN** a developer inspects the page's data loading logic
- **THEN** the pattern is the same as every other page (composable-driven, not ad-hoc)
- **AND** loading, error, and success states are all handled

### Requirement: Form components use composable for dependent data
Form components that load auxiliary data (members, relation types, entity types, etc.) SHALL use the API composable rather than inline `$fetch()` with per-component try/catch patterns.

#### Scenario: Form loads auxiliary data without ad-hoc fetch
- **GIVEN** a form component that needs auxiliary data (e.g., list of campaign members)
- **WHEN** the component mounts
- **THEN** it calls the API composable to fetch the data
- **AND** loading/error states are handled consistently, not silently suppressed

