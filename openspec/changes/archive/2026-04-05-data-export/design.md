# Design: Campaign Data Export

## Technical Approach

### Export Format: Nested JSON

The export produces a single JSON file with a top-level envelope and nested resource collections:

```json
{
  "version": "1.0",
  "exportedAt": "2026-04-04T12:00:00Z",
  "generator": "aleph",
  "campaign": {
    "id": "...",
    "name": "...",
    "slug": "...",
    "description": "...",
    "theme": "...",
    "isPublic": false,
    "createdAt": "...",
    "updatedAt": "..."
  },
  "entityTypes": [...],
  "entities": [...],
  "characters": [...],
  "sessions": [...],
  "sessionGroups": [...],
  "locations": [...],
  "organizations": [...],
  "quests": [...],
  "maps": [...],
  "calendars": [...],
  "timelines": [...],
  "relations": [...],
  "relationTypes": [...],
  "items": [...],
  "inventories": [...],
  "currencies": [...],
  "shops": [...],
  "transactions": [...],
  "arcs": [...],
  "chapters": [...],
  "rolls": [...],
  "tags": [...],
  "templates": [...],
  "mentions": [...],
  "members": [...]
}
```

**Decision: Nested JSON over flat/CSV.** Campaign data is deeply relational (entities reference other entities, sessions link to arcs/chapters, inventories reference items and characters). A single nested JSON preserves these relationships via ID references and is trivially parseable by any language. CSV would require multiple files and lose relational context. The nested structure also maps directly to a future import endpoint.

### Selective Export

Query parameter `include` accepts a comma-separated list of resource type keys (matching the top-level JSON keys). When omitted, all resource types are included. When provided, only the specified types plus the `campaign` envelope are exported.

Example: `GET /api/campaigns/:id/export?include=entities,characters,sessions`

The valid keys match the top-level JSON keys. Invalid keys are silently ignored.

### File Attachments and Images

Images (entity portraits, map files) are NOT included as binary data. The export includes URLs/paths as stored in the database (`imageUrl`, `filePath` fields). This keeps exports lightweight and fast. Binary asset export (zip with images) is a future enhancement.

### Authorization

Only users with `dm` or `co_dm` role on the campaign can trigger an export. This prevents players from bulk-downloading potentially hidden/secret content. The endpoint reuses the existing campaign membership and role-checking middleware.

### Streaming Consideration

For v1, the export assembles the full JSON in memory and sends it as a single response. SQLite queries are fast for the expected data volumes (hundreds to low thousands of records per resource type). If campaigns grow to tens of thousands of entities, a future enhancement could use JSON streaming (NDJSON or chunked response), but this is unnecessary for the initial implementation.

### Export Service Architecture

Business logic lives in `server/services/campaign-export.ts` -- a pure-ish function that takes a campaign ID, a database instance, and an optional list of resource types, then returns the assembled export object.

```typescript
interface ExportOptions {
  campaignId: string
  include?: string[]  // resource type keys to include; undefined = all
}

async function buildCampaignExport(db: Database, options: ExportOptions): Promise<CampaignExport>
```

The service queries each resource type independently and assembles them into the export structure. This keeps the function testable -- unit tests can mock the DB layer.

### API Endpoint

```
GET /api/campaigns/:id/export
  Query params:
    include (optional) -- comma-separated resource types
  Response:
    Content-Type: application/json
    Content-Disposition: attachment; filename="campaign-<slug>-export-<date>.json"
    Body: the export JSON
  Auth: requires dm or co_dm role
  Errors:
    401 -- not authenticated
    403 -- not a DM/co-DM of this campaign
    404 -- campaign not found
```

### Frontend Integration

A button on the campaign dashboard (visible only to DM/co-DM) that:
1. Calls `GET /api/campaigns/:id/export` via fetch
2. Creates a Blob from the response
3. Triggers a download via a temporary `<a>` element with `download` attribute

No modal or configuration UI for v1 -- just a single click to download everything. Selective export is available via the API/CLI but not exposed in the UI initially.

### CLI Command

```
aleph campaign export <id>
  --format json          (default, only option for v1)
  --include <types>      comma-separated resource types
  --output <file>        output file path (default: stdout)
```

The CLI fetches from the API endpoint and writes the response to the specified file or stdout. This enables piping and scripted workflows.

### Import Design (Future)

The export format is designed to support a future `POST /api/campaigns/:id/import` endpoint:
- The `version` field enables format evolution
- All resources use their original IDs, allowing the import to remap IDs if needed
- The flat resource-type structure (rather than deeply nested trees) makes incremental import straightforward
- A future import would need conflict resolution strategy (skip, overwrite, merge)

Import is explicitly out of scope for this change.
