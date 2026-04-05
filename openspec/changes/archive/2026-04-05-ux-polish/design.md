## Context

The Aleph frontend has a well-designed `LoadingSkeleton` component and `useLoadingState` composable already in use on ~15 list pages, plus an `ErrorToast` component used on ~12 pages. The patterns exist and work -- this change is about consistent adoption across the remaining pages and closing accessibility gaps in interactive components.

The project uses shadcn-vue, which provides accessible Dialog, Command, and Button primitives. Several hand-rolled equivalents exist that bypass these primitives and miss accessibility features.

## Goals / Non-Goals

**Goals:**

- Every page that loads data shows a loading skeleton during fetch
- Every page that loads data shows a meaningful error state when the fetch fails
- All interactive controls have accessible names (aria-label or associated label)
- All modal dialogs use proper ARIA roles, focus trapping, and keyboard dismissal
- All filter/toolbar controls are keyboard-navigable
- Browser `prompt()` is eliminated in favor of accessible dialogs

**Non-Goals:**

- No WCAG AAA compliance audit (targeting AA-level for interactive controls only)
- No color contrast or font-size audit (separate concern)
- No screen reader end-to-end testing (manual QA recommended but not automated here)
- No changes to API endpoints, data models, or auth flows
- No redesign of component layout or visual appearance

## Decisions

**Decision 1: Use existing `useLoadingState` composable everywhere**
Rather than creating a wrapper component or Suspense boundary, apply the same `useLoadingState` + `LoadingSkeleton` + `ErrorToast` pattern already proven on list pages. This keeps the codebase consistent, requires no new abstractions, and is straightforward to apply page-by-page. Detail pages will use the same `withLoading` wrapper for their fetch calls.

**Decision 2: Replace `.catch(() => [])` with `withLoading` error propagation**
The `useLoadingState` composable already handles error capture via `withLoading`. Pages that bypass it with raw `.catch(() => [])` will be refactored to use `withLoading`, which sets the `error` ref that `ErrorToast` reads. This is a mechanical refactor -- swap the fetch pattern, wire the error display.

**Decision 3: Replace hand-rolled modal with shadcn-vue Dialog**
The session-groups page uses a `div.fixed.inset-0` overlay without `role="dialog"`, `aria-modal`, focus trapping, or Escape key handling. Replacing it with the shadcn-vue `Dialog`/`DialogContent` component provides all of these for free and matches the pattern used elsewhere (e.g., `ApiKeyCreateDialog`, `ItemTransferDialog`). The visual appearance will be preserved via the same styling classes.

**Decision 4: Use inline Dialog for MarkdownEditor link insertion**
Replace `prompt('Enter URL:')` with a small shadcn-vue Dialog rendered inside the MarkdownEditor component. The dialog will have a labelled text input, Cancel, and Insert buttons. This eliminates the blocking browser prompt and provides keyboard-accessible, screen-reader-friendly link insertion.

**Decision 5: Add aria-labels via i18n keys**
All new aria-labels will use `$t()` keys so they are translatable. Keys will follow the pattern `aria.<component>.<action>` (e.g., `aria.markdownEditor.bold`, `aria.diceRoller.rollD20`). This ensures screen reader text is available in both supported locales.

**Decision 6: Keyboard navigation for character filters**
The character filter bar (`select` elements + tag buttons) will be wrapped in a toolbar pattern with `role="toolbar"` and arrow-key navigation between filter groups. Individual `<select>` elements already support keyboard interaction natively; the gap is that the filter bar as a whole is not announced or navigable as a coherent group.

**Decision 7: SearchCommand ARIA improvements**
The existing `SearchCommand.vue` uses the shadcn-vue `Command` primitive, which already provides `role="combobox"` and `role="listbox"` semantics. The fix is limited: ensure `aria-label` is set on the command input and that result items have `role="option"`. No structural rewrite needed.

## Risks / Trade-offs

- [Risk] Replacing the session-groups hand-rolled modal with Dialog may subtly change transition/styling -> Mitigation: match existing classes on DialogContent; visual regression checked in E2E
- [Risk] Adding `useLoadingState` to detail pages that currently use raw `ref()` for data requires refactoring the fetch logic -> Mitigation: mechanical change, same pattern used on 15+ pages already
- [Risk] MarkdownEditor link dialog adds template complexity to an already large component -> Mitigation: dialog is small (input + two buttons); no new composable needed
- [Risk] i18n key additions require both en.json and es.json updates -> Mitigation: all keys added in a single task with both files edited together
