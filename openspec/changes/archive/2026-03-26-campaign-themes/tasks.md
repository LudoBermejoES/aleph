## 1. Theme Definitions — CSS

- [x] 1.1 Add `[data-theme="dark-fantasy"]` CSS variable block to `app/assets/css/main.css` — dark bg, blood-red primary, parchment foreground
- [x] 1.2 Add `[data-theme="cyberpunk"]` — near-black bg, neon cyan primary, magenta accent
- [x] 1.3 Add `[data-theme="cosmic-horror"]` — deep purple/black bg, sickly green primary, desaturated foreground
- [x] 1.4 Add `[data-theme="high-fantasy"]` — warm ivory bg, deep blue primary, gold accent
- [x] 1.5 Add `[data-theme="western"]` — sepia/tan bg, terracotta primary, brown accent
- [x] 1.6 Add `[data-theme="steampunk"]` — dark bronze bg, amber primary, copper accent
- [x] 1.7 Add `[data-theme="eldritch"]` — dark teal bg, pale yellow primary, muted accent
- [x] 1.8 Add `[data-theme="fey-wilds"]` — soft lavender bg, pink primary, green accent
- [x] 1.9 Add `[data-theme="undead"]` — near-black bg, bone-white foreground, grey-green primary
- [x] 1.10 Add `[data-theme="superhero"]` — deep navy bg, bright yellow primary, red accent (comic book palette)

## 2. Theme Constants — Shared Definition

- [x] 2.1 Create `app/utils/themes.ts` exporting `CAMPAIGN_THEMES` array with `{ id, name, colors: { background, primary, accent } }` for each theme (used by picker preview and validation)

## 3. API — Accept Theme on Campaign Create

- [x] 3.1 Update `server/api/campaigns/index.post.ts` to read `body.theme` and save it (already handled in PUT, needs adding to POST)
- [x] 3.2 Confirm `server/api/campaigns/[id]/index.get.ts` returns `theme` in the response

## 4. Theme Picker Component

- [x] 4.1 Create `app/components/ThemePicker.vue` — a styled select showing color swatches (3 dots: bg, primary, accent) + theme name for each option; emits `update:modelValue`

## 5. Campaign Create Form — Add Theme Picker

- [x] 5.1 Add `ThemePicker` to the campaign creation dialog in `app/pages/index.vue` with default `"default"` and bind to form state
- [x] 5.2 Pass `theme` in the POST body when creating the campaign

## 6. Campaign Edit/Settings — Add Theme Picker

- [x] 6.1 Added ThemePicker to campaign dashboard (`app/pages/campaigns/[id]/index.vue`) in a Campaign Settings section, bound to the campaign's current theme
- [x] 6.2 `theme` is included in the PUT body on save via `updateCampaignEntry`

## 7. Layout — Apply Theme to Campaign Pages

- [x] 7.1 Updated `app/layouts/default.vue` to fetch the campaign's `theme` and store it as `useState('campaignTheme')`
- [x] 7.2 Applied `:data-theme="campaignTheme || undefined"` to the `<main>` element (sidebar excluded)
- [x] 7.3 Theme updates reactively via shared `useState('campaignTheme')` written by campaign dashboard on save

## 8. Verify

- [x] 8.1 Run `npm run build` — confirm no TypeScript errors
- [x] 8.2 Manually test each of the 10 non-default themes: create a campaign, select theme, verify UI renders correctly
- [x] 8.3 Run `npm run test` — confirm unit/integration tests pass
- [x] 8.4 Write unit tests for `CAMPAIGN_THEMES` constants and `ThemePicker` component
- [x] 8.5 Write E2E test: create campaign with theme, verify `data-theme` attribute on root layout div
