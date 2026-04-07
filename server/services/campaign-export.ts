import { eq } from 'drizzle-orm'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { zipSync } from 'fflate'
import { campaigns } from '../db/schema/campaigns'
import { entities, entityTemplates, entityTemplateFields, tags } from '../db/schema/entities'
import { characters } from '../db/schema/characters'
import { sessionGroups, arcs, chapters, gameSessions, quests } from '../db/schema/sessions'
import { maps } from '../db/schema/maps'
import { relationTypes, entityRelations } from '../db/schema/relations'
import { items, inventories, currencies, shops, transactions } from '../db/schema/inventory'
import { calendars, timelines } from '../db/schema/calendars'
import { sessionRolls } from '../db/schema/rolls'
import { entityMentions } from '../db/schema/mentions'
import { campaignMembers } from '../db/schema/campaign-members'
import { entityTypes } from '../db/schema/entity-types'
import {
  organizations,
  organizationMembers,
  organizationLocations,
} from '../db/schema/organizations'

export interface ExportOptions {
  campaignId: string
  include?: string[] // resource type keys; undefined = all
}

export interface CampaignExport {
  version: string
  exportedAt: string
  generator: string
  campaign: Record<string, unknown>
  entityTypes?: unknown[]
  entities?: unknown[]
  characters?: unknown[]
  sessions?: unknown[]
  sessionGroups?: unknown[]
  quests?: unknown[]
  maps?: unknown[]
  calendars?: unknown[]
  timelines?: unknown[]
  relations?: unknown[]
  relationTypes?: unknown[]
  items?: unknown[]
  inventories?: unknown[]
  currencies?: unknown[]
  shops?: unknown[]
  transactions?: unknown[]
  arcs?: unknown[]
  chapters?: unknown[]
  rolls?: unknown[]
  tags?: unknown[]
  templates?: unknown[]
  mentions?: unknown[]
  members?: unknown[]
  organizations?: unknown[]
  organizationMembers?: unknown[]
  organizationLocations?: unknown[]
}

export const VALID_RESOURCE_TYPES = new Set([
  'entityTypes',
  'entities',
  'characters',
  'sessions',
  'sessionGroups',
  'quests',
  'maps',
  'calendars',
  'timelines',
  'relations',
  'relationTypes',
  'items',
  'inventories',
  'currencies',
  'shops',
  'transactions',
  'arcs',
  'chapters',
  'rolls',
  'tags',
  'templates',
  'mentions',
  'members',
  'organizations',
  'organizationMembers',
  'organizationLocations',
])

// ─── Image embedding helpers ──────────────────────────────────────────────────

const MIME_BY_EXT: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
}

/**
 * Collect all unique non-null image URL strings from the known image-bearing
 * fields across all resource types in the export.
 */
export function collectImageUrls(exportData: CampaignExport): string[] {
  const seen = new Set<string>()
  function add(url: unknown) {
    if (typeof url === 'string' && url) seen.add(url)
  }
  for (const r of exportData.entities ?? []) add((r as Record<string, unknown>).imageUrl)
  for (const r of exportData.characters ?? []) add((r as Record<string, unknown>).portraitUrl)
  for (const r of exportData.sessionGroups ?? []) add((r as Record<string, unknown>).imageUrl)
  for (const r of exportData.maps ?? []) add((r as Record<string, unknown>).imagePath)
  for (const r of exportData.items ?? []) add((r as Record<string, unknown>).imagePath)
  return Array.from(seen)
}

/**
 * Resolve an image URL to a filesystem path inside contentDir.
 *
 * Three URL patterns are supported:
 *   /api/campaigns/{id}/images/{uuid}.{ext}          → contentDir/images/{uuid}.{ext}
 *   /api/campaigns/{id}/entities/{slug}/image        → contentDir/entities/{slug}/image.{ext} (try extensions)
 *   /api/campaigns/{id}/characters/{slug}/portrait   → contentDir/characters/{slug}/portrait.{ext} (try extensions)
 *
 * Returns { filePath, mime } for the first existing file, or null if not found.
 */
function resolveImageFile(
  url: string,
  contentDir: string,
): { filePath: string; mime: string } | null {
  const IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'webp', 'gif']

  // Pattern: /api/campaigns/{id}/images/{filename}
  const imagesMatch = url.match(/\/api\/campaigns\/[^/]+\/images\/([^/?]+)$/)
  if (imagesMatch) {
    const filename = imagesMatch[1]!
    const ext = filename.split('.').pop()?.toLowerCase() ?? ''
    const mime = MIME_BY_EXT[ext] ?? 'application/octet-stream'
    const filePath = resolve(contentDir, 'images', filename)
    return existsSync(filePath) ? { filePath, mime } : null
  }

  // Pattern: /api/campaigns/{id}/entities/{slug}/image
  const entityMatch = url.match(/\/api\/campaigns\/[^/]+\/entities\/([^/]+)\/image$/)
  if (entityMatch) {
    const slug = entityMatch[1]!
    for (const ext of IMAGE_EXTS) {
      const filePath = resolve(contentDir, 'entities', slug, `image.${ext}`)
      if (existsSync(filePath)) {
        return { filePath, mime: MIME_BY_EXT[ext] ?? 'image/png' }
      }
    }
    return null
  }

  // Pattern: /api/campaigns/{id}/characters/{slug}/portrait
  const portraitMatch = url.match(/\/api\/campaigns\/[^/]+\/characters\/([^/]+)\/portrait$/)
  if (portraitMatch) {
    const slug = portraitMatch[1]!
    for (const ext of IMAGE_EXTS) {
      const filePath = resolve(contentDir, 'characters', slug, `portrait.${ext}`)
      if (existsSync(filePath)) {
        return { filePath, mime: MIME_BY_EXT[ext] ?? 'image/png' }
      }
    }
    return null
  }

  return null
}

/**
 * Given a list of image URLs and the campaign's content directory, read each
 * file and return a map of url → base64 data URI. Missing files are silently skipped.
 */
export function embedImages(urls: string[], contentDir: string): Record<string, string> {
  const result: Record<string, string> = {}
  for (const url of urls) {
    const resolved = resolveImageFile(url, contentDir)
    if (!resolved) continue
    try {
      const data = readFileSync(resolved.filePath)
      result[url] = `data:${resolved.mime};base64,${data.toString('base64')}`
    } catch {
      // silently skip unreadable files
    }
  }
  return result
}

function shouldInclude(key: string, include?: string[]): boolean {
  if (!include) return true
  return include.includes(key)
}

export async function buildCampaignExport(
  db: BetterSQLite3Database,
  options: ExportOptions,
): Promise<CampaignExport> {
  const { campaignId, include } = options

  const campaign = db.select().from(campaigns).where(eq(campaigns.id, campaignId)).get()
  if (!campaign) throw new Error(`Campaign not found: ${campaignId}`)

  const result: CampaignExport = {
    version: '1.2',
    exportedAt: new Date().toISOString(),
    generator: 'aleph',
    campaign: campaign as Record<string, unknown>,
  }

  // Filter include to valid keys only
  const filteredInclude = include?.filter((k) => VALID_RESOURCE_TYPES.has(k))

  if (shouldInclude('entityTypes', filteredInclude)) {
    result.entityTypes = db
      .select()
      .from(entityTypes)
      .where(eq(entityTypes.campaignId, campaignId))
      .all()
  }

  if (shouldInclude('entities', filteredInclude)) {
    const entitiesList = db.select().from(entities).where(eq(entities.campaignId, campaignId)).all()
    const templatesList = db
      .select()
      .from(entityTemplates)
      .where(eq(entityTemplates.campaignId, campaignId))
      .all()
    const templateIds = templatesList.map((t) => t.id)
    const templateFieldsList = templateIds.length
      ? db
          .select()
          .from(entityTemplateFields)
          .all()
          .filter((f) => templateIds.includes(f.templateId))
      : []
    result.entities = entitiesList
    result.templates = templatesList.map((t) => ({
      ...t,
      fields: templateFieldsList.filter((f) => f.templateId === t.id),
    }))
  }

  if (shouldInclude('tags', filteredInclude)) {
    result.tags = db.select().from(tags).where(eq(tags.campaignId, campaignId)).all()
  }

  if (shouldInclude('characters', filteredInclude)) {
    const entityIds = db
      .select({ id: entities.id })
      .from(entities)
      .where(eq(entities.campaignId, campaignId))
      .all()
      .map((e) => e.id)
    const charactersList = entityIds.length
      ? db
          .select()
          .from(characters)
          .all()
          .filter((c) => entityIds.includes(c.entityId))
      : []
    result.characters = charactersList
  }

  if (shouldInclude('sessions', filteredInclude)) {
    result.sessions = db
      .select()
      .from(gameSessions)
      .where(eq(gameSessions.campaignId, campaignId))
      .all()
  }

  if (shouldInclude('sessionGroups', filteredInclude)) {
    result.sessionGroups = db
      .select()
      .from(sessionGroups)
      .where(eq(sessionGroups.campaignId, campaignId))
      .all()
  }

  if (shouldInclude('arcs', filteredInclude)) {
    result.arcs = db.select().from(arcs).where(eq(arcs.campaignId, campaignId)).all()
  }

  if (shouldInclude('chapters', filteredInclude)) {
    const arcIds = db
      .select({ id: arcs.id })
      .from(arcs)
      .where(eq(arcs.campaignId, campaignId))
      .all()
      .map((a) => a.id)
    result.chapters = arcIds.length
      ? db
          .select()
          .from(chapters)
          .all()
          .filter((c) => arcIds.includes(c.arcId))
      : []
  }

  if (shouldInclude('quests', filteredInclude)) {
    result.quests = db.select().from(quests).where(eq(quests.campaignId, campaignId)).all()
  }

  if (shouldInclude('maps', filteredInclude)) {
    result.maps = db.select().from(maps).where(eq(maps.campaignId, campaignId)).all()
  }

  if (shouldInclude('calendars', filteredInclude)) {
    result.calendars = db.select().from(calendars).where(eq(calendars.campaignId, campaignId)).all()
  }

  if (shouldInclude('timelines', filteredInclude)) {
    result.timelines = db.select().from(timelines).where(eq(timelines.campaignId, campaignId)).all()
  }

  if (shouldInclude('relations', filteredInclude)) {
    result.relations = db
      .select()
      .from(entityRelations)
      .where(eq(entityRelations.campaignId, campaignId))
      .all()
  }

  if (shouldInclude('relationTypes', filteredInclude)) {
    result.relationTypes = db
      .select()
      .from(relationTypes)
      .where(eq(relationTypes.campaignId, campaignId))
      .all()
  }

  if (shouldInclude('items', filteredInclude)) {
    result.items = db.select().from(items).where(eq(items.campaignId, campaignId)).all()
  }

  if (shouldInclude('inventories', filteredInclude)) {
    result.inventories = db
      .select()
      .from(inventories)
      .where(eq(inventories.campaignId, campaignId))
      .all()
  }

  if (shouldInclude('currencies', filteredInclude)) {
    result.currencies = db
      .select()
      .from(currencies)
      .where(eq(currencies.campaignId, campaignId))
      .all()
  }

  if (shouldInclude('shops', filteredInclude)) {
    result.shops = db.select().from(shops).where(eq(shops.campaignId, campaignId)).all()
  }

  if (shouldInclude('transactions', filteredInclude)) {
    result.transactions = db
      .select()
      .from(transactions)
      .where(eq(transactions.campaignId, campaignId))
      .all()
  }

  if (shouldInclude('rolls', filteredInclude)) {
    result.rolls = db
      .select()
      .from(sessionRolls)
      .where(eq(sessionRolls.campaignId, campaignId))
      .all()
  }

  if (shouldInclude('mentions', filteredInclude)) {
    result.mentions = db
      .select()
      .from(entityMentions)
      .where(eq(entityMentions.campaignId, campaignId))
      .all()
  }

  if (shouldInclude('members', filteredInclude)) {
    result.members = db
      .select()
      .from(campaignMembers)
      .where(eq(campaignMembers.campaignId, campaignId))
      .all()
  }

  if (shouldInclude('organizations', filteredInclude)) {
    const orgList = db
      .select()
      .from(organizations)
      .where(eq(organizations.campaignId, campaignId))
      .all()
    result.organizations = orgList

    const orgIds = orgList.map((o) => o.id)
    if (shouldInclude('organizationMembers', filteredInclude)) {
      result.organizationMembers = orgIds.length
        ? db
            .select()
            .from(organizationMembers)
            .all()
            .filter((m) => orgIds.includes(m.organizationId))
        : []
    }
    if (shouldInclude('organizationLocations', filteredInclude)) {
      result.organizationLocations = orgIds.length
        ? db
            .select()
            .from(organizationLocations)
            .all()
            .filter((l) => orgIds.includes(l.organizationId))
        : []
    }
  }

  return result
}

/**
 * Build a ZIP archive for a campaign export.
 * The ZIP contains:
 *   campaign.json  — the full export data (version "1.2", no images key)
 *   images/{file}  — raw image files for all referenced image URLs
 */
export async function buildCampaignExportZip(
  db: BetterSQLite3Database,
  options: ExportOptions,
): Promise<Buffer> {
  const exportData = await buildCampaignExport(db, options)

  const campaign = db.select().from(campaigns).where(eq(campaigns.id, options.campaignId)).get()!
  const contentDir = (campaign as Record<string, unknown>).contentDir as string

  // Map of ZIP entry name → original image URL (used by importer to rewrite URLs)
  const imageMap: Record<string, string> = {}

  const imageUrls = collectImageUrls(exportData)
  const imageFiles: Record<string, Uint8Array> = {}

  for (const url of imageUrls) {
    const resolved = resolveImageFile(url, contentDir)
    if (!resolved) continue
    try {
      const data = readFileSync(resolved.filePath)
      const imagesMatch = url.match(/\/images\/([^/?]+)$/)
      const entityMatch = url.match(/\/entities\/([^/]+)\/image$/)
      const portraitMatch = url.match(/\/characters\/([^/]+)\/portrait$/)

      let entryName: string | null = null
      if (imagesMatch) {
        entryName = `images/${imagesMatch[1]}`
      } else if (entityMatch) {
        const ext = resolved.filePath.split('.').pop() ?? 'png'
        entryName = `images/entity-${entityMatch[1]}-image.${ext}`
      } else if (portraitMatch) {
        const ext = resolved.filePath.split('.').pop() ?? 'png'
        entryName = `images/character-${portraitMatch[1]}-portrait.${ext}`
      }

      if (entryName) {
        imageFiles[entryName] = new Uint8Array(data)
        imageMap[entryName] = url
      }
    } catch {
      // silently skip unreadable files
    }
  }

  const files: Record<string, Uint8Array> = {
    'campaign.json': Buffer.from(JSON.stringify(exportData, null, 2)),
    'image-map.json': Buffer.from(JSON.stringify(imageMap, null, 2)),
    ...imageFiles,
  }

  return Buffer.from(zipSync(files))
}
