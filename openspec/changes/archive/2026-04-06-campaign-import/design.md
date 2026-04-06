## Context

Export is fully implemented at `server/services/campaign-export.ts` and produces a stable versioned JSON (`"version": "1.0"`) with up to 24 resource types. All records carry their original database IDs (nanoid strings). The challenge with import is that those IDs will collide if the same campaign is imported twice, or across instances. Every cross-reference between resources (e.g. `entity.campaignId`, `character.entityId`, `session.sessionGroupId`, `relation.fromEntityId`) must be rewritten to new IDs while preserving the structural graph.

## Goals / Non-Goals

**Goals:**

- Accept a valid Aleph export JSON and create a fully populated new campaign in the importing instance
- Remap all IDs deterministically so the same file can be imported multiple times without collision
- Preserve all relationships: entity→character, session→sessionGroup→arc→chapter, entity→relation, item→inventory, etc.
- Authenticated user who triggers import becomes the DM of the new campaign
- Partial exports (missing resource types) import gracefully — omitted types are skipped
- API, UI, and CLI all supported

**Non-Goals:**

- Merging into an existing campaign (always creates a new campaign)
- Importing from other TTRPG tools (only Aleph export format)
- Conflict resolution UI (first import wins; re-import creates a duplicate campaign)
- Incremental / delta import
- Import of `members` (importer becomes DM; other members are not recreated — no user accounts to map to)

## Decisions

### 1. ID remapping via in-memory map

**Decision:** Build a `Map<oldId, newId>` before any DB writes. Walk resources in dependency order, generate new nanoid for each record, register in the map, then substitute all foreign key references before insertion.

**Why:** Atomic, no partial state, easy to test in isolation. The alternative — sequential insert with DB-generated IDs — requires reading back each inserted row to learn its new ID before the next insert, which is slower and more error-prone.

**Dependency order for insertion:**

1. Campaign (root)
2. Tags, EntityTypes
3. Templates (→ campaign), TemplateFields (→ template)
4. Entities (→ campaign, entityType, template, tags)
5. Characters (→ entity)
6. SessionGroups, Arcs (→ campaign)
7. Chapters (→ arc)
8. Sessions (→ campaign, sessionGroup, chapter)
9. Quests (→ campaign, session)
10. Maps, Calendars, Timelines (→ campaign)
11. RelationTypes (→ campaign), Relations (→ entity×2, relationType)
12. Currencies, Items (→ campaign)
13. Shops (→ campaign), Inventories (→ entity/character)
14. Transactions (→ shop, inventory, item, currency)
15. Rolls (→ session)
16. Mentions (→ entity×2 or entity×session)

### 2. Single service, all-or-nothing transaction

**Decision:** Wrap the entire import in a single SQLite transaction via `db.transaction()`. If any insertion fails the whole import rolls back.

**Why:** Prevents half-imported campaigns that are unusable. SQLite's single-writer model makes this cheap and safe.

### 3. Multipart upload vs JSON body

**Decision:** Accept `Content-Type: application/json` body directly (not multipart file upload) at `POST /api/campaigns/import`.

**Why:** The export file is already JSON; wrapping it in multipart adds complexity for no gain. The UI reads the file with `FileReader` and POSTs the parsed JSON. Max size is gated by Nitro's body size limit (configurable via `NITRO_MAX_REQUEST_BODY_SIZE`).

**Alternative considered:** `multipart/form-data` with a file field — rejected because it requires additional parsing middleware and the file is always JSON anyway.

### 4. Name override

**Decision:** If the import payload's `campaign.name` already exists for this user, append ` (imported YYYY-MM-DD)` automatically. Expose an optional `?name=` query parameter so callers can override.

**Why:** Makes re-import non-destructive and predictable without requiring user interaction on every import.

### 5. Version gating

**Decision:** Reject imports where `version !== "1.0"` with HTTP 422 and a clear message. No migration shims for future versions yet.

**Why:** Keeps the import service simple while the format is still at v1. Future versions can add a version-dispatch layer.

## Risks / Trade-offs

- **Large files**: A campaign with thousands of entities could produce a multi-MB JSON. SQLite transactions are synchronous; very large imports may block the event loop briefly. → Mitigation: document a soft limit (e.g. 10 MB) in the API; Nitro body size limit as hard cap.
- **Markdown content with old IDs**: Session summaries and entity content may contain internal links (`/campaigns/<old-id>/entities/<old-id>`). These will reference stale IDs after import. → Mitigation: document as known limitation in v1; a future pass can regex-replace old IDs in text fields using the id map.
- **Members not imported**: Other campaign members lose access. → Mitigation: call out in UI ("You will be the sole DM. Re-invite members after import.").
- **Rolls reference sessions**: If sessions are excluded from a partial export, rolls will be orphaned. → Mitigation: import service skips rolls when their parent session ID has no mapping.

## Migration Plan

- No DB schema changes; no migrations needed.
- Deploy is additive (new endpoint + new service file).
- Rollback: remove the endpoint file; no data to clean up beyond any successfully imported campaigns.

## Open Questions

- Should `POST /api/campaigns/import` require a specific role (any authenticated user is DM of result)? Current plan: any authenticated user can import. ✓
- Should we stream progress back for large imports, or keep it synchronous? Current plan: synchronous with a reasonable body size cap. ✓
