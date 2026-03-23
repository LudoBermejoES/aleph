# Design: Wiki Core

## Technical Approach

### Entity Storage Model

Entities use a hybrid storage pattern:
- **SQLite**: `entities` table holds metadata (id, campaign_id, type, slug, name, parent_id, template_id, visibility, timestamps)
- **Filesystem**: `content/campaigns/{campaign_slug}/entities/{type}/{slug}.md` holds the markdown body with YAML frontmatter

Frontmatter includes custom field values defined by the entity's template. On save, the API writes both the SQLite row and the `.md` file in a single transaction-like flow (DB first, then file; rollback DB on file failure).

### Type System

- `entity_types` table: `id, campaign_id, slug, name, icon, is_builtin, sort_order`
- Built-in types seeded on campaign creation (character, location, faction, item, event, lore, quest, note)
- Custom types created by DM with chosen icon and slug

### Templates & Custom Fields

- `entity_templates` table: `id, campaign_id, entity_type_id, name, is_default`
- `entity_template_fields` table: `id, template_id, key, label, field_type, options_json, sort_order, required`
- Field types: `text`, `number`, `checkbox`, `select`, `date`, `entity_reference`, `section`
- Template fields are rendered as frontmatter metadata and displayed above the markdown body on the detail page

### Tagging

- `tags` table: `id, campaign_id, name, color`
- `entity_tags` join table: `entity_id, tag_id`
- Tags are campaign-scoped and reusable across entity types

### Hierarchical Nesting

- `parent_id` foreign key on `entities` table (self-referential, nullable)
- Breadcrumb computed via recursive CTE: `WITH RECURSIVE ancestors AS (...)`
- Children listed on parent entity detail page

### API Endpoints

```
GET    /api/campaigns/:id/entities          # list with filters
POST   /api/campaigns/:id/entities          # create
GET    /api/campaigns/:id/entities/:slug    # read
PUT    /api/campaigns/:id/entities/:slug    # update
DELETE /api/campaigns/:id/entities/:slug    # delete
GET    /api/campaigns/:id/entity-types      # list types
POST   /api/campaigns/:id/entity-types      # create custom type
GET    /api/campaigns/:id/tags              # list tags
POST   /api/campaigns/:id/tags              # create tag
```
