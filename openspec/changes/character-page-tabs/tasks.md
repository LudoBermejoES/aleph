## 1. i18n

- [ ] 1.1 Add tab label keys to `i18n/locales/en.json`: `character.tabs.main`, `character.tabs.story`, `character.tabs.relations`, `character.tabs.play`
- [ ] 1.2 Add Spanish translations to `i18n/locales/es.json`: `Información general`, `Historia`, `Relaciones`, `Juego`

## 2. Character detail page refactor

- [ ] 2.1 Add `activeTab` computed/ref that reads `route.query.tab` and defaults to `"main"`, validated against the four valid values
- [ ] 2.2 Add `setTab(tab)` function that calls `router.replace` with `?tab=<tab>` without full navigation
- [ ] 2.3 Wrap the below-header content in a `<Tabs :value="activeTab" @update:value="setTab">` block using shadcn-vue Tabs components
- [ ] 2.4 Add `<TabsList>` with four `<TabsTrigger>` entries (main, story, relations, play) using i18n labels
- [ ] 2.5 Create **Main info** `<TabsContent value="main">` containing: Description section (with `ref="contentRef"`), Current Status section
- [ ] 2.6 Add secret notes block inside **Main info** tab (keep `ref="contentRef"` attached so `injectRevealButtons` continues to work)
- [ ] 2.7 Create **Story** `<TabsContent value="story">` containing: Backstory section, History section
- [ ] 2.8 Create **Relations** `<TabsContent value="relations">` containing: Connections list, Relations list, Organizations section, Relations graph
- [ ] 2.9 Create **Play info** `<TabsContent value="play">` containing: Stats section, Abilities section, Wealth/Richness section, Inventory section, Template Fields display

## 3. Tests

- [ ] 3.1 Add E2E test in `tests/e2e/character-page-tabs.spec.ts`: verify Main info tab is active by default, Story tab shows backstory, Relations tab shows relations list, Play info tab shows template fields
- [ ] 3.2 Add E2E test: clicking a tab updates the URL `?tab=` param and reloading the page preserves the tab
