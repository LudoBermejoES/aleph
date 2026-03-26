## Why

42 out of 46 pages in the frontend directly call `$fetch()` inline, with no abstraction layer — every page owns its own loading state, error handling, and API paths. This creates pervasive copy-paste patterns that make the frontend fragile to refactor and hard to read. As the feature set has stabilized post-study-phase, this is the right moment to pay this debt.

## What Changes

- Introduce a `useCampaignApi` composable that centralizes all campaign-scoped API calls
- Introduce a `useAsyncData` pattern (or composable wrapper) for consistent loading/error state across pages
- Replace inline `$fetch()` calls in pages and form components with composable-provided functions
- Add typed response interfaces for all API resources on the frontend
- Eliminate `as any` casts from API responses (currently 61 instances)

## Capabilities

### New Capabilities

- `frontend-api-layer`: A composable-based API client for campaign resources — encapsulates endpoint paths, request options, and typed response shapes. Pages call `api.getCharacters()`, not `$fetch('/api/campaigns/...')`.
- `frontend-loading-state`: A unified loading/error state pattern used consistently across all pages and form components — replaces ad-hoc `ref<boolean>` + `try/catch` combinations.

### Modified Capabilities

- `core`: No spec-level behavior changes — this is a purely internal refactor. User-visible behavior is unchanged.

## Impact

- **app/composables/**: Two new composables (`useCampaignApi.ts`, `usePageState.ts`)
- **app/pages/**: All 42 pages with inline `$fetch` updated to use composables
- **app/components/**: 10 form components updated to use composable-provided fetchers
- **No API changes**: Server-side routes are untouched
- **No behavior changes**: Users see identical functionality
