## Context

The `entities` table already has `type: "location"` as a built-in type and `parentId` for hierarchy. The `characters` table has `locationEntityId` (nullable FK to entities). The `entity_relations` table supports `located_in` relation type for many-to-many location links. Maps already support pins linking to entity IDs. No new schema tables are needed.

## Goals / Non-Goals

**Goals:**
- First-class Locations UI with list, hierarchy tree, detail (inhabitants + organizations + sub-locations + map pins), create, edit, delete
- Characters have a single "primary location" (`characters.locationEntityId` — where they currently are)
- Organizations and characters can have additional "presence" locations via `entity_relations` (type: `located_in`)
- Location detail page shows: description, sub-locations, primary inhabitants (characters with `locationEntityId` = this), relation-linked characters and organizations, and linked map pins
- Location subtypes stored in entity frontmatter `fields.subtype` (no new DB column needed)

**Non-Goals:**
- Location-specific stat blocks, inventory, or currency
- Calendar/event integration in this change (future change)
- Map editor changes (maps already link to entity IDs via `map_pins.entityId`)
- Full organization form rework (only add locations panel to detail view)

## Decisions

### Data storage: entities, not a new table
Locations are stored as `entities` rows with `type = 'location'`. The `parentId` column on `entities` provides the hierarchy. Content (lore, description) lives in markdown files at `{contentDir}/location/{slug}.md`. This is consistent with all other entity types and reuses the auto-linking, search, visibility, and permission infrastructure.

### Subtype: frontmatter field, not a DB column
Location subtype (country, city, dungeon, etc.) is stored as `fields.subtype` in the markdown frontmatter and returned in the entity's `frontmatter.fields` object. This avoids a schema migration and is consistent with how custom fields work for other entity types.

### Primary location vs. presence locations
- **Primary location** (`characters.locationEntityId`): where a character currently is. Single value, set on the character record. Shown on character detail and editable from the character form.
- **Presence locations** (entity_relations `located_in`): for organizations and characters that have a presence in multiple locations (Strahd in both Castle Ravenloft and Village of Barovia). Added and removed from the location detail page.

### API routes: dedicated `/locations/` namespace
Rather than using the generic `/entities?type=location`, dedicated routes at `/api/campaigns/[id]/locations/` give us:
- Typed response shapes (include `subtype`, `parentName`, `childCount`, `inhabitantCount`)
- Location-specific sub-routes: `[slug]/inhabitants`, `[slug]/organizations`, `[slug]/sub-locations`
- Consistent with `/characters/` and `/organizations/` patterns

### Location list: flat + tree
The list page shows locations flat (sortable, filterable by subtype) with a "parent" breadcrumb. A tree view toggle is a nice-to-have but not required for the first implementation.

### Inhabitants on location detail
Two panels:
1. **Primary inhabitants**: `SELECT characters WHERE locationEntityId = this entity id` (join to entity for name/slug)
2. **Also present** (via relations): `SELECT entity_relations WHERE (sourceEntityId = X OR targetEntityId = X) AND relationLabel = 'located_in'`

### Character form: location picker
A `<select>` (or searchable combobox) populated by `GET /api/campaigns/[id]/locations` sorted alphabetically, with a "None" option. Sets `form.locationEntityId` which is included in the PUT/POST body to the characters API.

### Organizations → Locations panel
On the organization detail page, show locations where this organization has a `located_in` entity relation. Allow adding and removing from the detail page (not from the org form — keep the form simple).

## Risks / Trade-offs

- `entity_relations` table must already have `located_in` as a valid `relation_type` value — check existing schema before inserting
- `characters.locationEntityId` is already in schema but may not be exposed in current GET/PUT endpoints — must verify and add if missing
- The location picker on the character form adds API load (must fetch location list on form mount) — acceptable since campaigns rarely have thousands of locations
