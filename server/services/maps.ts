import type Database from 'better-sqlite3'
import { eq, and, sql } from 'drizzle-orm'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { hasMinRole, isEntityVisibleTo } from '../utils/permissions'
import type { CampaignRole } from '../utils/permissions'
import { mapPins } from '../db/schema/maps'
import { entities } from '../db/schema/entities'
import { characters } from '../db/schema/characters'
import { organizations } from '../db/schema/organizations'
import { entityImages } from '../db/schema/entity-images'
import { stripSecretBlocks } from './content'
import { safeReadEntityFile } from '../utils/content-helpers'
import { buildExcerpt } from './text-excerpt'

// --- Visibility Filtering ---

const VISIBILITY_MIN_ROLE: Record<string, number> = {
  public: 0,
  members: 2,
  editors: 3,
  dm_only: 4,
  private: 99,
}
const ROLE_LEVEL: Record<string, number> = {
  dm: 5,
  co_dm: 4,
  editor: 3,
  player: 2,
  visitor: 1,
}

/**
 * Filter pins by visibility based on user role.
 */
export function filterPinsByVisibility<T extends { visibility: string }>(
  pins: T[],
  role: string,
): T[] {
  if (hasMinRole(role as CampaignRole, 'co_dm')) return pins
  const level = ROLE_LEVEL[role] ?? 0
  return pins.filter((p) => level >= (VISIBILITY_MIN_ROLE[p.visibility] ?? 99))
}

// --- Pins + linked entity (design.md D3) ---
//
// A pin only stores `entityId`; the marker needs the linked entity's image and type too
// (improve-map-pin-markers-and-deletion). Joined here rather than per-pin client requests.
// The join must not leak an entity the viewer cannot see -- `withEntityVisibility` strips
// `entityImageUrl`/`entityType` (never the pin itself) for an entity the viewer's role/user
// cannot view, mirroring the same rule `buildVisibilityFilter` applies to entity lists.
//
// move-pins-and-resolve-entity-images/design.md D3: an entity's main image lives in one of
// FOUR places depending on its type, and a switch on `entities.type` is explicitly rejected
// (a location can have both a gallery image AND `entities.image_url`; custom campaign types
// match no branch). Priority, most specific first:
//   1. entity_images.url WHERE is_primary = 1 (the canonical "main image" -- the partial
//      unique index `entity_images_one_primary` guarantees at most one row per entity, so
//      this join cannot fan out a pin into several rows)
//   2. characters.portrait_url (characters.entity_id -> entities.id, unique per entity)
//   3. organizations.image_url (organizations.entity_id -> entities.id)
//   4. entities.image_url (the locations' home, already working before this change)

interface JoinedPinRow {
  id: string
  mapId: string
  entityId: string | null
  childMapId: string | null
  label: string | null
  lat: number
  lng: number
  icon: string | null
  color: string | null
  visibility: string
  groupId: string | null
  entityType: string | null
  entityName: string | null
  entitySlug: string | null
  entityImageUrl: string | null
  // add-pin-popup-entity-preview/design.md D1-D4: the raw sources the popup excerpt is built
  // from, per entity type. Neither is a new JOIN -- `entities`/`organizations` are already
  // joined above for `entityType`/`entityImageUrl`. Never exposed on `PinWithEntity` itself;
  // `attachExcerpts` consumes them and reduces them to one `entityExcerpt` string.
  entityFilePath: string | null
  organizationDescription: string | null
  entityVisibility: string | null
  entityCreatedBy: string | null
}

export interface PinWithEntity {
  id: string
  mapId: string
  entityId: string | null
  childMapId: string | null
  label: string | null
  lat: number
  lng: number
  icon: string | null
  color: string | null
  visibility: string
  groupId: string | null
  entityType: string | null
  entityName: string | null
  entitySlug: string | null
  entityImageUrl: string | null
  /** Short, plain-text, already-visibility-and-secret-filtered excerpt of the linked entity's
   *  text (add-pin-popup-entity-preview/design.md). `null` when there is no linked entity, the
   *  entity is of a type with no established text source, its text is empty, or the viewer
   *  isn't allowed to see it -- same rule entityImageUrl/entityType already follow. */
  entityExcerpt: string | null
}

/** `withEntityVisibility`'s output before excerpt resolution: everything `PinWithEntity` has
 *  except `entityExcerpt`, plus the raw sources needed to build it. Kept internal -- callers
 *  outside this module only ever see the final `PinWithEntity` shape. */
type ResolvedPin = Omit<PinWithEntity, 'entityExcerpt'> & {
  entityFilePath: string | null
  organizationDescription: string | null
}

/** Longest an `entityExcerpt` is allowed to be, in characters, before truncation (design.md
 *  Cost: the excerpt is capped on OUTPUT size, not on how much of the source file is read). */
const EXCERPT_MAX_LENGTH = 200

function selectJoinedPins(db: BetterSQLite3Database) {
  return db
    .select({
      id: mapPins.id,
      mapId: mapPins.mapId,
      entityId: mapPins.entityId,
      childMapId: mapPins.childMapId,
      label: mapPins.label,
      lat: mapPins.lat,
      lng: mapPins.lng,
      icon: mapPins.icon,
      color: mapPins.color,
      visibility: mapPins.visibility,
      groupId: mapPins.groupId,
      entityType: entities.type,
      entitySlug: entities.slug,
      // El nombre VIVO de la entidad. `mapPins.label` es una COPIA que se guardó al crear el
      // pin, así que se queda vieja en silencio cada vez que se renombra el lugar -- ya pasó
      // con cinco pines a la vez. Sirviendo el nombre real, el cliente puede preferirlo y la
      // copia deja de ser una segunda fuente de verdad. La misma familia de defecto que este
      // proyecto ha encontrado varias veces: un valor duplicado que envejece sin avisar.
      entityName: entities.name,
      // design.md D3: COALESCE walks the priority list in order, stopping at the first
      // non-null source. Every joined table's row is at most one per entity (entity_images
      // constrained to is_primary = 1; characters/organizations joined by their own unique
      // entity_id), so this can never multiply a pin.
      entityImageUrl: sql<
        string | null
      >`COALESCE(${entityImages.url}, ${characters.portraitUrl}, ${organizations.imageUrl}, ${entities.imageUrl})`,
      entityFilePath: entities.filePath,
      organizationDescription: organizations.description,
      entityVisibility: entities.visibility,
      entityCreatedBy: entities.createdBy,
    })
    .from(mapPins)
    .leftJoin(entities, eq(mapPins.entityId, entities.id))
    .leftJoin(
      entityImages,
      and(eq(entityImages.entityId, entities.id), eq(entityImages.isPrimary, true)),
    )
    .leftJoin(characters, eq(characters.entityId, entities.id))
    .leftJoin(organizations, eq(organizations.entityId, entities.id))
}

function withEntityVisibility(row: JoinedPinRow, role: CampaignRole, userId: string): ResolvedPin {
  const { entityVisibility, entityCreatedBy, entityFilePath, organizationDescription, ...pin } = row
  const canSeeEntity =
    !pin.entityId ||
    (entityVisibility != null &&
      isEntityVisibleTo(role, userId, entityVisibility, entityCreatedBy ?? ''))
  if (!canSeeEntity) {
    return {
      ...pin,
      entityType: null,
      // El nombre sigue la MISMA regla que el resto de campos de entidad. No es una fuga
      // nueva ocultarlo: el `label` guardado del pin se sigue sirviendo y siempre se sirvió,
      // porque es metadato que escribió el autor del pin, no de la entidad.
      entityName: null,
      entitySlug: null,
      entityImageUrl: null,
      entityFilePath: null,
      organizationDescription: null,
    }
  }
  return { ...pin, entityFilePath, organizationDescription }
}

/**
 * Builds a `location`/`character`'s popup excerpt from its markdown FILE.
 * add-pin-popup-entity-preview/design.md D2/D3: `safeReadEntityFile` (not `readEntityFile`)
 * because this reads N files per pins request -- one bad/missing file must degrade to `null`
 * for its own pin, never fail every other pin on the map. Secret-stripping happens BEFORE
 * excerpting, never after (design D5's ordering requirement) -- taken from
 * `stripSecretBlocks(file.content, role)` directly, the same point `locations/[slug].get.ts`
 * already stops at, and deliberately never through `autoLinkContent` (design D3: that
 * function emits HTML links an excerpt has no use for).
 */
async function excerptFromFile(filePath: string, role: CampaignRole): Promise<string | null> {
  const file = await safeReadEntityFile(filePath)
  if (!file) return null
  const visible = stripSecretBlocks(file.content, role)
  const text = buildExcerpt(visible, EXCERPT_MAX_LENGTH)
  return text || null
}

/**
 * Resolves one pin's `entityExcerpt`, per entity type (design.md's table in proposal.md).
 * `fileCache` dedupes a markdown read across every pin that shares the same `filePath` within
 * one request (design.md Cost) -- keyed with the in-flight PROMISE, not its resolved value, so
 * two pins resolved concurrently by `Promise.all` cannot both trigger a read for the same file.
 */
function resolveExcerpt(
  pin: ResolvedPin,
  role: CampaignRole,
  fileCache: Map<string, Promise<string | null>>,
): Promise<string | null> {
  if (pin.entityType === 'location' || pin.entityType === 'character') {
    if (!pin.entityFilePath) return Promise.resolve(null)
    let cached = fileCache.get(pin.entityFilePath)
    if (!cached) {
      cached = excerptFromFile(pin.entityFilePath, role)
      fileCache.set(pin.entityFilePath, cached)
    }
    return cached
  }
  if (pin.entityType === 'organization') {
    // design.md D4: no `stripSecretBlocks` -- `organizations.description` is a free-text
    // column with no secret-block convention anywhere in this codebase. Visibility is already
    // enforced upstream by `withEntityVisibility`, which nulls `organizationDescription` for
    // an entity this viewer cannot see, same as it does for entityImageUrl/entityType.
    return Promise.resolve(
      pin.organizationDescription
        ? buildExcerpt(pin.organizationDescription, EXCERPT_MAX_LENGTH) || null
        : null,
    )
  }
  // Any other entity type (or no linked entity at all) has no established text source --
  // inventing one would be worse than showing none (proposal.md's Non-Goals).
  return Promise.resolve(null)
}

async function attachExcerpts(pins: ResolvedPin[], role: CampaignRole): Promise<PinWithEntity[]> {
  const fileCache = new Map<string, Promise<string | null>>()
  return Promise.all(
    pins.map(async (pin) => {
      const {
        entityFilePath: _entityFilePath,
        organizationDescription: _organizationDescription,
        ...rest
      } = pin
      const entityExcerpt = await resolveExcerpt(pin, role, fileCache)
      return { ...rest, entityExcerpt }
    }),
  )
}

/**
 * All of a map's pins, joined with their linked entity's image/type/excerpt, filtered by the
 * pin's OWN visibility (`filterPinsByVisibility`, unchanged) and then stripped of entity
 * fields the viewer isn't allowed to see. Feeds both the map detail endpoint and the
 * standalone pins list endpoint, which must return the same shape (design.md D1).
 *
 * `async` since add-pin-popup-entity-preview (design.md's Risks): resolving `entityExcerpt`
 * for a location/character pin needs a file read. Every call site is already inside an async
 * `defineEventHandler`, so this is an added `await`, not a handler restructure.
 */
export async function getPinsWithEntity(
  db: BetterSQLite3Database,
  mapId: string,
  role: CampaignRole,
  userId: string,
): Promise<PinWithEntity[]> {
  const rows = selectJoinedPins(db).where(eq(mapPins.mapId, mapId)).all() as JoinedPinRow[]
  const visible = filterPinsByVisibility(rows, role)
  const resolved = visible.map((row) => withEntityVisibility(row, role, userId))
  return attachExcerpts(resolved, role)
}

/**
 * Single-pin equivalent, used by the POST endpoint so its response is byte-for-byte the same
 * shape the GET endpoints return for the row it just created (design.md D1's "verify the
 * created row against the GET's row shape" -- this makes them share the actual query instead
 * of two hand-written shapes that can drift).
 */
export async function getPinWithEntity(
  db: BetterSQLite3Database,
  pinId: string,
  role: CampaignRole,
  userId: string,
): Promise<PinWithEntity | undefined> {
  const row = selectJoinedPins(db).where(eq(mapPins.id, pinId)).get() as JoinedPinRow | undefined
  if (!row) return undefined
  const resolved = withEntityVisibility(row, role, userId)
  const [withExcerpt] = await attachExcerpts([resolved], role)
  return withExcerpt
}

// --- Image Validation ---

const ALLOWED_MIMETYPES = ['image/png', 'image/jpeg', 'image/webp']
const MAX_FILE_SIZE = 100_000_000 // 100MB

interface ImageInfo {
  mimetype: string
  size: number
}

interface ValidationResult {
  valid: boolean
  error?: string
}

/**
 * Validate an uploaded map image.
 */
export function validateMapImage(file: ImageInfo): ValidationResult {
  if (!ALLOWED_MIMETYPES.includes(file.mimetype)) {
    return {
      valid: false,
      error: `Unsupported image format: ${file.mimetype}. Allowed: PNG, JPEG, WebP`,
    }
  }
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size ${Math.round(file.size / 1_000_000)}MB exceeds maximum size of 100MB`,
    }
  }
  return { valid: true }
}

// --- Breadcrumb ---

interface BreadcrumbItem {
  id: string
  name: string
  slug: string
  parentMapId: string | null
}

/**
 * Compute breadcrumb ancestor chain for a map using recursive CTE.
 */
export function computeBreadcrumb(sqlite: Database.Database, mapId: string): BreadcrumbItem[] {
  const results = sqlite
    .prepare(
      `
    WITH RECURSIVE ancestors AS (
      SELECT id, name, slug, parent_map_id, 0 AS depth
      FROM maps WHERE id = ?
      UNION ALL
      SELECT m.id, m.name, m.slug, m.parent_map_id, a.depth + 1
      FROM maps m JOIN ancestors a ON m.id = a.parent_map_id
    )
    SELECT id, name, slug, parent_map_id as parentMapId
    FROM ancestors
    ORDER BY depth DESC
  `,
    )
    .all(mapId) as BreadcrumbItem[]

  return results
}

// --- Tile Generation ---

/**
 * Compute tile levels needed for given image dimensions.
 */
export function computeTileLevels(width: number, height: number, tileSize: number = 256): number {
  const maxDim = Math.max(width, height)
  return Math.ceil(Math.log2(maxDim / tileSize))
}
