## MODIFIED Requirements

### Requirement: Export embeds images as base64 data URIs

The system SHALL read all image files referenced by image fields in the exported data and embed them in the export JSON under a top-level `images` map, keyed by original URL, with values as base64 data URIs. The set of image-bearing fields walked by the collector SHALL include the `url` of every location gallery image (`locationImages`), not only the single-image fields.

#### Scenario: Export with images produces images map

- GIVEN a DM exports a campaign that has at least one entity with an `imageUrl` pointing to an uploaded image
- WHEN the DM sends `GET /api/campaigns/:id/export`
- THEN the export JSON contains a top-level `images` object
- AND the `images` object has an entry keyed by the original image URL
- AND the value is a base64 data URI string starting with `data:image/`

#### Scenario: Export version is 1.1 when images are present

- GIVEN a DM exports a campaign that has at least one embedded image
- WHEN the DM sends `GET /api/campaigns/:id/export`
- THEN the export JSON `version` field is `"1.1"`

#### Scenario: Export version is 1.1 even when no images exist

- GIVEN a DM exports a campaign that has no uploaded images
- WHEN the DM sends `GET /api/campaigns/:id/export`
- THEN the export JSON `version` field is `"1.1"`
- AND the `images` object is present but empty (`{}`)

#### Scenario: Missing image file is skipped without error

- GIVEN an entity's `imageUrl` references a file that does not exist on disk
- WHEN the DM exports the campaign
- THEN the export succeeds with status 200
- AND the missing URL is absent from the `images` map
- AND no error is returned

#### Scenario: All image-bearing fields are collected

- GIVEN a campaign has images on entities, characters, sessionGroups, maps, mapLayers, items, and location galleries
- WHEN the DM exports the campaign
- THEN the `images` map contains entries for all of their image URLs

#### Scenario: Every gallery image is embedded, not just the primary

- GIVEN a location with three gallery images of which one is primary
- WHEN the DM exports the campaign
- THEN the `images` map contains an entry for each of the three URLs
- AND each value is a base64 data URI

### Requirement: Import restores embedded images and rewrites URLs

The system SHALL, when importing a `"1.1"` export, write each embedded image to the new campaign's content directory and update all image URL fields in the imported records to reference the new campaign. This SHALL include the `url` of every imported location gallery image, and `entities.imageUrl` SHALL be re-derived from the restored primary rather than left pointing at the source campaign.

#### Scenario: Images are written to disk on import

- GIVEN a user imports a `"1.1"` export containing embedded images
- WHEN the user sends `POST /api/campaigns/import`
- THEN each image file is written to `{newContentDir}/images/{filename}`
- AND the filename is preserved from the original URL

#### Scenario: Image URL fields are rewritten to new campaign

- GIVEN a user imports a `"1.1"` export containing embedded images
- WHEN the import completes successfully
- THEN entity `imageUrl` fields in the imported records reference `/api/campaigns/{newId}/images/{filename}`
- AND character `portraitUrl` fields are rewritten similarly
- AND sessionGroup, map, mapLayer, and item image fields are rewritten similarly
- AND location gallery image `url` fields are rewritten similarly

#### Scenario: Gallery images are readable after import

- GIVEN a `"1.1"` export containing a location with three gallery images
- WHEN the import completes
- THEN each image's file exists on disk under the new campaign's content directory
- AND requesting each image's URL returns the image bytes with status 200

#### Scenario: 1.0 export imports successfully without image restoration

- GIVEN a user imports a `"1.0"` export (no `images` key)
- WHEN the user sends `POST /api/campaigns/import`
- THEN the import succeeds with status 201
- AND image URL fields in the imported records retain their original values (which may be broken)
- AND no error is returned

#### Scenario: Import version validation accepts both 1.0 and 1.1

- WHEN a user sends `POST /api/campaigns/import` with `version: "1.1"`
- THEN the response status is 201

#### Scenario: Import version validation still rejects unknown versions

- WHEN a user sends `POST /api/campaigns/import` with `version: "2.0"`
- THEN the response status is 422
