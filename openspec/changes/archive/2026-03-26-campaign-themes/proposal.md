## Why

Aleph campaigns cover wildly different RPG settings — grimdark fantasy, cyberpunk, cosmic horror, high fantasy, western, etc. A single default theme forces every campaign to look identical, losing the atmospheric immersion that tools like World Anvil and Amsel provide. The core spec already mandates visual themes per campaign; this change delivers that requirement.

## What Changes

- Add a `theme` field to the campaigns table (string, nullable, defaults to `default`)
- Define 10 built-in RPG themes as Tailwind CSS variable overrides: `default`, `dark-fantasy`, `cyberpunk`, `cosmic-horror`, `high-fantasy`, `western`, `steampunk`, `eldritch`, `fey-wilds`, `undead`
- Apply the active campaign theme to all campaign pages by injecting a data attribute on the `<html>` or campaign layout wrapper
- Add a theme picker to the campaign creation form and the campaign settings/edit page
- Show a preview of theme colors when selecting

## Capabilities

### New Capabilities
- `campaign-themes`: Per-campaign visual theme selection — 10 built-in themes, stored in DB, applied globally to all campaign pages, configurable on create and edit

### Modified Capabilities
- `core`: The existing "visual themes per campaign" requirement transitions from planned to implemented

## Impact

- **DB**: New `theme` column on `campaigns` table — migration required
- **API**: `POST /campaigns` and `PATCH /campaigns/:id` accept and return `theme`
- **Frontend**: Campaign layout wrapper applies theme CSS class; theme picker in create dialog and settings page
- **CSS**: 10 theme definitions as `:root[data-theme="x"]` CSS variable overrides in `main.css`
- **No breaking changes** — existing campaigns default to `default` theme
