## Context

An investigation agent audited Aleph's mobile experience via code reading plus live Playwright testing (375×667 and 1280×800, throwaway dev account) and found the mobile nav drawer infrastructure is solid (hamburger → Sheet drawer, closes on route change, already covered by `responsive-sidebar.spec.ts`), but almost nothing else in the app was built with narrow viewports in mind — only 8/67 page files and 12/189 components use any responsive Tailwind variant. Two concrete, reproducible bugs stood out as high-impact and low-risk to fix mechanically; a third (the diagrams/tldraw canvas) is real but requires actual UX design work, not a mechanical fix.

## Goals / Non-Goals

**Goals:**

- `<main>` gets the full remaining viewport width on every page, on every breakpoint.
- Every page's primary title+actions header row wraps instead of clipping/scrolling on narrow viewports.

**Non-Goals:**

- Redesigning the diagrams/tldraw page for mobile (fixed `w-72` `EntityPanel` sidebar, toolbar overflow). This is the single worst offender per the audit, but fixing it well means UX decisions (collapsible panel? bottom sheet? icon-only toolbar?) that deserve their own scoped change, not a mechanical CSS tweak bundled here.
- Wrapping every nested `flex items-center justify-between` in the app (list rows inside cards, per-item toggle rows). The audit flagged the _page header_ pattern specifically as the recurring, high-visibility break; per-item rows inside `v-for` loops are shorter-content and lower-risk, and sweeping literally all ~30 remaining instances without individual review risks visual regressions in tight card layouts for comparatively low benefit.
- Making the `MarkdownEditor` toolbar (19 buttons) more compact on mobile — flagged as cosmetic/lower-priority; it already wraps without overflowing.
- Any change to `SearchCommand`'s internal markup, search behavior, or the Ctrl+K shortcut — only its container's position changed.

## Decisions

- **Fix `SearchCommand` at the layout level, not the component level.** The bug is that `<SearchCommand>` is rendered as a plain, unconstrained flex sibling of `<main>` inside `app/layouts/default.vue`'s root `.flex.h-screen` row (`main` is `flex-1`, but `SearchCommand`'s root `<div>` has no `flex-basis`/`shrink`, so it takes its own content width — measured at 145px — out of the row, silently shrinking `main`). The fix wraps the existing `<SearchCommand>` invocation in `<div class="fixed top-2 right-2 z-30 hidden md:block">`, removing it from flex flow entirely. Considered instead: making the trigger icon-only and placing it inside the fixed mobile top bar so mobile keeps a visible affordance — rejected for this change since the trigger was already invisible on mobile (rendered at y=0, behind the top bar's z-40), so hiding it below `md` causes no functional regression today; adding a mobile-visible search trigger is a genuine new feature, not a bug fix, and is left for a follow-up if wanted.
- **Fix header wrapping via a mechanical, targeted sweep, not a global CSS rule.** Each of the 31 target header rows got `flex-wrap gap-y-2` appended to its existing `class` attribute in place (verified via a scripted pass matching on exact `file:line`, not a blind find/replace, since the same `flex items-center justify-between` string is reused elsewhere in these files for unrelated per-item rows that were deliberately left alone). Considered instead: a global `.page-header` utility class — rejected as a larger refactor (would require introducing and back-filling a new shared class/component across every page) for the same visual outcome as the two-word class addition.
- **`gap-y-2` alongside the existing `gap-4`/no-gap** ensures that when the row wraps, the second line doesn't sit flush against the first.

## Risks / Trade-offs

- [Hiding the search trigger below `md` removes a UI element some users might expect to always see, even if it rendered incorrectly before] → It was already functionally inaccessible on mobile (visually hidden behind the top bar); net effect for mobile users is neutral, not a regression. Flagged in the proposal's Impact section as a visual-only breaking change for transparency.
- [31 files touched mechanically] → Verified with a full project `vue-tsc --noEmit` (0 errors) and the existing `responsive-sidebar.spec.ts` E2E suite (7/7 passing) plus a manual Playwright check confirming `<main>` now reports full viewport width on both the dashboard and a campaign home page at 375px, and that the campaign home header now wraps its "Back to Campaigns" button onto its own line instead of clipping it.

## Migration Plan

Standard deploy: merge, CI runs unit/integration/E2E, push to `master` triggers the existing GitHub Actions deploy. No data migration — pure frontend CSS/layout changes, zero API or schema impact. Rollback is a plain revert.
