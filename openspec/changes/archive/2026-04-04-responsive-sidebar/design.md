# Design: Responsive Layout & Mobile Sidebar

## Context

The app layout is defined in `app/layouts/default.vue` as a `flex h-screen` container with a fixed `w-64` sidebar `<aside>`. There is no mechanism to hide or collapse the sidebar. The Characters page (`app/pages/campaigns/[id]/characters/index.vue`) renders a secondary filter sidebar. Several pages use `<table>` or CSS grid layouts that assume wide viewports.

Tailwind CSS and shadcn-vue are already in the project, providing breakpoint utilities (`md:`, `lg:`) and the Sheet component for slide-over panels.

## Goals / Non-Goals

### Goals

1. Make the app usable on screens as narrow as 375px (standard mobile)
2. Provide a hamburger toggle for the sidebar on narrow screens
3. Ensure tables never cause horizontal page overflow
4. Adapt the timeline calendar grid for small screens
5. Keep desktop experience unchanged

### Non-Goals

- Native mobile app or PWA features
- Bottom tab navigation (mobile-native pattern)
- Redesigning the sidebar content or navigation structure
- Touch gestures (swipe to open sidebar)

## Decisions

### 1. Collapsible sidebar with hamburger menu on mobile

The sidebar will be hidden by default on screens below the `md` breakpoint (768px). A hamburger button will appear in a top bar. Tapping it opens the sidebar as a slide-over overlay using shadcn-vue's `Sheet` component (side="left").

**Why:** Sheet provides an accessible, animated slide-over with backdrop and focus trapping out of the box. It avoids custom CSS transitions and handles escape-to-close and click-outside-to-close.

**Alternatives considered:**

- _CSS-only toggle with translate-x_: Simpler but lacks focus trapping, backdrop, and accessibility features that Sheet provides for free.
- _Always-visible collapsed icon sidebar_: Takes up horizontal space on mobile and requires redesigning every nav item to work as an icon-only element.

### 2. Use Tailwind breakpoints with md (768px) as the threshold

The `md:` breakpoint (768px) is the dividing line between mobile and desktop layout behavior. Below `md`, the sidebar is hidden and a top bar appears. At `md` and above, the sidebar is always visible as it is today.

**Why:** 768px is the standard tablet-portrait width and Tailwind's built-in `md` breakpoint. It avoids custom breakpoints and aligns with common responsive design practice.

**Alternatives considered:**

- _Custom 800px breakpoint_: Marginally wider but requires extending the Tailwind config for a non-standard value. The 32px difference is negligible.
- _lg (1024px) threshold_: Would hide the sidebar on tablets in landscape, which is unnecessarily aggressive given the sidebar is only 256px wide.

### 3. Character filter sidebar becomes a Sheet on mobile

On screens below `md`, the character filter sidebar will render inside a shadcn-vue Sheet (triggered by a "Filters" button) instead of as a persistent side column. On desktop, it remains as-is.

**Why:** Reuses the same Sheet pattern as the main sidebar, keeping the mobile UX consistent. Filters are used intermittently, so hiding them behind a button is acceptable on mobile.

**Alternatives considered:**

- _Collapsible accordion above the list_: Works but takes vertical space away from the character list, which is the primary content.
- _Popover/dropdown_: Too small for the number of filter controls.

### 4. Tables get horizontal scroll wrappers

All data tables (attendance, transactions, rolls) will be wrapped in a `div` with `overflow-x-auto` so they scroll horizontally when their content exceeds the viewport width.

**Why:** This is the simplest, most reliable approach. It requires no structural changes to the tables themselves and preserves the full data display.

**Alternatives considered:**

- _Responsive table with stacked rows on mobile_: Requires significant restructuring of each table and custom CSS per table. Overkill for tables that are not the primary content on most pages.
- _Hide columns on mobile_: Loses data visibility; users would need to know which columns are hidden.

### 5. Timeline grid adapts columns on mobile

The timeline calendar grid will use responsive Tailwind grid classes: `grid-cols-1` on mobile, `grid-cols-2 sm:grid-cols-4 md:grid-cols-7` progression. Day cells will stack or wrap naturally.

**Why:** A 7-column grid at 375px makes each cell ~50px wide, which is too narrow for any content. Reducing columns keeps cells usable.

**Alternatives considered:**

- _Horizontal scroll on the grid_: Loses the calendar visual metaphor and makes it hard to see a full week.
- _List view on mobile_: Would require a completely separate component; the grid with fewer columns is simpler and still recognizable as a calendar.

## Risks / Trade-offs

- **E2E test selectors**: Sidebar being inside a Sheet on mobile changes the DOM structure. E2E tests that target sidebar links may need viewport-conditional logic or a mobile-specific test path.
- **Sheet nesting**: If a user opens the filter Sheet while the sidebar Sheet is open, both would overlap. Mitigation: close the sidebar Sheet when navigating to any page (which already happens via route change).
- **Performance**: Sheet uses Vue Teleport + transitions. On low-end devices this is negligible compared to the existing Tiptap editor overhead.
- **Content reflow**: Pages with mixed content (text + tables + grids) may reflow in unexpected ways. Manual QA on key pages at 375px, 768px, and 1280px widths is needed.
