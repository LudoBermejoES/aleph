## ADDED Requirements

### Requirement: Domain-specific API composables

The system SHALL provide the following composables, each exporting the methods for their domain:

- `app/composables/useCharacterApi.ts` — character CRUD, abilities, stats, connections, folders, family/genealogy
- `app/composables/useSessionApi.ts` — session CRUD, session groups, arcs, chapters, attendance, rolls
- `app/composables/useEntityApi.ts` — entity CRUD, entity templates, entity mentions
- `app/composables/useMapApi.ts` — map CRUD, pins, layers, regions
- `app/composables/useInventoryApi.ts` — items, inventories, shops, transactions, currencies, wealth
- `app/composables/useCalendarApi.ts` — calendars, timelines, calendar events, timeline events

Each composable SHALL accept a `campaignId` parameter (either reactive or plain string) matching the existing `useCampaignApi` pattern.

#### Scenario: useCharacterApi returns character methods

- **WHEN** a component calls `const { getCharacters, getCharacter, createCharacter, updateCharacter, deleteCharacter } = useCharacterApi(campaignId)`
- **THEN** all methods are defined and callable

#### Scenario: useSessionApi returns session methods

- **WHEN** a component calls `const { getSessions, createSession, updateSession } = useSessionApi(campaignId)`
- **THEN** all methods are defined and callable

#### Scenario: useInventoryApi returns economy methods

- **WHEN** a component calls `const { getItems, getShops, createTransaction } = useInventoryApi(campaignId)`
- **THEN** all methods are defined and callable

---

### Requirement: useCampaignApi backward compatibility facade

The current `app/composables/useCampaignApi.ts` is a 961-line monolith defining 100+ API methods inline with no sub-composables. After the split it SHALL remain importable and SHALL re-export all methods from the domain composables. No component or page SHALL need to change its import to continue working. The facade SHALL use the same `campaignId` parameter signature as before.

#### Scenario: Existing component import still works

- **WHEN** a component imports `const { getCharacters } = useCampaignApi(campaignId)`
- **THEN** `getCharacters` is available and behaves identically to before

#### Scenario: New composable and facade return identical functions

- **WHEN** `useCharacterApi(campaignId).getCharacters` and `useCampaignApi(campaignId).getCharacters` are both called with the same arguments
- **THEN** both return the same result (same underlying function reference or equivalent behavior)

#### Scenario: TypeScript compilation passes after refactor

- **WHEN** `npx nuxi typecheck` is run after the composable split
- **THEN** there are zero TypeScript errors related to the composable refactor

---

### Requirement: No runtime behavior change

Splitting composables SHALL NOT change API request URLs, HTTP methods, request headers, or response shapes. All calls SHALL continue to use the same `$fetch` patterns with `X-API-Key` or session cookie auth.

#### Scenario: Character list fetch URL unchanged

- **WHEN** `useCharacterApi(campaignId).getCharacters()` is called
- **THEN** it makes a GET request to `/api/campaigns/${campaignId}/characters` (same as before)

#### Scenario: Session creation request unchanged

- **WHEN** `useSessionApi(campaignId).createSession(data)` is called
- **THEN** it makes a POST request to `/api/campaigns/${campaignId}/sessions` with the same body format as before
