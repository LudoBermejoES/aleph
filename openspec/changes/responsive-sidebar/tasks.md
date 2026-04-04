# Tasks: Responsive Layout & Mobile Sidebar

## 1. Sidebar Responsive Behavior

- [ ] 1.1 Add a mobile top bar to `app/layouts/default.vue` with hamburger button, app logo, and page title -- visible only below `md` breakpoint (`md:hidden`)
- [ ] 1.2 Wrap the existing sidebar `<aside>` content in a shadcn-vue `Sheet` (side="left") for mobile; keep the current `<aside>` for desktop (`hidden md:flex`)
- [ ] 1.3 Extract sidebar nav content into a shared component (`app/components/layout/SidebarNav.vue`) to avoid duplicating the nav between Sheet and desktop aside
- [ ] 1.4 Add reactive state (`sidebarOpen` ref) to control the Sheet open/close
- [ ] 1.5 Close the sidebar Sheet on route change (watch `useRoute().path`)
- [ ] 1.6 Add i18n keys for hamburger button aria-label in `i18n/locales/en.json` and `i18n/locales/es.json`

## 2. Table Horizontal Scroll Wrappers

- [ ] 2.1 Create a reusable `app/components/ui/ScrollableTable.vue` wrapper component that applies `overflow-x-auto` and renders a `<slot>`
- [ ] 2.2 Wrap the attendance table in Sessions detail page with `ScrollableTable`
- [ ] 2.3 Wrap the transaction table in Inventory/Shop pages with `ScrollableTable`
- [ ] 2.4 Wrap the rolls table in Sessions detail page with `ScrollableTable`
- [ ] 2.5 Audit remaining pages for any other `<table>` elements and wrap as needed

## 3. Character Page Mobile Adaptation

- [ ] 3.1 Wrap the character filter sidebar in a `Sheet` (side="right") on mobile, triggered by a "Filters" button visible below `md`
- [ ] 3.2 Hide the desktop filter sidebar column below `md` (`hidden md:block`)
- [ ] 3.3 Show the "Filters" button above the character list on mobile (`md:hidden`)
- [ ] 3.4 Ensure filter state is shared between the Sheet and the list (same reactive refs)
- [ ] 3.5 Add i18n keys for "Filters" button label in `en.json` and `es.json`

## 4. Timeline / Calendar Grid Mobile

- [ ] 4.1 Replace the fixed `grid-cols-7` on the calendar grid with responsive classes: `grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7`
- [ ] 4.2 Ensure day cell content (event names, indicators) truncates gracefully when cells are wider
- [ ] 4.3 Verify month/week headers adapt to the reduced column count
- [ ] 4.4 Test that navigating between months still works correctly at all breakpoints

## 5. Testing

### Unit Tests

- [ ] 5.1 Unit test: `SidebarNav.vue` renders all expected navigation links for a campaign context
- [ ] 5.2 Unit test: `ScrollableTable.vue` wraps slot content in an `overflow-x-auto` container

### Integration Tests

- [ ] 5.3 No new integration tests needed -- no API changes (document this reasoning)

### E2E Tests (Playwright)

- [ ] 5.4 E2E: at 375px viewport, sidebar is hidden and hamburger button is visible
- [ ] 5.5 E2E: at 375px viewport, clicking hamburger opens sidebar overlay with navigation links
- [ ] 5.6 E2E: at 375px viewport, clicking a sidebar link navigates and closes the overlay
- [ ] 5.7 E2E: at 1280px viewport, sidebar is visible and no hamburger button is shown
- [ ] 5.8 E2E: at 375px viewport, character page shows "Filters" button and hides the filter sidebar
- [ ] 5.9 E2E: at 375px viewport, tables on session detail page are horizontally scrollable (no page overflow)
- [ ] 5.10 E2E: at 375px viewport, timeline calendar grid displays reduced columns

### Verification

- [ ] 5.11 Run `npx vitest run tests/unit/` -- all pass
- [ ] 5.12 Run `npx playwright test` -- all existing + new tests pass
- [ ] 5.13 Manual QA at 375px, 768px, and 1280px widths on key pages (dashboard, characters, sessions, timeline)
