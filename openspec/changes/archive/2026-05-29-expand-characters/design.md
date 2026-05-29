## Context

The `useEntityExpansion` composable (`app/composables/useEntityExpansion.ts`) fetches the full campaign graph and places related entities in a radial layout around a selected entity. The expand button in `app/pages/campaigns/[id]/diagrams/[diagramId].vue` is gated on `selectedEntityType === 'organization' || selectedEntityType === 'location'`.

For organization: collects targets of `org-member:*` and `org-location:*` edges where `source === entityId`.
For location: collects sources of `char-location:*` and `org-location:*` edges where `target === entityId`.

Character entities appear as `npcToken` or `genealogyNode` shapes. The `getEntityTypeFromShape` utility maps both to `'character'`.

## Goals / Non-Goals

**Goals:**

- Show the expand button when a character shape is selected
- Place all directly connected entities (of any type) around the character
- Use the same graph endpoint and radial placement logic already in place

**Non-Goals:**

- Filtering by relation type (show all connections, let the user decide what to keep)
- Recursive / multi-hop expansion
- Changing how organizations or locations expand

## Decisions

**Unified edge scan for characters** — instead of pattern-matching on edge key prefixes (which are implementation-specific), collect edges where `edge.source === entityId || edge.target === entityId`. This is more robust: it captures entity-relation edges (which have no predictable key prefix), org-member edges, and char-location edges in one pass.

**Reuse existing graph fetch** — the composable already fetches the full graph. No API change needed.

**Button condition** — add `|| selectedEntityType === 'character'` to the `v-if`. The `selectedEntityType` is already derived from `getEntityTypeFromShape()` which maps `npcToken` and `genealogyNode` to `'character'`.

## Risks / Trade-offs

- **Large character neighborhoods**: A character with 20 relations places 20 shapes, which can be visually noisy. Acceptable for v1; future work could add a count limit.
- **Full graph fetch**: The composable fetches the entire graph with no `entityIds` filter. For large campaigns this is heavier than needed. This pre-exists and is out of scope here.
