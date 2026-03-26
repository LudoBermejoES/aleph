## ADDED Requirements

### Requirement: Centralized campaign API composable
The system SHALL provide a `useCampaignApi` composable that encapsulates all campaign-scoped API calls. Pages and components SHALL use this composable instead of inline `$fetch()` calls. All API endpoint paths are defined in one place.

#### Scenario: Page uses composable to fetch data
- **GIVEN** a page that needs to display a list of characters
- **WHEN** the page calls `const { getCharacters } = useCampaignApi(campaignId)`
- **THEN** `getCharacters()` returns a typed `Character[]` response
- **AND** the page does not contain any hardcoded `/api/campaigns/...` path strings

#### Scenario: Form component fetches dependent data via composable
- **GIVEN** a form component that needs to populate a dropdown with relation types
- **WHEN** the component calls `api.getRelationTypes()`
- **THEN** the call resolves correctly without the component knowing the underlying endpoint
- **AND** the return type is `RelationType[]` with no `as any` cast

#### Scenario: Typed response shapes
- **GIVEN** the composable returns data from any campaign resource endpoint
- **WHEN** TypeScript compiles the consuming page or component
- **THEN** the compiler enforces the correct response shape
- **AND** no `as any` type assertions are needed in consuming code
