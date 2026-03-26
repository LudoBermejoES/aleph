## 1. Foundation — Types and Composable

- [x] 1.1 Create `app/types/api.ts` with TypeScript interfaces for all campaign resources: `Character`, `CharacterFolder`, `Entity`, `EntityType`, `Session`, `SessionDecision`, `Map`, `MapLayer`, `MapPin`, `MapRegion`, `Calendar`, `CalendarEvent`, `Timeline`, `Quest`, `Shop`, `ShopItem`, `Relation`, `RelationType`, `Inventory`, `InventoryItem`, `Currency`, `Transaction`, `CampaignMember`, `Item`, `Tag`
- [x] 1.2 Create `app/composables/useCampaignApi.ts` with a factory function `useCampaignApi(campaignId: string)` that returns typed async functions for every campaign API endpoint (one function per endpoint, using the interfaces from `api.ts`)
- [x] 1.3 Verify `useCampaignApi` compiles with zero TypeScript errors and all return types are explicit (no `any`)

## 2. Migrate Pages — Characters & Entities

- [x] 2.1 Migrate `characters/index.vue` — replace inline `$fetch` calls with `api.getCharacters()` and `api.getCharacterFolders()`
- [x] 2.2 Migrate `characters/[slug]/index.vue`
- [x] 2.3 Migrate `characters/[slug]/edit.vue`
- [x] 2.4 Migrate `characters/new.vue`
- [x] 2.5 Migrate `entities/index.vue`
- [x] 2.6 Migrate `entities/[slug]/index.vue`
- [x] 2.7 Migrate `entities/[slug]/edit.vue`
- [x] 2.8 Migrate `entities/new.vue`

## 3. Migrate Pages — Sessions & Quests

- [x] 3.1 Migrate `sessions/index.vue`
- [x] 3.2 Migrate `sessions/[slug]/index.vue`
- [x] 3.3 Migrate `sessions/[slug]/edit.vue`
- [x] 3.4 Migrate `sessions/new.vue`
- [x] 3.5 Migrate `quests/index.vue`
- [x] 3.6 Migrate `quests/[slug]/edit.vue`
- [x] 3.7 Migrate `quests/new.vue`

## 4. Migrate Pages — Maps & Timelines

- [x] 4.1 Migrate `maps/index.vue`
- [x] 4.2 Migrate `maps/[slug]/index.vue`
- [x] 4.3 Migrate `maps/[slug]/edit.vue`
- [x] 4.4 Migrate `maps/new.vue`
- [x] 4.5 Migrate `timelines/[slug]/index.vue`
- [x] 4.6 Migrate `timelines/[slug]/edit.vue`
- [x] 4.7 Migrate `timelines/new.vue`

## 5. Migrate Pages — Calendars & Relations

- [x] 5.1 Migrate `calendars/index.vue`
- [x] 5.2 Migrate `calendars/[calendarId]/index.vue`
- [x] 5.3 Migrate `calendars/[calendarId]/edit.vue`
- [x] 5.4 Migrate `calendars/new.vue`
- [x] 5.5 Migrate `relations/new.vue`
- [x] 5.6 Migrate `relations/[relationId]/edit.vue`
- [x] 5.7 Migrate `graph.vue`

## 6. Migrate Pages — Inventory, Shops & Economy

- [x] 6.1 Migrate `inventories/index.vue`
- [x] 6.2 Migrate `inventories/[invId]/index.vue`
- [x] 6.3 Migrate `items/index.vue`
- [x] 6.4 Migrate `items/new.vue`
- [x] 6.5 Migrate `items/[itemId]/edit.vue`
- [x] 6.6 Migrate `shops/index.vue`
- [x] 6.7 Migrate `shops/[slug]/index.vue`
- [x] 6.8 Migrate `shops/[slug]/edit.vue`
- [x] 6.9 Migrate `shops/new.vue`
- [x] 6.10 Migrate `currencies/index.vue`
- [x] 6.11 Migrate `transactions/index.vue`

## 7. Migrate Pages — Campaign & Members

- [x] 7.1 Migrate `campaigns/[id]/index.vue` (campaign dashboard)
- [x] 7.2 Migrate `campaigns/[id]/members.vue`
- [x] 7.3 Migrate `pages/index.vue` (campaign list page)

## 8. Migrate Form Components

- [x] 8.1 Migrate `forms/CharacterForm.vue` — replace silent `try/catch` fetch with `api.getMembers().catch(() => [])`
- [x] 8.2 Migrate `forms/EntityForm.vue` — replace `$fetch` for entity types
- [x] 8.3 Migrate `forms/RelationForm.vue` — replace `$fetch` for relation types and entities
- [x] 8.4 Migrate `forms/QuestForm.vue` — replace `$fetch` for quests
- [x] 8.5 Migrate `forms/SessionForm.vue`
- [x] 8.6 Migrate `forms/CalendarForm.vue`
- [x] 8.7 Migrate `forms/MapForm.vue`
- [x] 8.8 Migrate `forms/ItemForm.vue`
- [x] 8.9 Migrate `forms/ShopForm.vue`
- [x] 8.10 Migrate `forms/TimelineForm.vue`

## 9. Verify and Clean Up

- [x] 9.1 Run `grep -r '\$fetch' app/` — confirm zero results (all inline fetches replaced)
- [x] 9.2 Run `grep -r 'as any' app/` — confirm zero results from API responses
- [x] 9.3 Run `npm run build` — confirm TypeScript compiles with no errors
- [x] 9.4 Run `npm run test` — confirm all unit/integration tests pass
- [x] 9.5 Run `npm run test:e2e` — confirm all E2E tests pass
