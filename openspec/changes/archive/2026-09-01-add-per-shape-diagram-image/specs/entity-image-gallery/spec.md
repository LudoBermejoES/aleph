## ADDED Requirements

### Requirement: A generic entity holds a gallery of images

The system SHALL expose, for an entity of any type, the same five gallery routes the character,
location and organization galleries expose, under
`/api/campaigns/:id/entities/:slug/images`:

- `GET .../images` SHALL list the entity's images ordered by `sortOrder`, each with `id`, `url`,
  `caption`, `sortOrder` and `isPrimary`. Minimum role: `player`.
- `POST .../images` SHALL accept a multipart upload and create an `entity_images` row. Minimum
  role: `editor`.
- `GET .../images/:imageId` SHALL serve the image bytes. Minimum role: `player`.
- `PATCH .../images/:imageId` SHALL accept any of `caption`, `sortOrder`, `isPrimary`. Minimum
  role: `editor`.
- `DELETE .../images/:imageId` SHALL remove the row and its file. Minimum role: `editor`.

Setting `isPrimary: true` SHALL, in a single transaction, clear `isPrimary` on every other image of
that entity, set it on the target, and update `entities.image_url` to the target's URL. A request
setting `isPrimary: false` on the current primary of a non-empty gallery SHALL be rejected with
HTTP 400. An entity whose `visibility` is `dm_only` MUST NOT expose its images to a caller below
`co_dm`.

The first image uploaded to an empty gallery SHALL become the primary.

#### Scenario: an object gains a second photograph

- **GIVEN** an entity of type `item` with one gallery image
- **WHEN** an editor POSTs a second image
- **THEN** the list returns two images, the first still `isPrimary: true`

#### Scenario: promoting the second photograph updates the entity image

- **GIVEN** an `item` whose gallery holds images A (primary) and B
- **WHEN** an editor sends `PATCH .../images/<B>` with `{ "isPrimary": true }`
- **THEN** the server returns 200, B is primary, A is not
- **AND** `entities.image_url` equals B's URL

#### Scenario: an entity with an image but no gallery rows does not lose it

- **GIVEN** an entity whose `image_url` was set by `entity upload-image`, with no `entity_images` rows
- **WHEN** the gallery is listed
- **THEN** that existing image is still reachable as the entity's image
- **AND** it is not silently replaced by an empty gallery

#### Scenario: a player cannot upload

- **WHEN** a member with the `player` role POSTs an image
- **THEN** the server returns 403

#### Scenario: a player cannot list a dm_only entity images

- **GIVEN** an entity whose `visibility` is `dm_only`
- **WHEN** a member with the `player` role lists its images
- **THEN** the server refuses rather than returning the list

### Requirement: aleph-cli manages entity gallery images

The CLI SHALL offer, under `aleph entity`, the five commands its `character` counterpart offers:
`images <slug>`, `image-add <slug>`, `image-update <slug> <imageId>`,
`image-set-primary <slug> <imageId>` and `image-remove <slug> <imageId>`, each mapping to exactly
one of the routes above. Both skill files — `docs/claude-skill.md` and
`.claude/skills/aleph-cli/SKILL.md` — SHALL be updated together, and the local skill's frontmatter
`version` bumped.

#### Scenario: listing an object images from the CLI

- **WHEN** `aleph entity images el-traje-de-oro --campaign <id>` is run
- **THEN** it prints the gallery rows, marking which is primary

#### Scenario: the command surface matches the HTTP surface

- **WHEN** the endpoint-parity check runs
- **THEN** every new route has exactly one command, and no command names a route that does not exist
