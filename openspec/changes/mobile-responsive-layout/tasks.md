## 1. Fix main-content width bug

- [x] 1.1 Move `SearchCommand` out of the root layout's flex row in `app/layouts/default.vue` (fixed positioning, `md:` and up only)
- [x] 1.2 Verify via Playwright that `<main>` reports full expected width at 375px and 1280px, on the dashboard and a campaign page
- [x] 1.3 Verify the search trigger still opens the dialog on desktop (click)

## 2. Wrap page header rows

- [x] 2.1 Identify every page using the non-wrapping `flex items-center justify-between`/`flex items-start justify-between` header idiom with an `<h1>` or entity-name title
- [x] 2.2 Add `flex-wrap gap-y-2` to each identified header row (31 files)
- [x] 2.3 Visually verify at 375px that a representative header (campaign home) wraps its action button onto its own line

## 3. Regression checks

- [x] 3.1 Full project typecheck (`vue-tsc --noEmit`) clean
- [x] 3.2 Full unit suite passing
- [x] 3.3 `tests/e2e/responsive-sidebar.spec.ts` passing (sidebar/hamburger behavior unaffected)

## 4. Deploy

- [x] 4.1 Commit, push to `master`, verify the GitHub Actions deploy succeeds
