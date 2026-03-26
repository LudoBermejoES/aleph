## 1. Foundation — Install and Configure

- [x] 1.1 Install `@nuxtjs/i18n@^9` — `npm install @nuxtjs/i18n`
- [x] 1.2 Add `@nuxtjs/i18n` to `nuxt.config.ts` modules with `strategy: 'no_prefix'`, `defaultLocale: 'en'`, `langDir: 'i18n/locales/'`, `lazy: true`, cookie-based detection
- [x] 1.3 Create `app/i18n/locales/en.json` with empty top-level namespace keys as scaffold (`common`, `auth`, `campaigns`, `characters`, `entities`, `sessions`, `quests`, `maps`, `timelines`, `calendars`, `relations`, `inventories`, `items`, `shops`, `currencies`, `transactions`, `members`, `errors`)
- [x] 1.4 Create `app/i18n/locales/es.json` mirroring the same structure (empty values for now)
- [x] 1.5 Run `npm run build` — confirm it compiles with i18n module loaded and no existing strings broken

## 2. Locale Files — Populate English Strings

- [x] 2.1 Add `common.*` keys: save, cancel, delete, edit, create, new, loading, saving, confirm, back, search, noResults, required, optional
- [x] 2.2 Add `auth.*` keys: signIn, register, signOut, email, password, name, signingIn, creatingAccount, invalidCredentials, registrationFailed, noAccount, haveAccount
- [x] 2.3 Add `campaigns.*` keys: title, new, empty, create, name, description, creating, failedCreate, failedLoad, dashboard, members, settings
- [x] 2.4 Add `characters.*` keys: title, new, edit, name, type, npc, pc, status, alive, dead, missing, unknown, owner, race, class, alignment, visibility, description, failedSave
- [x] 2.5 Add `entities.*` keys: title, new, edit, name, type, content, tags, failedSave
- [x] 2.6 Add `sessions.*` keys: title, new, edit, name, date, summary, attendance, decisions, failedSave
- [x] 2.7 Add `quests.*` keys: title, new, edit, name, status, open, completed, failed, description, failedSave
- [x] 2.8 Add `maps.*`, `timelines.*`, `calendars.*`, `relations.*` keys covering labels, buttons, and empty states in those pages
- [x] 2.9 Add `inventories.*`, `items.*`, `shops.*`, `currencies.*`, `transactions.*` keys
- [x] 2.10 Add `members.*` keys: title, invite, role, dm, coDm, editor, player, visitor, remove, failedInvite
- [x] 2.11 Add `errors.*` keys: generic, notFound, forbidden, failedLoad, failedSave

## 3. Migrate Pages — Auth and Root

- [x] 3.1 Migrate `app/pages/login.vue` — all labels, button text, links, error messages
- [x] 3.2 Migrate `app/pages/register.vue`
- [x] 3.3 Migrate `app/pages/index.vue` (campaign list page)

## 4. Migrate Pages — Campaign Core

- [x] 4.1 Migrate `app/pages/campaigns/[id]/index.vue` (dashboard)
- [x] 4.2 Migrate `app/pages/campaigns/[id]/members.vue`

## 5. Migrate Pages — Characters and Entities

- [x] 5.1 Migrate `characters/index.vue`, `characters/new.vue`, `characters/[slug]/index.vue`, `characters/[slug]/edit.vue`
- [x] 5.2 Migrate `entities/index.vue`, `entities/new.vue`, `entities/[slug]/index.vue`, `entities/[slug]/edit.vue`

## 6. Migrate Pages — Sessions and Quests

- [x] 6.1 Migrate `sessions/index.vue`, `sessions/new.vue`, `sessions/[slug]/index.vue`, `sessions/[slug]/edit.vue`
- [x] 6.2 Migrate `quests/index.vue`, `quests/new.vue`, `quests/[slug]/edit.vue`

## 7. Migrate Pages — Maps, Timelines, Calendars, Relations

- [x] 7.1 Migrate `maps/index.vue`, `maps/new.vue`, `maps/[slug]/index.vue`, `maps/[slug]/edit.vue`
- [x] 7.2 Migrate `timelines/[slug]/index.vue`, `timelines/[slug]/edit.vue`, `timelines/new.vue`
- [x] 7.3 Migrate `calendars/index.vue`, `calendars/new.vue`, `calendars/[calendarId]/index.vue`, `calendars/[calendarId]/edit.vue`
- [x] 7.4 Migrate `relations/new.vue`, `relations/[relationId]/edit.vue`
- [x] 7.5 Migrate `graph.vue`

## 8. Migrate Pages — Inventory, Shops, Economy

- [x] 8.1 Migrate `inventories/index.vue`, `inventories/[invId]/index.vue`
- [x] 8.2 Migrate `items/index.vue`, `items/new.vue`, `items/[itemId]/edit.vue`
- [x] 8.3 Migrate `shops/index.vue`, `shops/new.vue`, `shops/[slug]/index.vue`, `shops/[slug]/edit.vue`
- [x] 8.4 Migrate `currencies/index.vue`, `transactions/index.vue`

## 9. Migrate Components

- [x] 9.1 Migrate `app/layouts/default.vue` (nav labels, sidebar items)
- [x] 9.2 Migrate form components: `CharacterForm.vue`, `EntityForm.vue`, `RelationForm.vue`, `QuestForm.vue`, `SessionForm.vue`, `CalendarForm.vue`, `MapForm.vue`, `ItemForm.vue`, `ShopForm.vue`, `TimelineForm.vue`
- [x] 9.3 Migrate UI components: `SearchCommand.vue`, `DiceRoller.vue`, `WealthDisplay.vue`, `InventoryPanel.vue`, `ItemTransferDialog.vue`

## 10. Add Language Switcher

- [x] 10.1 Create `app/components/LanguageSwitcher.vue` using `useI18n().setLocale()` — dropdown or toggle between en/es
- [x] 10.2 Add `<LanguageSwitcher>` to `app/layouts/default.vue` top nav

## 11. Populate Spanish Translations

- [x] 11.1 Fill `es.json` with Spanish translations for all keys in `en.json`

## 12. Verify and Clean Up

- [x] 12.1 Run `grep -r '"\$t\|v-t=' app/` — confirm all string references use translation keys
- [x] 12.2 Visually check 5+ pages with locale set to Spanish — no raw keys, no English bleed-through
- [x] 12.3 Run `npm run build` — confirm TypeScript compiles with no errors
- [x] 12.4 Run `npm run test` — confirm all unit/integration tests pass
- [x] 12.5 Run `npm run test:e2e` — confirm all E2E tests pass (default locale is English so existing selectors should still match)
