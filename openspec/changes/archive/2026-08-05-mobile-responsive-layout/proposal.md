## Why

A specialized mobile-UX audit (code audit + live Playwright testing at 375×667 and 390×844) found the app was never actually responsive-first, though its infrastructure suggested otherwise: the hamburger/drawer sidebar (`responsive-sidebar.spec.ts`) works, but only 8/67 page files and 12/189 components use any `sm:`/`md:`/`lg:` classes. Two concrete, high-impact bugs were confirmed live: (1) the global `SearchCommand` trigger renders as an unconstrained flex sibling of `<main>` in the root layout, silently eating up to 145px of viewport width on every single page (61% of a 375px screen left for `<main>`, worse than it looks because the trigger is also invisible on mobile — rendered behind the fixed top bar); (2) nearly every list/detail page header uses `flex items-center justify-between` with no wrap, so the primary action button (New Campaign, Edit, Delete, etc.) gets pushed off-screen on narrow viewports, reachable only via an undiscoverable manual horizontal scroll.

## What Changes

- Take `SearchCommand` out of the root layout's flex row entirely (fixed positioning) so it can never again consume `<main>`'s width, on any viewport.
- Add `flex-wrap` (plus a small row gap) to the title+actions header row on every campaign list-index page and every entity detail page that used the non-wrapping `justify-between` idiom (31 files).
- **BREAKING (visual only)**: the global search trigger button, previously squeezed at the far right edge of every page's flex row and invisible on mobile, is now a small fixed control in the top-right corner, visible only at `md:` and above. It was already non-functional/invisible on mobile before this change, so no mobile user loses existing functionality; desktop users see the same trigger in a fixed position instead of inline.

## Capabilities

### New Capabilities

- `mobile-responsive-layout`: the root app layout does not let auxiliary UI steal width from the main content area on any viewport, and page header rows wrap their action buttons onto a second line instead of clipping or forcing horizontal scroll on narrow viewports.

### Modified Capabilities

(none — no existing spec covered this behavior; `sidebar-nav-groups` covers icons only, not width/wrapping)

## Impact

- `app/layouts/default.vue` — `SearchCommand` wrapper repositioned.
- 31 page files across `app/pages/campaigns/[id]/**` and `app/pages/index.vue` — header row `class` gains `flex-wrap gap-y-2`.
- No API, data model, or `aleph-cli` impact — pure frontend layout/CSS.
- Explicitly out of scope (documented in design.md as follow-up, not attempted here): a dedicated mobile redesign of the diagrams/tldraw canvas page (fixed-width entity sidebar, toolbar overflow) — audited as the single worst-offending page but requiring real UX design decisions (collapsible panel, toolbar layout) beyond a mechanical CSS fix; and wrapping the remaining ~30 nested list-item/card flex rows not part of a page's primary header, which are lower-impact per the audit.
