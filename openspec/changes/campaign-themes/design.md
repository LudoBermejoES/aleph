## Context

The `theme` column already exists on the `campaigns` table (text, nullable) and the `PUT /api/campaigns/:id` handler already accepts `body.theme`. The DB migration is in place. What's missing is:
1. The actual theme definitions (CSS variables)
2. Theme application at the campaign layout level
3. Theme picker UI in the create dialog and campaign settings

## Goals / Non-Goals

**Goals:**
- Define 10 RPG-flavored themes as CSS variable overrides
- Apply the active campaign theme to all campaign pages automatically
- Add theme picker to campaign creation form and settings
- Show a visual preview (color swatches) when selecting a theme

**Non-Goals:**
- Custom CSS per campaign (user-authored styles)
- Per-user theme preference (theme is per-campaign, set by DM)
- Dark/light mode toggle (separate concern)
- Themes affecting the campaign list page or auth pages (only applies inside a campaign)

## Decisions

### 1. CSS variable overrides via `data-theme` attribute on the layout wrapper

**Decision:** Apply themes by setting `data-theme="<name>"` on the `<main>` element in the campaign layout. CSS defines `:root[data-theme="dark-fantasy"] { --background: ...; --foreground: ...; }` overrides.

**Why over alternatives:**
- *Tailwind class per theme*: Would require generating all combinations at build time — combinatorial explosion.
- *Scoped CSS per component*: Every component would need theme-aware variants.
- *CSS custom properties on a wrapper*: Correct approach — all existing `hsl(var(--background))` usages in components inherit automatically with zero component changes.

### 2. Theme stored as a string slug on the campaign

**Decision:** Store theme as a plain string (e.g. `"dark-fantasy"`) in the `campaigns.theme` column. Validate against the known list on the server.

**Why:** Simple, queryable, human-readable in the DB. No foreign key table needed for 10 fixed themes.

### 3. Theme definitions in `main.css` as attribute selectors

**Decision:** Define all themes in `app/assets/css/main.css` using `[data-theme="x"]` selectors on the main wrapper div.

**Why:** Keeps all theme tokens in one place, co-located with the existing CSS variable definitions. No extra files, no runtime JS color computation.

### 4. Theme applied in `default.vue` layout, scoped to the main content area

**Decision:** The `<main>` element in `default.vue` receives `:data-theme="campaignTheme"`. The sidebar always uses the default theme (sidebar CSS vars are separate).

**Why:** Keeps the sidebar consistent and readable across all themes. Only the main content area changes.

### 5. Theme picker as a `<select>` with color swatch preview

**Decision:** Use a custom select-like component showing a colored dot + theme name for each option.

**Why over a modal gallery:** Simpler to implement, works inside the existing campaign create dialog without major layout changes. Can be upgraded later.

## Risks / Trade-offs

- **Risk:** Some themes may have poor contrast with existing hardcoded colors in components → **Mitigation:** Define themes carefully, test each against existing UI elements. Each theme must define all standard tokens.
- **Risk:** Theme not loading on first render (flash of default theme) → **Mitigation:** Since Aleph is SPA mode (no SSR), the theme is applied client-side on mount — no server/client mismatch.
- **Trade-off:** 10 fixed themes vs. a theme builder. Fixed themes are much simpler to implement and cover the stated need. A builder can come later.

## Migration Plan

1. No DB migration needed — `theme` column already exists
2. `POST /api/campaigns` needs to accept and save `theme` (currently only PUT handles it)
3. Add CSS theme definitions to `main.css`
4. Update layout to apply `data-theme`
5. Update campaign create/edit forms with picker

No rollback concerns — `theme` is nullable, old campaigns without a theme simply use the default.
