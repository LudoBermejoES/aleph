## MODIFIED Requirements

### Requirement: Location CRUD API

The system SHALL expose dedicated API endpoints for managing campaign locations as a specialized view over the `entities` table with `type = 'location'`.

#### Scenario: List locations

- **GIVEN** an authenticated campaign member
- **WHEN** `GET /api/campaigns/:id/locations` is called
- **THEN** the system returns an array of locations visible to the caller's role
- **AND** each item includes: `id, name, slug, subtype, parentId, parentName, childCount, inhabitantCount, visibility, imageUrl, updatedAt`
- **AND** `imageUrl` is the URL of the location's primary gallery image, or `null` when it has no images
- **AND** results are sorted by name ascending
- **AND** an optional `parentId` query param filters to direct children of that location
- **AND** an optional `subtype` query param filters by subtype
- **AND** an optional `search` query param filters by name (case-insensitive prefix match)

#### Scenario: Create location

- **GIVEN** an authenticated user with at least editor role
- **WHEN** `POST /api/campaigns/:id/locations` is called with `{ name, subtype, parentId?, visibility?, content? }`
- **THEN** the system creates an `entities` row with `type = 'location'`
- **AND** writes a markdown file at `{contentDir}/location/{slug}.md` with frontmatter including `fields.subtype`
- **AND** returns `{ id, name, slug, subtype, parentId, visibility }`
- **AND** the slug is derived from the name and made unique within the campaign

#### Scenario: Get location detail

- **GIVEN** an authenticated campaign member
- **WHEN** `GET /api/campaigns/:id/locations/:slug` is called
- **THEN** the system returns the location entity with: `id, name, slug, subtype, parentId, parentName, visibility, content, frontmatter, images, primaryImageUrl, updatedAt`
- **AND** `images` is the gallery array in `sortOrder` order, empty when the location has no images
- **AND** `primaryImageUrl` matches the `imageUrl` column and the URL of the image marked primary
- **AND** returns 404 if the slug does not exist
- **AND** returns 403 if the caller's role does not meet the location's visibility requirement

#### Scenario: Update location

- **GIVEN** an authenticated user with at least editor role
- **WHEN** `PUT /api/campaigns/:id/locations/:slug` is called with updated fields
- **THEN** the system updates the `entities` row and rewrites the markdown file
- **AND** returns the updated location
- **AND** the location's gallery and primary image are unaffected — image state is changed only through the image endpoints

#### Scenario: Delete location

- **GIVEN** an authenticated user with at least dm or co_dm role
- **WHEN** `DELETE /api/campaigns/:id/locations/:slug` is called
- **THEN** the system deletes the `entities` row (cascading to relations, permissions and gallery images)
- **AND** deletes the markdown file from disk
- **AND** returns 204 No Content

### Requirement: Location UI pages

The system SHALL provide dedicated UI pages for managing locations within a campaign.

#### Scenario: Location list page

- **GIVEN** a campaign member navigates to `/campaigns/:id/locations`
- **THEN** all visible locations are listed with name, subtype badge, parent breadcrumb, and inhabitant count
- **AND** a location with a primary image shows it as a small thumbnail beside its name
- **AND** a location with no images shows no thumbnail or placeholder
- **AND** there is a "New Location" button (visible to editors+)
- **AND** there is a search field to filter by name

#### Scenario: Location detail page

- **GIVEN** a user navigates to `/campaigns/:id/locations/:slug`
- **THEN** the page displays: location name, subtype, description (rendered Markdown), ancestors breadcrumb
- **AND** the location's primary image is displayed in the page header when one exists
- **AND** an Images panel shows the full gallery (see the `location-image-gallery` capability)
- **AND** a Sub-locations panel listing direct children
- **AND** an Inhabitants panel listing primary and relation-linked characters
- **AND** an Organizations panel listing linked organizations
- **AND** Edit and Delete buttons (visible to editors+/co_dm+ respectively)

#### Scenario: Location create/edit pages

- **GIVEN** an editor+ navigates to `/campaigns/:id/locations/new` or `/campaigns/:id/locations/:slug/edit`
- **THEN** a form is shown with: Name (required), Subtype (select), Parent Location (optional select), Visibility (select), Description (MarkdownEditor)
- **AND** on the edit page an Images section allows uploading, captioning, reordering, choosing the main image and deleting images
- **AND** on the create page no Images section is shown, because the location must exist before it can hold images
- **AND** the form saves via the API and redirects to the detail page on success
