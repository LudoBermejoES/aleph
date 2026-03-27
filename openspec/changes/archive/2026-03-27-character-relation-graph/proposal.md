## Why

The character detail page shows relations and connections as plain text lists, but the relationship graph spec requires that entity-centered graphs appear on profile pages. Characters in particular have rich webs of relationships (romantic bonds, tactical partnerships, life debts, directional connections) that are hard to grasp from a list. A visual graph — already implemented for entity pages — should appear on character pages too, reusing the existing `EntityGraphView.client.vue` component.

## What Changes

- Add an interactive relationship graph to the character detail page, placed after the Relations section
- The graph shows the current character as the center node
- Entity relations (bidirectional) appear as edges colored by attitude score, labeled from the character's perspective
- Character connections (directional) appear as directed edges labeled with the connection label (neutral gray, since connections have no attitude score)
- Clicking a node navigates to the correct page: `/characters/[slug]` for character nodes, `/entities/[slug]` for others
- Node names are resolved from the already-loaded `relations` and `connections` refs — no additional API calls needed

## Capabilities

### New Capabilities

- `character-relation-graph`: Interactive graph panel on the character detail page combining entity relations and character connections

### Modified Capabilities

- `character-management`: Character detail page gains a graph section (requirement 7.x — visual relationship display)
- `relationship-graph`: Graph component now used on character pages in addition to entity pages

## Impact

- `app/pages/campaigns/[id]/characters/[slug]/index.vue` — add graph data computed property and `EntityGraphView` section
- `app/components/EntityGraphView.client.vue` — no changes needed; reused as-is
- `server/services/relationships.ts` — `computeAttitudeColor` already importable client-side (or inline the color logic)
- `i18n/locales/en.json` + `es.json` — add `characters.graph` translation key
- No server changes required — data already loaded by existing `relations` and `connections` refs
