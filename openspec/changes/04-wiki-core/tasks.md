# Tasks: Wiki Core

## 1. Database Schema

- [ ] 1.1 Create `entity_types` schema with built-in flag and campaign scope
- [ ] 1.2 Create `entity_templates` and `entity_template_fields` schemas
- [ ] 1.3 Create `entities` schema with slug, parent_id, template_id, visibility
- [ ] 1.4 Create `tags` and `entity_tags` schemas
- [ ] 1.5 Generate and apply migration
- [ ] 1.6 Add seed function to create built-in entity types on campaign creation

## 2. Entity CRUD API

- [ ] 2.1 Implement `POST /api/campaigns/:id/entities` (validate, insert DB row, write .md file)
- [ ] 2.2 Implement `GET /api/campaigns/:id/entities/:slug` (read DB + parse .md file)
- [ ] 2.3 Implement `PUT /api/campaigns/:id/entities/:slug` (update DB + rewrite .md file)
- [ ] 2.4 Implement `DELETE /api/campaigns/:id/entities/:slug` (delete DB row + remove .md file)
- [ ] 2.5 Implement `GET /api/campaigns/:id/entities` with query params: type, tag, visibility, parent_id, search, page, limit
- [ ] 2.6 Add slug generation utility (slugify name, enforce uniqueness per campaign)
- [ ] 2.7 Add permission checks (RBAC middleware) to all entity endpoints

## 3. Type & Template API

- [ ] 3.1 Implement `GET /api/campaigns/:id/entity-types` (list built-in + custom)
- [ ] 3.2 Implement `POST /api/campaigns/:id/entity-types` (create custom type, DM only)
- [ ] 3.3 Implement template CRUD endpoints (create, read, update, delete)
- [ ] 3.4 Implement template field CRUD with reordering support

## 4. Tagging API

- [ ] 4.1 Implement `GET /api/campaigns/:id/tags`
- [ ] 4.2 Implement `POST /api/campaigns/:id/tags` (create tag with name and color)
- [ ] 4.3 Implement tag assignment/removal on entities (PATCH endpoint)

## 5. Entity List Page

- [ ] 5.1 Create `app/pages/campaigns/[id]/entities/index.vue`
- [ ] 5.2 Build filter bar component: type dropdown, tag multi-select, visibility toggle
- [ ] 5.3 Implement paginated entity list with name, type icon, tags, updated date
- [ ] 5.4 Add search input with debounced API query

## 6. Entity Detail Page

- [ ] 6.1 Create `app/pages/campaigns/[id]/entities/[slug].vue`
- [ ] 6.2 Build frontmatter fields display component (renders template fields above content)
- [ ] 6.3 Integrate MDCRenderer for markdown body
- [ ] 6.4 Build breadcrumb component using recursive ancestor query
- [ ] 6.5 Display child entities list below content
- [ ] 6.6 Add edit button/page for entity metadata and content
