# Tasks: Wiki Core

## 1. Database Schema

- [x] 1.1 Create `entity_types` schema with built-in flag and campaign scope
- [x] 1.2 Create `entity_templates` and `entity_template_fields` schemas
- [x] 1.3 Create `entities` schema with slug, parent_id, template_id, visibility
- [x] 1.4 Create `tags` and `entity_tags` schemas
- [x] 1.5 Generate and apply migration
- [x] 1.6 Add seed function to create built-in entity types on campaign creation

## 2. Entity CRUD API

- [x] 2.1 Implement `POST /api/campaigns/:id/entities` (validate, insert DB row, write .md file)
- [x] 2.2 Implement `GET /api/campaigns/:id/entities/:slug` (read DB + parse .md file)
- [x] 2.3 Implement `PUT /api/campaigns/:id/entities/:slug` (update DB + rewrite .md file)
- [x] 2.4 Implement `DELETE /api/campaigns/:id/entities/:slug` (delete DB row + remove .md file)
- [x] 2.5 Implement `GET /api/campaigns/:id/entities` with query params: type, tag, visibility, parent_id, search, page, limit
- [x] 2.6 Add slug generation utility (slugify name, enforce uniqueness per campaign)
- [x] 2.7 Add permission checks (RBAC middleware) to all entity endpoints

## 3. Type & Template API

- [x] 3.1 Implement `GET /api/campaigns/:id/entity-types` (list built-in + custom)
- [x] 3.2 Implement `POST /api/campaigns/:id/entity-types` (create custom type, DM only)
- [ ] 3.3 Implement template CRUD endpoints (create, read, update, delete)
- [ ] 3.4 Implement template field CRUD with reordering support

## 4. Tagging API

- [x] 4.1 Implement `GET /api/campaigns/:id/tags`
- [x] 4.2 Implement `POST /api/campaigns/:id/tags` (create tag with name and color)
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

## 7. Tests (TDD)

### Unit Tests (Vitest)

- [x] 7.1 Test slug generation: enforces uniqueness per campaign (duplicate name gets numeric suffix)
- [x] 7.2 Test entity type seed function: creates all built-in types for new campaign

### Integration Tests (@nuxt/test-utils)

- [ ] 7.3 Test `POST /api/campaigns/:id/entities`: creates DB row + .md file, returns entity with slug
- [ ] 7.4 Test `GET /api/campaigns/:id/entities/:slug`: returns entity with parsed frontmatter and markdown body
- [ ] 7.5 Test `PUT /api/campaigns/:id/entities/:slug`: updates DB row + rewrites .md file, returns updated entity
- [ ] 7.6 Test `DELETE /api/campaigns/:id/entities/:slug`: removes DB row + .md file, subsequent GET returns 404
- [ ] 7.7 Test entity list endpoint: filters by type, tag, visibility, and parent_id return correct subsets
- [ ] 7.8 Test entity list endpoint: pagination (page + limit params) returns correct page with total count
- [ ] 7.9 Test entity list endpoint: permission-filtered results exclude entities user cannot see
- [ ] 7.10 Test entity CRUD endpoints enforce RBAC: player cannot delete entity, DM can
- [ ] 7.11 Test template CRUD: create template with fields, assign to entity, verify fields appear in entity response
- [ ] 7.12 Test custom field values: entity stores and returns custom field values from template
- [ ] 7.13 Test tagging: create tag, assign to entity, filter entity list by tag returns correct results
- [ ] 7.14 Test hierarchical nesting: create parent → child entities, GET child returns parent in breadcrumb, GET parent lists children

### Component Tests (@vue/test-utils)

- [ ] 7.15 Test filter bar component: type dropdown, tag multi-select, and visibility toggle emit correct filter params
- [ ] 7.16 Test breadcrumb component: renders ancestor chain with correct links
- [ ] 7.17 Test frontmatter fields display component: renders template fields with correct values
