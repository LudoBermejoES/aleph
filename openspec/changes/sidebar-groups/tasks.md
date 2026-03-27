## 1. i18n

- [x] 1.1 Add group label keys to `i18n/locales/en.json`: `layout.group.world`, `layout.group.story`, `layout.group.economy`, `layout.group.campaign`
- [x] 1.2 Add the same keys to `i18n/locales/es.json`

## 2. Layout: replace flat list with grouped structure

- [x] 2.1 Replace `campaignLinks` computed with `campaignLinkGroups` returning `{ id, label, links[] }[]`
- [x] 2.2 Add `collapsedGroups` ref initialized on `onMounted` from `localStorage` (default: all open)
- [x] 2.3 Add `toggleGroup(id)` function that updates the Set and writes to `localStorage`
- [x] 2.4 Add `isGroupOpen(id)` computed that forces open if any link in the group matches the current route
- [x] 2.5 Update template: replace flat `v-for` with group headers + toggle + conditional link list

## 3. E2E test compatibility

- [x] 3.1 Verify existing sidebar E2E tests still pass — `navigation.spec.ts` clicks `a:has-text("Wiki")` etc. and `campaigns.spec.ts` asserts visibility; these are safe because groups default to open in fresh browsers (no localStorage), but add a note/comment to those tests explaining the dependency on default-open state
- [x] 3.2 Add a `data-testid="nav-group-<id>"` attribute to each group container so future E2E tests can target groups explicitly if needed
