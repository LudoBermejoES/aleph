import type Database from 'better-sqlite3'
import { eq } from 'drizzle-orm'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { hasMinRole, isEntityVisibleTo } from '../utils/permissions'
import type { CampaignRole } from '../utils/permissions'
import { mapPins } from '../db/schema/maps'
import { entities } from '../db/schema/entities'

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
  entityImageUrl: string | null
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
  entityImageUrl: string | null
}

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
      entityImageUrl: entities.imageUrl,
      entityVisibility: entities.visibility,
      entityCreatedBy: entities.createdBy,
    })
    .from(mapPins)
    .leftJoin(entities, eq(mapPins.entityId, entities.id))
}

function withEntityVisibility(
  row: JoinedPinRow,
  role: CampaignRole,
  userId: string,
): PinWithEntity {
  const { entityVisibility, entityCreatedBy, ...pin } = row
  const canSeeEntity =
    !pin.entityId ||
    (entityVisibility != null &&
      isEntityVisibleTo(role, userId, entityVisibility, entityCreatedBy ?? ''))
  return canSeeEntity ? pin : { ...pin, entityType: null, entityImageUrl: null }
}

/**
 * All of a map's pins, joined with their linked entity's image/type, filtered by the pin's
 * OWN visibility (`filterPinsByVisibility`, unchanged) and then stripped of entity fields the
 * viewer isn't allowed to see. Feeds both the map detail endpoint and the standalone pins
 * list endpoint, which must return the same shape (design.md D1).
 */
export function getPinsWithEntity(
  db: BetterSQLite3Database,
  mapId: string,
  role: CampaignRole,
  userId: string,
): PinWithEntity[] {
  const rows = selectJoinedPins(db).where(eq(mapPins.mapId, mapId)).all() as JoinedPinRow[]
  const visible = filterPinsByVisibility(rows, role)
  return visible.map((row) => withEntityVisibility(row, role, userId))
}

/**
 * Single-pin equivalent, used by the POST endpoint so its response is byte-for-byte the same
 * shape the GET endpoints return for the row it just created (design.md D1's "verify the
 * created row against the GET's row shape" -- this makes them share the actual query instead
 * of two hand-written shapes that can drift).
 */
export function getPinWithEntity(
  db: BetterSQLite3Database,
  pinId: string,
  role: CampaignRole,
  userId: string,
): PinWithEntity | undefined {
  const row = selectJoinedPins(db).where(eq(mapPins.id, pinId)).get() as JoinedPinRow | undefined
  if (!row) return undefined
  return withEntityVisibility(row, role, userId)
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
