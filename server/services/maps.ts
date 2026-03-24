import type Database from 'better-sqlite3'
import { hasMinRole } from '../utils/permissions'
import type { CampaignRole } from '../utils/permissions'

// --- Visibility Filtering ---

const VISIBILITY_MIN_ROLE: Record<string, number> = {
  public: 0, members: 2, editors: 3, dm_only: 4, private: 99,
}
const ROLE_LEVEL: Record<string, number> = {
  dm: 5, co_dm: 4, editor: 3, player: 2, visitor: 1,
}

/**
 * Filter pins by visibility based on user role.
 */
export function filterPinsByVisibility<T extends { visibility: string }>(pins: T[], role: string): T[] {
  if (hasMinRole(role as CampaignRole, 'co_dm')) return pins
  const level = ROLE_LEVEL[role] ?? 0
  return pins.filter(p => level >= (VISIBILITY_MIN_ROLE[p.visibility] ?? 99))
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
    return { valid: false, error: `Unsupported image format: ${file.mimetype}. Allowed: PNG, JPEG, WebP` }
  }
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File size ${Math.round(file.size / 1_000_000)}MB exceeds maximum size of 100MB` }
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
  const results = sqlite.prepare(`
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
  `).all(mapId) as BreadcrumbItem[]

  return results
}

// --- Tile Generation ---

/**
 * Check if an image needs tiling (width or height > 4096px).
 */
export function needsTiling(width: number, height: number): boolean {
  return width > 4096 || height > 4096
}

/**
 * Compute tile levels needed for given image dimensions.
 */
export function computeTileLevels(width: number, height: number, tileSize: number = 256): number {
  const maxDim = Math.max(width, height)
  return Math.ceil(Math.log2(maxDim / tileSize)) + 1
}
