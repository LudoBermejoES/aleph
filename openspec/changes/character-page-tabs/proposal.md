## Why

The character detail page currently lists all sections in a single long scroll, making it hard to navigate characters with rich data (description, backstory, history, relations, inventory, template fields, etc.). Organising these sections into tabs will make the page scannable and let users jump directly to the information they need.

## What Changes

- The character detail page gains a tab bar below the existing header (portrait + name + badges + actions).
- Sections are reorganised into four tabs:
  - **Main info** — Description, Current Status, Secret notes
  - **Story** — Backstory, History (story so far)
  - **Relations** — Relationships list, Organizations list, Map of relations (graph)
  - **Play info** — Richness/Wealth, Inventory, Stats, Abilities, Template fields
- The header block (portrait, name, type badge, status badge, location, age, companion indicator, action buttons) stays outside the tabs and is always visible.
- The active tab is remembered in a `?tab=` query param so links and reloads preserve the selection.

## Capabilities

### New Capabilities

- `character-page-tabs`: Tabbed layout for the character detail page, reorganising all existing sections into four named tabs.

### Modified Capabilities

- `character-management`: The character detail page UI changes significantly (sections move into tabs). No API behaviour changes.

## Impact

- `app/pages/campaigns/[id]/characters/[slug]/index.vue` — primary change, sections wrapped in tab panels.
- `app/components/` — may use shadcn-vue `Tabs` / `TabsList` / `TabsTrigger` / `TabsContent` components already present in the project.
- `i18n/locales/en.json` and `es.json` — new tab label keys.
- No API, CLI, or DB changes required.
