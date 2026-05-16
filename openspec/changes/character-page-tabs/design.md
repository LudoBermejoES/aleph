## Context

The character detail page (`app/pages/campaigns/[id]/characters/[slug]/index.vue`) currently renders all sections in a single scrollable column. As characters accumulate rich data (narrative fields, relations, inventory, template fields) the page becomes unwieldy. The project already uses shadcn-vue, which ships `Tabs`, `TabsList`, `TabsTrigger`, and `TabsContent` components.

## Goals / Non-Goals

**Goals**

- Wrap all below-the-header content in four tabs: Main info, Story, Relations, Play info.
- Preserve every existing section; nothing is removed, only relocated.
- Persist the active tab in a `?tab=` URL query param.
- Keep the header (portrait, name, badges, action buttons) always visible above the tabs.

**Non-Goals**

- Changing any API or DB behaviour.
- Lazy-loading tab content (all data is already fetched on mount).
- Adding new fields or editing capabilities — those belong to the edit page.

## Decisions

### Use shadcn-vue Tabs components

The project already depends on shadcn-vue. Using its `Tabs`, `TabsList`, `TabsTrigger`, and `TabsContent` is consistent with the rest of the UI and requires no new dependencies.

### Persist active tab via `?tab=` query param

`useRoute` / `router.replace` allows the tab to survive a page reload and be shareable via URL. Default tab when param is absent: `main`.

Valid values: `main`, `story`, `relations`, `play`.

### Tab content mapping

| Tab           | Sections moved in                                            |
| ------------- | ------------------------------------------------------------ |
| **Main info** | Description, Current Status, Secret notes (contentRef block) |
| **Story**     | Backstory, History                                           |
| **Relations** | Connections, Relations list, Organizations, Relations graph  |
| **Play info** | Stats, Abilities, Wealth, Inventory, Template fields         |

Stats and Abilities are currently shown before the narrative fields; in the new layout they move to Play info so the most narrative content is prominent.

### No lazy loading

All data is fetched in a single `load()` call on mount. Splitting fetches per tab would add complexity for marginal gain on a page that already loads everything.

## Risks / Trade-offs

- **SEO / deep links**: Tab content is hidden via CSS (`display:none` / `v-show`). Section anchors won't be reachable via hash. → Acceptable for a DM tool, not a public index.
- **Secret reveal injection**: `injectRevealButtons()` runs after mount and targets `contentRef`. The ref must remain attached to the Description section inside the Main info tab. → Keep `ref="contentRef"` on the Description `<div>` inside the tab content.

## Migration Plan

1. Wrap sections in `<TabsContent>` blocks in-place — no data or API changes.
2. Add i18n keys for tab labels.
3. Add/update E2E test to verify each tab displays expected content.

## Open Questions

None — all sections and their placement are specified by the proposal.
