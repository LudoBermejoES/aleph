## Why

The diagram editor has grown from a simple canvas wrapper to a 983-line god component (`diagramId.vue`) that handles 15+ concerns: selection tracking, arrow dimming, entity expansion, relationship dialog, sync relations, map modal, entity popover, filtering, reflow, TLDR import, auto-save, and custom event handling. Shape creation logic is duplicated three times across the client and server. The graph API endpoint has N+1 query patterns that generate hundreds of unnecessary database queries. This accumulated debt makes every new diagram feature riskier and harder to test.

## What Changes

- **Extract 4 composables** from `diagramId.vue` to reduce it from ~983 lines to ~350:
  - `useEditorSelection` — selection tracking for the toolbar buttons
  - `useArrowDimming` — highlight/restore arrow opacity on selection
  - `useSyncRelations` — fetch graph data and create arrow shapes + bindings
  - `useEntityExpansion` — expand related entities around org/location shapes
- **Create shared client-side shape utilities** (`app/utils/diagram-shapes.ts`):
  - Single `ENTITY_TYPE_TO_SHAPE` mapping used everywhere
  - `createEntityShapeProps()` function matching the server-side `buildXxxShape` helpers
  - Eliminate 3 separate inline shape creation blocks
- **Fix N+1 queries in graph API** (`server/api/campaigns/[id]/graph/index.get.ts`):
  - Batch character location lookups with `inArray()` instead of per-character queries
  - Batch org-location lookups instead of per-org queries
  - Extract edge-building logic into `server/services/graph-builder.ts`
- **Extract entity search** from `RelationshipDialog.vue` into a reusable `EntitySearchInput.vue` component

## Capabilities

### New Capabilities

- `diagram-code-refactor`: Internal refactoring of diagram editor code — composable extraction, shared utilities, query optimization, and component decomposition. No user-facing behavior changes.

### Modified Capabilities

## Impact

- **app/pages/campaigns/[id]/diagrams/[diagramId].vue** — major reduction, logic extracted to composables
- **New composables:** `app/composables/useEditorSelection.ts`, `useArrowDimming.ts`, `useSyncRelations.ts`, `useEntityExpansion.ts`
- **New utility:** `app/utils/diagram-shapes.ts` — shared entity type mapping + shape prop builders
- **New service:** `server/services/graph-builder.ts` — extracted graph edge-building logic
- **Modified:** `server/api/campaigns/[id]/graph/index.get.ts` — delegates to graph-builder, batched queries
- **New component:** `app/components/diagrams/EntitySearchInput.vue` — extracted from RelationshipDialog
- **Modified:** `app/components/diagrams/RelationshipDialog.vue` — uses EntitySearchInput
- **No API contract changes** — all endpoints return the same data
- **No CLI impact** — purely internal refactoring
- **All existing tests must continue to pass** — behavior-preserving refactor
