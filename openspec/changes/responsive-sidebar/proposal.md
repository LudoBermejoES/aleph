# Proposal: Responsive Layout & Mobile Sidebar

## Why

Aleph's layout is built around a fixed 256px sidebar column (`w-64` in `app/layouts/default.vue`) with no collapse mechanism and no hamburger menu. On screens narrower than ~800px the sidebar pushes content off-screen, making the app unusable on tablets and phones. Several other layout areas compound the problem: the Characters page adds a second filter sidebar (creating a 3-column layout), transaction/attendance tables overflow their containers without horizontal scroll, and the Timeline calendar grid uses a rigid 7-column CSS grid that does not adapt to narrow viewports.

These issues block any mobile or tablet usage of the app and degrade the experience even on smaller laptop screens.

## What Changes

- Add a collapsible sidebar with a hamburger toggle button visible on narrow screens
- Auto-collapse the sidebar below the `md` Tailwind breakpoint (768px) and show it as an overlay
- Wrap all data tables (transactions, attendance, session rolls) in horizontal-scroll containers
- Convert the Characters page filter sidebar into a collapsible panel / Sheet on mobile
- Make the Timeline calendar grid responsive (fewer columns on narrow screens)
- Ensure all existing pages remain fully functional at desktop widths with no visual regressions

## Capabilities

### New

- **Mobile sidebar** -- hamburger button toggles sidebar as a slide-over overlay on screens < 768px
- **Responsive table wrappers** -- tables scroll horizontally instead of overflowing
- **Mobile-friendly character filters** -- filter sidebar collapses into a Sheet or expandable panel
- **Adaptive timeline grid** -- calendar grid uses fewer columns on small screens

### Modified

- `app/layouts/default.vue` -- sidebar becomes conditionally visible; overlay on mobile, fixed on desktop
- Character list page -- filter sidebar replaced with a responsive alternative on narrow screens
- Table components across attendance, transactions, rolls -- wrapped for horizontal scroll
- Timeline/calendar grid component -- responsive column count

## Impact

- **Pages affected**: Every page (layout change), plus Characters, Sessions (attendance table), Inventory (transaction table), Timeline/Calendar
- **No API changes**: This is purely a frontend/CSS change -- no server endpoints, auth flows, or data models are affected
- **aleph-cli**: No impact -- CLI communicates via API, not the UI
- **i18n**: Minor additions for aria-labels on the hamburger button and mobile panel toggles (both `en.json` and `es.json`)
- **Risk**: Low -- changes are CSS/layout only; existing Playwright E2E tests will catch regressions
