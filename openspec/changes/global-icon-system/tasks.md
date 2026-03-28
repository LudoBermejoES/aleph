## 1. Central Icon Map

- [x] 1.1 Create `app/utils/icons.ts` — import all required lucide-vue-next components and export them as the `ICONS` object with keys for nav areas, group headers, actions, character/quest/session/org statuses and types (see design.md icon table)

## 2. Sidebar Layout Icons

- [x] 2.1 Update `app/layouts/default.vue` — wrap the app name link content with `flex items-center gap-2` (already done for logo; verify)
- [x] 2.2 Add icons to all campaign nav links (Wiki, Characters, Organizations, Locations, Maps, Sessions, Quests, Calendars, Items, Shops, Inventories, Currencies, Transactions, Graph, Members) using `<component :is="ICONS.xxx" class="w-4 h-4 shrink-0" />`
- [x] 2.3 Add icons to nav group header buttons (World → Globe, Story → BookMarked, Economy → Landmark, Campaign → Shield)
- [x] 2.4 Add icons to the "All Campaigns" link and the campaign Dashboard link
- [x] 2.5 Add `LogOut` icon to Sign Out button and `Settings` icon to Settings link in the bottom user section

## 3. Auth Layout Icons

- [x] 3.1 Update `app/layouts/auth.vue` — no sidebar icons needed; confirm no action needed here beyond the existing logo

## 4. Campaign Dashboard Cards

- [x] 4.1 Update `app/pages/campaigns/[id]/index.vue` — add `<component :is="ICONS.xxx" class="w-6 h-6 mb-1" />` inside each `CardHeader`, above the `CardTitle`, for all 13 section cards (Wiki, Characters, Maps, Sessions, Calendars, Quests, Items, Shops, Inventories, Currencies, Transactions, Graph, Members/Organizations)

## 5. Character Status & Type Badges

- [x] 5.1 Update `app/pages/campaigns/[id]/characters/index.vue` — add icon to each status badge (Heart/alive, Skull/dead, CircleHelp/missing, CircleDashed/unknown) using `flex items-center gap-1`
- [x] 5.2 Add icon to PC/NPC type badge (Sword/pc, Bot/npc) in the same file

## 6. Quest Status Badges

- [x] 6.1 Update `app/pages/campaigns/[id]/quests/index.vue` — add icon to each quest status badge (Play/active, CheckCircle2/completed, XCircle/failed, Ban/abandoned)

## 7. Session Status Badges

- [x] 7.1 Update `app/pages/campaigns/[id]/sessions/index.vue` — add icon to each session status badge (Clock/planned, Zap/active, CheckCircle2/completed, X/cancelled)

## 8. Organization Type & Status Badges

- [x] 8.1 Update `app/pages/campaigns/[id]/organizations/index.vue` — add icon to each org type badge (Shield/faction, Star/guild, Swords/army, Flame/cult, Landmark/government, Circle/other)
- [x] 8.2 Add icon to each org status badge (CircleCheck/active, CircleMinus/inactive, EyeOff/secret, CircleX/dissolved)

## 9. Tests

- [x] 9.1 Add unit test in `tests/unit/utils/icons.test.ts` — verify `ICONS` exports all required keys and each value is a defined Vue component
- [x] 9.2 Add E2E check to `tests/e2e/icons.spec.ts` — navigate to the campaign dashboard, verify at least one `svg` icon is present inside each nav link and inside each dashboard card

## 10. Verification

- [x] 10.1 Run `npm run build` — confirm no missing import errors
- [x] 10.2 Run `npx vitest run tests/unit/utils/icons.test.ts`
- [ ] 10.3 Run `npx playwright test tests/e2e/icons.spec.ts`
