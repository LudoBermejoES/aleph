import { randomUUID } from 'crypto'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { and, eq } from 'drizzle-orm'
import { unzipSync, Unzip, UnzipInflate, UnzipPassThrough } from 'fflate'
import type { IncomingMessage } from 'http'
import type { Readable } from 'stream'
import { campaigns } from '../db/schema/campaigns'
import { campaignMembers } from '../db/schema/campaign-members'
import { entityTypes } from '../db/schema/entity-types'
import { entities, entityTemplates, entityTemplateFields, tags } from '../db/schema/entities'
import { entityImages } from '../db/schema/entity-images'
import { characters } from '../db/schema/characters'
import { sessionGroups, arcs, chapters, gameSessions, quests } from '../db/schema/sessions'
import { maps } from '../db/schema/maps'
import { calendars, timelines } from '../db/schema/calendars'
import { relationTypes, entityRelations } from '../db/schema/relations'
import { items, inventories, currencies, shops, transactions } from '../db/schema/inventory'
import { sessionRolls } from '../db/schema/rolls'
import { entityMentions } from '../db/schema/mentions'
import {
  organizations,
  organizationMembers,
  organizationLocations,
} from '../db/schema/organizations'
import type { CampaignExport } from './campaign-export'
import { join, resolve } from 'path'
import { mkdirSync, writeFileSync, renameSync, rmSync } from 'fs'
import { tmpdir } from 'os'

export interface CampaignImportOptions {
  payload: CampaignExport
  importingUserId: string
  nameOverride?: string
}

export interface CampaignImportResult {
  id: string
  name: string
  slug: string
}

// ─── Image restoration helpers ────────────────────────────────────────────────

const MIME_TO_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

/**
 * Decode each base64 data URI from the images map, write the file to the correct
 * location in the new campaign's content directory, and return a map of old URL → new URL.
 *
 * URL patterns handled:
 *   /api/campaigns/{id}/images/{filename}                  → contentDir/images/{filename}
 *   /api/campaigns/{id}/entities/{slug}/image              → contentDir/entities/{slug}/image.{ext}
 *   /api/campaigns/{id}/locations/{slug}/images/{imageId}  → contentDir/locations/{slug}/images/{imageId}.{ext}
 *   /api/campaigns/{id}/characters/{slug}/images/{imageId} → contentDir/characters/{slug}/images/{imageId}.{ext}
 *   /api/campaigns/{id}/organizations/{slug}/images/{imageId} → contentDir/organizations/{slug}/images/{imageId}.{ext}
 *   /api/campaigns/{id}/characters/{slug}/portrait          → contentDir/characters/{slug}/portrait.{ext}
 */
export function extractAndWriteImages(
  images: Record<string, string>,
  newContentDir: string,
  newCampaignId: string,
  idMap?: Map<string, string>,
): Map<string, string> {
  const urlMap = new Map<string, string>()

  for (const [oldUrl, dataUri] of Object.entries(images)) {
    const match = dataUri.match(/^data:([^;]+);base64,(.+)$/)
    if (!match) continue
    const mime = match[1]!
    const base64Data = match[2]!
    const ext = MIME_TO_EXT[mime] ?? 'png'
    const fileData = Buffer.from(base64Data, 'base64')

    // Pattern: /api/campaigns/{id}/images/{filename}
    const imagesMatch = oldUrl.match(/\/api\/campaigns\/[^/]+\/images\/([^/?]+)$/)
    if (imagesMatch) {
      const filename = imagesMatch[1]!
      const dir = resolve(newContentDir, 'images')
      mkdirSync(dir, { recursive: true })
      writeFileSync(join(dir, filename), fileData)
      urlMap.set(oldUrl, `/api/campaigns/${newCampaignId}/images/${filename}`)
      continue
    }

    // Pattern: /api/campaigns/{id}/entities/{slug}/image
    const entityMatch = oldUrl.match(/\/api\/campaigns\/[^/]+\/entities\/([^/]+)\/image$/)
    if (entityMatch) {
      const slug = entityMatch[1]!
      const dir = resolve(newContentDir, 'entities', slug)
      mkdirSync(dir, { recursive: true })
      writeFileSync(join(dir, `image.${ext}`), fileData)
      urlMap.set(oldUrl, `/api/campaigns/${newCampaignId}/entities/${slug}/image`)
      continue
    }

    // Pattern: /api/campaigns/{id}/locations/{slug}/images/{imageId}
    const galleryMatch = oldUrl.match(
      /\/api\/campaigns\/[^/]+\/locations\/([^/]+)\/images\/([^/?]+)$/,
    )
    if (galleryMatch) {
      const slug = galleryMatch[1]!
      const oldImageId = galleryMatch[2]!
      const imageId = idMap?.get(oldImageId) ?? oldImageId
      const dir = resolve(newContentDir, 'locations', slug, 'images')
      mkdirSync(dir, { recursive: true })
      writeFileSync(join(dir, `${imageId}.${ext}`), fileData)
      urlMap.set(oldUrl, `/api/campaigns/${newCampaignId}/locations/${slug}/images/${imageId}`)
      continue
    }

    // Pattern: /api/campaigns/{id}/characters/{slug}/images/{imageId}
    const charGalleryMatch = oldUrl.match(
      /\/api\/campaigns\/[^/]+\/characters\/([^/]+)\/images\/([^/?]+)$/,
    )
    if (charGalleryMatch) {
      const slug = charGalleryMatch[1]!
      const oldImageId = charGalleryMatch[2]!
      const imageId = idMap?.get(oldImageId) ?? oldImageId
      const dir = resolve(newContentDir, 'characters', slug, 'images')
      mkdirSync(dir, { recursive: true })
      writeFileSync(join(dir, `${imageId}.${ext}`), fileData)
      urlMap.set(oldUrl, `/api/campaigns/${newCampaignId}/characters/${slug}/images/${imageId}`)
      continue
    }

    // Pattern: /api/campaigns/{id}/organizations/{slug}/images/{imageId}
    const orgGalleryMatch = oldUrl.match(
      /\/api\/campaigns\/[^/]+\/organizations\/([^/]+)\/images\/([^/?]+)$/,
    )
    if (orgGalleryMatch) {
      const slug = orgGalleryMatch[1]!
      const oldImageId = orgGalleryMatch[2]!
      const imageId = idMap?.get(oldImageId) ?? oldImageId
      const dir = resolve(newContentDir, 'organizations', slug, 'images')
      mkdirSync(dir, { recursive: true })
      writeFileSync(join(dir, `${imageId}.${ext}`), fileData)
      urlMap.set(oldUrl, `/api/campaigns/${newCampaignId}/organizations/${slug}/images/${imageId}`)
      continue
    }

    // Pattern: /api/campaigns/{id}/characters/{slug}/portrait
    const portraitMatch = oldUrl.match(/\/api\/campaigns\/[^/]+\/characters\/([^/]+)\/portrait$/)
    if (portraitMatch) {
      const slug = portraitMatch[1]!
      const dir = resolve(newContentDir, 'characters', slug)
      mkdirSync(dir, { recursive: true })
      writeFileSync(join(dir, `portrait.${ext}`), fileData)
      urlMap.set(oldUrl, `/api/campaigns/${newCampaignId}/characters/${slug}/portrait`)
      continue
    }
  }

  return urlMap
}

/**
 * Rewrite an image URL using the old→new URL map. Returns the mapped URL,
 * or the original value if not in the map, or null if the input is nullish.
 */
export function rewriteImageUrl(
  oldUrl: string | null | undefined,
  urlMap: Map<string, string>,
): string | null {
  if (!oldUrl) return null
  return urlMap.get(oldUrl) ?? oldUrl
}

function remap(idMap: Map<string, string>, oldId: string | null | undefined): string | null {
  if (!oldId) return null
  return idMap.get(oldId) ?? oldId
}

function remapRequired(idMap: Map<string, string>, oldId: string): string {
  return idMap.get(oldId) ?? oldId
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function buildIdMap(payload: CampaignExport): Map<string, string> {
  const idMap = new Map<string, string>()

  function register(id: string | undefined | null) {
    if (id) idMap.set(id, randomUUID())
  }

  // Campaign
  const campaignId = (payload.campaign as Record<string, unknown>).id as string
  register(campaignId)

  // Tags
  for (const r of payload.tags ?? []) register((r as Record<string, unknown>).id as string)
  // EntityTypes
  for (const r of payload.entityTypes ?? []) register((r as Record<string, unknown>).id as string)
  // Templates
  for (const r of payload.templates ?? []) {
    const t = r as Record<string, unknown>
    register(t.id as string)
    for (const f of (t.fields as Record<string, unknown>[]) ?? []) register(f.id as string)
  }
  // Entities
  for (const r of payload.entities ?? []) register((r as Record<string, unknown>).id as string)
  // Characters
  for (const r of payload.characters ?? []) register((r as Record<string, unknown>).id as string)
  // SessionGroups
  for (const r of payload.sessionGroups ?? []) register((r as Record<string, unknown>).id as string)
  // Arcs
  for (const r of payload.arcs ?? []) register((r as Record<string, unknown>).id as string)
  // Chapters
  for (const r of payload.chapters ?? []) register((r as Record<string, unknown>).id as string)
  // Sessions
  for (const r of payload.sessions ?? []) register((r as Record<string, unknown>).id as string)
  // Quests
  for (const r of payload.quests ?? []) register((r as Record<string, unknown>).id as string)
  // Maps
  for (const r of payload.maps ?? []) register((r as Record<string, unknown>).id as string)
  // Calendars
  for (const r of payload.calendars ?? []) register((r as Record<string, unknown>).id as string)
  // Timelines
  for (const r of payload.timelines ?? []) register((r as Record<string, unknown>).id as string)
  // RelationTypes
  for (const r of payload.relationTypes ?? []) register((r as Record<string, unknown>).id as string)
  // Relations
  for (const r of payload.relations ?? []) register((r as Record<string, unknown>).id as string)
  // Currencies
  for (const r of payload.currencies ?? []) register((r as Record<string, unknown>).id as string)
  // Items
  for (const r of payload.items ?? []) register((r as Record<string, unknown>).id as string)
  // Shops
  for (const r of payload.shops ?? []) register((r as Record<string, unknown>).id as string)
  // Inventories
  for (const r of payload.inventories ?? []) register((r as Record<string, unknown>).id as string)
  // Transactions
  for (const r of payload.transactions ?? []) register((r as Record<string, unknown>).id as string)
  // Rolls
  for (const r of payload.rolls ?? []) register((r as Record<string, unknown>).id as string)
  // Mentions
  for (const r of payload.mentions ?? []) register((r as Record<string, unknown>).id as string)
  // Organizations
  for (const r of payload.organizations ?? []) register((r as Record<string, unknown>).id as string)
  // Location gallery images — remapped so the same export can be imported twice without a
  // primary-key collision. The new id also renames the file and the URL; see
  // extractAndWriteImages.
  for (const r of payload.locationImages ?? [])
    register((r as Record<string, unknown>).id as string)
  for (const r of payload.characterImages ?? [])
    register((r as Record<string, unknown>).id as string)
  for (const r of payload.organizationImages ?? [])
    register((r as Record<string, unknown>).id as string)

  return idMap
}

export function resolveImportName(
  db: BetterSQLite3Database,
  baseName: string,
  userId: string,
): string {
  const existing = db
    .select({ name: campaigns.name })
    .from(campaigns)
    .where(eq(campaigns.createdBy, userId))
    .all()
    .map((c) => c.name)

  if (!existing.includes(baseName)) return baseName

  const date = new Date().toISOString().slice(0, 10)
  return `${baseName} (imported ${date})`
}

export function importCampaign(
  db: BetterSQLite3Database,
  options: CampaignImportOptions,
): CampaignImportResult {
  const { payload, importingUserId, nameOverride } = options
  const idMap = buildIdMap(payload)
  const now = new Date()

  const oldCampaign = payload.campaign as Record<string, unknown>
  const oldCampaignId = oldCampaign.id as string
  const newCampaignId = remapRequired(idMap, oldCampaignId)

  const baseName = nameOverride ?? (oldCampaign.name as string)
  const resolvedName = nameOverride ? baseName : resolveImportName(db, baseName, importingUserId)

  const rawSlug = slugify(resolvedName)
  // Make slug unique by appending a short suffix if needed
  const existingSlugs = db
    .select({ slug: campaigns.slug })
    .from(campaigns)
    .all()
    .map((c) => c.slug)
  let slug = rawSlug
  let attempt = 1
  while (existingSlugs.includes(slug)) {
    slug = `${rawSlug}-${++attempt}`
  }

  const contentDir = join('content', 'campaigns', slug)

  return db.transaction(() => {
    // 1. Create content directory
    mkdirSync(join(process.cwd(), contentDir), { recursive: true })

    // 1b. Extract and write embedded images (v1.1 exports only)
    const imageUrlMap =
      payload.images && Object.keys(payload.images).length > 0
        ? extractAndWriteImages(payload.images, contentDir, newCampaignId, idMap)
        : new Map<string, string>()

    // 2. Campaign
    db.insert(campaigns)
      .values({
        id: newCampaignId,
        name: resolvedName,
        slug,
        description: (oldCampaign.description as string) ?? null,
        isPublic: (oldCampaign.isPublic as boolean) ?? false,
        theme: (oldCampaign.theme as string) ?? null,
        contentDir,
        createdBy: importingUserId,
        createdAt: now,
        updatedAt: now,
      })
      .run()

    // 3. DM membership (members from export are ignored)
    db.insert(campaignMembers)
      .values({
        id: randomUUID(),
        campaignId: newCampaignId,
        userId: importingUserId,
        role: 'dm',
        joinedAt: now,
      })
      .run()

    // 4. Tags
    for (const r of payload.tags ?? []) {
      const t = r as Record<string, unknown>
      db.insert(tags)
        .values({
          id: remapRequired(idMap, t.id as string),
          campaignId: newCampaignId,
          name: t.name as string,
          slug: t.slug as string,
          color: (t.color as string) ?? null,
        })
        .run()
    }

    // 5. EntityTypes
    for (const r of payload.entityTypes ?? []) {
      const t = r as Record<string, unknown>
      db.insert(entityTypes)
        .values({
          id: remapRequired(idMap, t.id as string),
          campaignId: newCampaignId,
          slug: t.slug as string,
          name: t.name as string,
          icon: (t.icon as string) ?? null,
          isBuiltin: (t.isBuiltin as boolean) ?? false,
          sortOrder: (t.sortOrder as number) ?? 0,
        })
        .run()
    }

    // 6. Templates + fields
    for (const r of payload.templates ?? []) {
      const t = r as Record<string, unknown>
      db.insert(entityTemplates)
        .values({
          id: remapRequired(idMap, t.id as string),
          campaignId: newCampaignId,
          entityTypeSlug: t.entityTypeSlug as string,
          name: t.name as string,
          isDefault: (t.isDefault as boolean) ?? false,
          createdAt: now,
        })
        .run()
      for (const f of (t.fields as Record<string, unknown>[]) ?? []) {
        db.insert(entityTemplateFields)
          .values({
            id: remapRequired(idMap, f.id as string),
            templateId: remapRequired(idMap, f.templateId as string),
            key: f.key as string,
            label: f.label as string,
            fieldType: f.fieldType as string,
            optionsJson: (f.optionsJson as string) ?? null,
            sortOrder: (f.sortOrder as number) ?? 0,
            required: (f.required as boolean) ?? false,
          })
          .run()
      }
    }

    // 7. Entities
    for (const r of payload.entities ?? []) {
      const e = r as Record<string, unknown>
      db.insert(entities)
        .values({
          id: remapRequired(idMap, e.id as string),
          campaignId: newCampaignId,
          type: e.type as string,
          name: e.name as string,
          slug: e.slug as string,
          filePath: e.filePath as string,
          visibility: (e.visibility as string) ?? 'members',
          contentHash: (e.contentHash as string) ?? null,
          imageUrl: rewriteImageUrl(e.imageUrl as string, imageUrlMap),
          parentId: remap(idMap, e.parentId as string),
          templateId: remap(idMap, e.templateId as string),
          createdBy: importingUserId,
          createdAt: now,
          updatedAt: now,
        })
        .run()
    }

    // 7b. Location gallery images
    for (const r of payload.locationImages ?? []) {
      const img = r as Record<string, unknown>
      const oldId = img.id as string
      const newId = remapRequired(idMap, oldId)
      const oldUrl = img.url as string
      const newUrl = rewriteImageUrl(oldUrl, imageUrlMap) ?? oldUrl
      // Mirror exactly what extractAndWriteImages wrote to disk: {newId}.{ext-from-mime}.
      // Deriving the extension from the data URI is the only way the row and the file agree
      // when the source stored .jpeg and the mime maps to .jpg.
      const dataUri = payload.images?.[oldUrl]
      const mime = dataUri?.match(/^data:([^;]+);base64,/)?.[1]
      const ext = mime
        ? (MIME_TO_EXT[mime] ?? 'png')
        : ((img.filename as string) ?? '').split('.').pop() || 'png'
      db.insert(entityImages)
        .values({
          id: newId,
          campaignId: newCampaignId,
          entityId: remapRequired(idMap, img.entityId as string),
          filename: `${newId}.${ext}`,
          url: newUrl,
          caption: (img.caption as string) ?? null,
          sortOrder: (img.sortOrder as number) ?? 0,
          isPrimary: (img.isPrimary as boolean) ?? false,
          createdBy: importingUserId,
          createdAt: now,
        })
        .run()
    }

    // 7c. Re-derive each location's imageUrl from its restored primary, rather than trusting the
    // value copied from the source campaign.
    for (const r of payload.locationImages ?? []) {
      const img = r as Record<string, unknown>
      if (!img.isPrimary) continue
      const entityId = remapRequired(idMap, img.entityId as string)
      const restored = db
        .select({ url: entityImages.url })
        .from(entityImages)
        .where(and(eq(entityImages.entityId, entityId), eq(entityImages.isPrimary, true)))
        .get()
      db.update(entities)
        .set({ imageUrl: restored?.url ?? null })
        .where(eq(entities.id, entityId))
        .run()
    }

    // 8. Characters
    for (const r of payload.characters ?? []) {
      const c = r as Record<string, unknown>
      db.insert(characters)
        .values({
          id: remapRequired(idMap, c.id as string),
          entityId: remapRequired(idMap, c.entityId as string),
          characterType: (c.characterType as string) ?? 'npc',
          race: (c.race as string) ?? null,
          class: (c.class as string) ?? null,
          alignment: (c.alignment as string) ?? null,
          status: (c.status as string) ?? 'alive',
          locationEntityId: remap(idMap, c.locationEntityId as string),
          ownerUserId: null, // user IDs don't transfer
          isCompanionOf: remap(idMap, c.isCompanionOf as string),
          folderId: null,
          portraitUrl: rewriteImageUrl(c.portraitUrl as string, imageUrlMap),
        })
        .run()
    }

    // 9. SessionGroups
    for (const r of payload.sessionGroups ?? []) {
      const g = r as Record<string, unknown>
      db.insert(sessionGroups)
        .values({
          id: remapRequired(idMap, g.id as string),
          campaignId: newCampaignId,
          name: g.name as string,
          slug: g.slug as string,
          description: (g.description as string) ?? null,
          imageUrl: rewriteImageUrl(g.imageUrl as string, imageUrlMap),
          sortOrder: (g.sortOrder as number) ?? 0,
          createdAt: now,
          updatedAt: now,
        })
        .run()
    }

    // 10. Arcs
    for (const r of payload.arcs ?? []) {
      const a = r as Record<string, unknown>
      db.insert(arcs)
        .values({
          id: remapRequired(idMap, a.id as string),
          campaignId: newCampaignId,
          name: a.name as string,
          slug: a.slug as string,
          description: (a.description as string) ?? null,
          sortOrder: (a.sortOrder as number) ?? 0,
          status: (a.status as string) ?? 'planned',
        })
        .run()
    }

    // 11. Chapters
    for (const r of payload.chapters ?? []) {
      const c = r as Record<string, unknown>
      db.insert(chapters)
        .values({
          id: remapRequired(idMap, c.id as string),
          arcId: remapRequired(idMap, c.arcId as string),
          name: c.name as string,
          slug: c.slug as string,
          description: (c.description as string) ?? null,
          sortOrder: (c.sortOrder as number) ?? 0,
        })
        .run()
    }

    // 12. Sessions
    for (const r of payload.sessions ?? []) {
      const s = r as Record<string, unknown>
      db.insert(gameSessions)
        .values({
          id: remapRequired(idMap, s.id as string),
          campaignId: newCampaignId,
          title: s.title as string,
          slug: s.slug as string,
          sessionNumber: s.sessionNumber as number,
          scheduledDate: (s.scheduledDate as string) ?? null,
          status: (s.status as string) ?? 'planned',
          summary: (s.summary as string) ?? null,
          arcId: remap(idMap, s.arcId as string),
          chapterId: remap(idMap, s.chapterId as string),
          groupId: remap(idMap, s.groupId as string),
          logFilePath: (s.logFilePath as string) ?? null,
          createdAt: now,
          updatedAt: now,
        })
        .run()
    }

    // 13. Quests
    for (const r of payload.quests ?? []) {
      const q = r as Record<string, unknown>
      db.insert(quests)
        .values({
          id: remapRequired(idMap, q.id as string),
          campaignId: newCampaignId,
          name: q.name as string,
          slug: q.slug as string,
          description: (q.description as string) ?? null,
          status: (q.status as string) ?? 'active',
          parentQuestId: remap(idMap, q.parentQuestId as string),
          entityId: remap(idMap, q.entityId as string),
          isSecret: (q.isSecret as boolean) ?? false,
          assignedCharacterIdsJson: (q.assignedCharacterIdsJson as string) ?? null,
          logFilePath: (q.logFilePath as string) ?? null,
          createdAt: now,
          updatedAt: now,
        })
        .run()
    }

    // 14. Maps
    for (const r of payload.maps ?? []) {
      const m = r as Record<string, unknown>
      db.insert(maps)
        .values({
          id: remapRequired(idMap, m.id as string),
          campaignId: newCampaignId,
          name: m.name as string,
          slug: m.slug as string,
          parentMapId: remap(idMap, m.parentMapId as string),
          imagePath: rewriteImageUrl(m.imagePath as string, imageUrlMap),
          width: (m.width as number) ?? null,
          height: (m.height as number) ?? null,
          minZoom: (m.minZoom as number) ?? 0,
          maxZoom: (m.maxZoom as number) ?? 4,
          isTiled: (m.isTiled as boolean) ?? false,
          visibility: (m.visibility as string) ?? 'members',
          createdAt: now,
          updatedAt: now,
        })
        .run()
    }

    // 15. Calendars
    for (const r of payload.calendars ?? []) {
      const c = r as Record<string, unknown>
      db.insert(calendars)
        .values({
          id: remapRequired(idMap, c.id as string),
          campaignId: newCampaignId,
          name: c.name as string,
          configJson: c.configJson as string,
          currentDateJson: (c.currentDateJson as string) ?? null,
          createdAt: now,
          updatedAt: now,
        })
        .run()
    }

    // 16. Timelines
    for (const r of payload.timelines ?? []) {
      const t = r as Record<string, unknown>
      db.insert(timelines)
        .values({
          id: remapRequired(idMap, t.id as string),
          campaignId: newCampaignId,
          name: t.name as string,
          slug: t.slug as string,
          description: (t.description as string) ?? null,
          sortOrder: (t.sortOrder as number) ?? 0,
          createdAt: now,
        })
        .run()
    }

    // 17. RelationTypes
    for (const r of payload.relationTypes ?? []) {
      const t = r as Record<string, unknown>
      db.insert(relationTypes)
        .values({
          id: remapRequired(idMap, t.id as string),
          campaignId: newCampaignId,
          slug: t.slug as string,
          forwardLabel: t.forwardLabel as string,
          reverseLabel: t.reverseLabel as string,
          isBuiltin: (t.isBuiltin as boolean) ?? false,
        })
        .run()
    }

    // 18. Relations
    for (const r of payload.relations ?? []) {
      const rel = r as Record<string, unknown>
      const newSourceId = remap(idMap, rel.sourceEntityId as string)
      const newTargetId = remap(idMap, rel.targetEntityId as string)
      const newRelTypeId = remap(idMap, rel.relationTypeId as string)
      if (!newSourceId || !newTargetId || !newRelTypeId) continue
      db.insert(entityRelations)
        .values({
          id: remapRequired(idMap, rel.id as string),
          campaignId: newCampaignId,
          sourceEntityId: newSourceId,
          targetEntityId: newTargetId,
          relationTypeId: newRelTypeId,
          forwardLabel: rel.forwardLabel as string,
          reverseLabel: rel.reverseLabel as string,
          attitude: (rel.attitude as number) ?? 0,
          description: (rel.description as string) ?? null,
          metadataJson: (rel.metadataJson as string) ?? null,
          visibility: (rel.visibility as string) ?? 'public',
          isPinned: (rel.isPinned as boolean) ?? false,
          createdBy: importingUserId,
          createdAt: now,
          updatedAt: now,
        })
        .run()
    }

    // 19. Currencies
    for (const r of payload.currencies ?? []) {
      const c = r as Record<string, unknown>
      db.insert(currencies)
        .values({
          id: remapRequired(idMap, c.id as string),
          campaignId: newCampaignId,
          name: c.name as string,
          symbol: (c.symbol as string) ?? null,
          valueInBase: (c.valueInBase as number) ?? 1,
          sortOrder: (c.sortOrder as number) ?? 0,
        })
        .run()
    }

    // 20. Items
    for (const r of payload.items ?? []) {
      const it = r as Record<string, unknown>
      db.insert(items)
        .values({
          id: remapRequired(idMap, it.id as string),
          campaignId: newCampaignId,
          name: it.name as string,
          description: (it.description as string) ?? null,
          weight: (it.weight as number) ?? null,
          priceJson: (it.priceJson as string) ?? null,
          size: (it.size as string) ?? null,
          rarity: (it.rarity as string) ?? 'common',
          type: (it.type as string) ?? null,
          imagePath: rewriteImageUrl(it.imagePath as string, imageUrlMap),
          propertiesJson: (it.propertiesJson as string) ?? null,
          stackable: (it.stackable as boolean) ?? true,
          entityId: remap(idMap, it.entityId as string),
          createdAt: now,
        })
        .run()
    }

    // 21. Shops
    for (const r of payload.shops ?? []) {
      const s = r as Record<string, unknown>
      db.insert(shops)
        .values({
          id: remapRequired(idMap, s.id as string),
          campaignId: newCampaignId,
          name: s.name as string,
          slug: s.slug as string,
          description: (s.description as string) ?? null,
          locationEntityId: remap(idMap, s.locationEntityId as string),
          shopkeeperEntityId: remap(idMap, s.shopkeeperEntityId as string),
          isPlayerOwned: (s.isPlayerOwned as boolean) ?? false,
          ownedByUserId: null, // user IDs don't transfer
          createdAt: now,
        })
        .run()
    }

    // 22. Inventories
    for (const r of payload.inventories ?? []) {
      const inv = r as Record<string, unknown>
      db.insert(inventories)
        .values({
          id: remapRequired(idMap, inv.id as string),
          campaignId: newCampaignId,
          ownerType: inv.ownerType as string,
          ownerId: remapRequired(idMap, inv.ownerId as string),
          name: (inv.name as string) ?? 'Inventory',
        })
        .run()
    }

    // 23. Transactions
    for (const r of payload.transactions ?? []) {
      const tx = r as Record<string, unknown>
      db.insert(transactions)
        .values({
          id: remapRequired(idMap, tx.id as string),
          campaignId: newCampaignId,
          type: tx.type as string,
          fromEntityId: remap(idMap, tx.fromEntityId as string),
          toEntityId: remap(idMap, tx.toEntityId as string),
          itemId: remap(idMap, tx.itemId as string),
          quantity: (tx.quantity as number) ?? null,
          amountsJson: (tx.amountsJson as string) ?? null,
          notes: (tx.notes as string) ?? null,
          createdAt: now,
        })
        .run()
    }

    // 24. Rolls — only if parent session is mapped
    for (const r of payload.rolls ?? []) {
      const roll = r as Record<string, unknown>
      const newSessionId = remap(idMap, roll.sessionId as string)
      if (roll.sessionId && !newSessionId) continue // orphaned roll — skip
      db.insert(sessionRolls)
        .values({
          id: remapRequired(idMap, roll.id as string),
          campaignId: newCampaignId,
          sessionId: newSessionId,
          userId: importingUserId,
          characterId: remap(idMap, roll.characterId as string),
          formula: roll.formula as string,
          resultJson: roll.resultJson as string,
          total: roll.total as number,
          createdAt: now,
        })
        .run()
    }

    // 25. Mentions
    for (const r of payload.mentions ?? []) {
      const m = r as Record<string, unknown>
      const newSourceId = remap(idMap, m.sourceEntityId as string)
      const newTargetId = remap(idMap, m.targetEntityId as string)
      if (!newSourceId || !newTargetId) continue
      db.insert(entityMentions)
        .values({
          id: remapRequired(idMap, m.id as string),
          campaignId: newCampaignId,
          sourceEntityId: newSourceId,
          targetEntityId: newTargetId,
          count: (m.count as number) ?? 1,
          createdAt: now,
        })
        .run()
    }

    // 26. Organizations
    for (const r of payload.organizations ?? []) {
      const o = r as Record<string, unknown>
      db.insert(organizations)
        .values({
          id: remapRequired(idMap, o.id as string),
          campaignId: newCampaignId,
          name: o.name as string,
          slug: o.slug as string,
          description: (o.description as string) ?? null,
          type: (o.type as string) ?? 'faction',
          status: (o.status as string) ?? 'active',
          entityId: remap(idMap, o.entityId as string),
          createdAt: now,
          updatedAt: now,
        })
        .run()
    }

    // 27. Organization Members
    for (const r of payload.organizationMembers ?? []) {
      const m = r as Record<string, unknown>
      const newOrgId = remap(idMap, m.organizationId as string)
      const newCharId = remap(idMap, m.characterId as string)
      if (!newOrgId || !newCharId) continue
      db.insert(organizationMembers)
        .values({
          organizationId: newOrgId,
          characterId: newCharId,
          role: (m.role as string) ?? null,
        })
        .run()
    }

    // 28. Organization Locations
    for (const r of payload.organizationLocations ?? []) {
      const l = r as Record<string, unknown>
      const newOrgId = remap(idMap, l.organizationId as string)
      const newLocId = remap(idMap, l.locationEntityId as string)
      if (!newOrgId || !newLocId) continue
      db.insert(organizationLocations)
        .values({
          organizationId: newOrgId,
          locationEntityId: newLocId,
        })
        .run()
    }

    // 29. Character gallery images (absent in exports before this change — harmless no-op)
    for (const r of payload.characterImages ?? []) {
      const img = r as Record<string, unknown>
      const oldId = img.id as string
      const newId = remapRequired(idMap, oldId)
      const oldUrl = img.url as string
      const newUrl = rewriteImageUrl(oldUrl, imageUrlMap) ?? oldUrl
      const dataUri = payload.images?.[oldUrl]
      const mime = dataUri?.match(/^data:([^;]+);base64,/)?.[1]
      const ext = mime
        ? (MIME_TO_EXT[mime] ?? 'png')
        : ((img.filename as string) ?? '').split('.').pop() || 'png'
      db.insert(entityImages)
        .values({
          id: newId,
          campaignId: newCampaignId,
          entityId: remapRequired(idMap, img.entityId as string),
          filename: `${newId}.${ext}`,
          url: newUrl,
          caption: (img.caption as string) ?? null,
          sortOrder: (img.sortOrder as number) ?? 0,
          isPrimary: (img.isPrimary as boolean) ?? false,
          createdBy: importingUserId,
          createdAt: now,
        })
        .run()
    }

    // 29a. Re-sync characters.portraitUrl from restored primaries
    for (const r of payload.characterImages ?? []) {
      const img = r as Record<string, unknown>
      if (!img.isPrimary) continue
      const entityId = remapRequired(idMap, img.entityId as string)
      const restored = db
        .select({ url: entityImages.url })
        .from(entityImages)
        .where(and(eq(entityImages.entityId, entityId), eq(entityImages.isPrimary, true)))
        .get()
      db.update(characters)
        .set({ portraitUrl: restored?.url ?? null })
        .where(eq(characters.entityId, entityId))
        .run()
    }

    // 30. Organization gallery images
    for (const r of payload.organizationImages ?? []) {
      const img = r as Record<string, unknown>
      const oldId = img.id as string
      const newId = remapRequired(idMap, oldId)
      const oldUrl = img.url as string
      const newUrl = rewriteImageUrl(oldUrl, imageUrlMap) ?? oldUrl
      const dataUri = payload.images?.[oldUrl]
      const mime = dataUri?.match(/^data:([^;]+);base64,/)?.[1]
      const ext = mime
        ? (MIME_TO_EXT[mime] ?? 'png')
        : ((img.filename as string) ?? '').split('.').pop() || 'png'
      db.insert(entityImages)
        .values({
          id: newId,
          campaignId: newCampaignId,
          entityId: remapRequired(idMap, img.entityId as string),
          filename: `${newId}.${ext}`,
          url: newUrl,
          caption: (img.caption as string) ?? null,
          sortOrder: (img.sortOrder as number) ?? 0,
          isPrimary: (img.isPrimary as boolean) ?? false,
          createdBy: importingUserId,
          createdAt: now,
        })
        .run()
    }

    // 30a. Re-sync organizations.imageUrl from restored primaries
    for (const r of payload.organizationImages ?? []) {
      const img = r as Record<string, unknown>
      if (!img.isPrimary) continue
      const entityId = remapRequired(idMap, img.entityId as string)
      const restored = db
        .select({ url: entityImages.url })
        .from(entityImages)
        .where(and(eq(entityImages.entityId, entityId), eq(entityImages.isPrimary, true)))
        .get()
      db.update(organizations)
        .set({ imageUrl: restored?.url ?? null })
        .where(eq(organizations.entityId, entityId))
        .run()
    }

    return { id: newCampaignId, name: resolvedName, slug }
  })
}

/**
 * Gallery rows the base import just created, keyed by the URL they still carry from the source
 * campaign. The ZIP importers need this because `importCampaign` remaps every gallery id, but the
 * ZIP entry names embed the OLD id — this map is the bridge between the two.
 */
function galleryRowsByOldUrl(db: BetterSQLite3Database, newCampaignId: string) {
  const rows = db
    .select({ id: entityImages.id, url: entityImages.url, slug: entities.slug })
    .from(entityImages)
    .innerJoin(entities, eq(entityImages.entityId, entities.id))
    .where(eq(entityImages.campaignId, newCampaignId))
    .all()
  return new Map(rows.map((r) => [r.url, { id: r.id, slug: r.slug }]))
}

const LOCATION_GALLERY_ENTRY_RE = /^images\/location-image-(.+)\.(\w+)$/
const CHARACTER_GALLERY_ENTRY_RE = /^images\/character-image-(.+)\.(\w+)$/
const ORG_GALLERY_ENTRY_RE = /^images\/org-image-(.+)\.(\w+)$/

/**
 * Place one gallery image file from a ZIP and point its row at the new campaign.
 *
 * Returns the new URL, or null when the entry is not a gallery entry (the caller then falls
 * through to the generic image patterns). `place` does the actual write or rename so the buffered
 * and streaming importers can share everything else.
 */
function placeGalleryImage(
  db: BetterSQLite3Database,
  args: {
    entryName: string
    oldUrl: string
    newCampaignId: string
    absContentDir: string
    rows: ReturnType<typeof galleryRowsByOldUrl>
    place: (destPath: string) => void
  },
): string | null {
  let entityType: 'locations' | 'characters' | 'organizations' | null = null
  let ext: string | null = null

  const locMatch = args.entryName.match(LOCATION_GALLERY_ENTRY_RE)
  const charMatch = args.entryName.match(CHARACTER_GALLERY_ENTRY_RE)
  const orgMatch = args.entryName.match(ORG_GALLERY_ENTRY_RE)

  if (locMatch) {
    entityType = 'locations'
    ext = locMatch[2]!
  } else if (charMatch) {
    entityType = 'characters'
    ext = charMatch[2]!
  } else if (orgMatch) {
    entityType = 'organizations'
    ext = orgMatch[2]!
  } else {
    return null
  }

  const row = args.rows.get(args.oldUrl)
  if (!row) return null

  const dir = resolve(args.absContentDir, entityType, row.slug, 'images')
  mkdirSync(dir, { recursive: true })
  const filename = `${row.id}.${ext}`
  args.place(join(dir, filename))

  const newUrl = `/api/campaigns/${args.newCampaignId}/${entityType}/${row.slug}/images/${row.id}`
  db.update(entityImages).set({ filename, url: newUrl }).where(eq(entityImages.id, row.id)).run()
  return newUrl
}

/**
 * Import a campaign from a v1.2 ZIP archive buffer.
 *
 * The ZIP must contain:
 *   campaign.json   — the campaign export data (version "1.2")
 *   image-map.json  — map of ZIP entry name → original image URL
 *   images/*        — raw image files
 *
 * Throws an error with statusCode 422 for invalid ZIPs or unsupported versions.
 */
export function importCampaignFromZip(
  db: BetterSQLite3Database,
  zipBuffer: Buffer,
  importingUserId: string,
  nameOverride?: string,
): CampaignImportResult {
  let unzipped: ReturnType<typeof unzipSync>
  try {
    unzipped = unzipSync(new Uint8Array(zipBuffer))
  } catch {
    const err = new Error('Invalid ZIP archive') as Error & { statusCode: number }
    err.statusCode = 422
    throw err
  }

  const campaignJsonEntry = unzipped['campaign.json']
  if (!campaignJsonEntry) {
    const err = new Error('ZIP is missing campaign.json') as Error & { statusCode: number }
    err.statusCode = 422
    throw err
  }

  let payload: CampaignExport
  try {
    payload = JSON.parse(Buffer.from(campaignJsonEntry).toString('utf8')) as CampaignExport
  } catch {
    const err = new Error('campaign.json is not valid JSON') as Error & { statusCode: number }
    err.statusCode = 422
    throw err
  }

  if (payload.version !== '1.2') {
    const err = new Error(
      `Unsupported version in ZIP: "${payload.version}". ZIP imports require version "1.2".`,
    ) as Error & { statusCode: number }
    err.statusCode = 422
    throw err
  }

  // Parse image-map.json (entry name → old URL)
  const imageMapEntry = unzipped['image-map.json']
  const imageMap: Record<string, string> = imageMapEntry
    ? (JSON.parse(Buffer.from(imageMapEntry).toString('utf8')) as Record<string, string>)
    : {}

  // Run the base import first to get the new campaign ID and content dir
  const result = importCampaign(db, { payload, importingUserId, nameOverride })
  const newCampaignId = result.id
  const absContentDir = join(process.cwd(), 'content', 'campaigns', result.slug)

  // Write image files and build old URL → new URL map
  const urlMap = new Map<string, string>()

  const galleryRows = galleryRowsByOldUrl(db, newCampaignId)

  for (const [entryName, oldUrl] of Object.entries(imageMap)) {
    const fileData = unzipped[entryName]
    if (!fileData) continue

    const galleryUrl = placeGalleryImage(db, {
      entryName,
      oldUrl,
      newCampaignId,
      absContentDir,
      rows: galleryRows,
      place: (destPath) => writeFileSync(destPath, Buffer.from(fileData)),
    })
    if (galleryUrl) {
      urlMap.set(oldUrl, galleryUrl)
      continue
    }

    const imagesMatch = entryName.match(/^images\/([^/]+)$/)
    const entityMatch = entryName.match(/^images\/entity-(.+)-image\.(\w+)$/)
    const portraitMatch = entryName.match(/^images\/character-(.+)-portrait\.(\w+)$/)

    if (imagesMatch) {
      const filename = imagesMatch[1]!
      const dir = resolve(absContentDir, 'images')
      mkdirSync(dir, { recursive: true })
      writeFileSync(join(dir, filename), Buffer.from(fileData))
      urlMap.set(oldUrl, `/api/campaigns/${newCampaignId}/images/${filename}`)
    } else if (entityMatch) {
      const slug = entityMatch[1]!
      const ext = entityMatch[2]!
      const dir = resolve(absContentDir, 'entities', slug)
      mkdirSync(dir, { recursive: true })
      writeFileSync(join(dir, `image.${ext}`), Buffer.from(fileData))
      urlMap.set(oldUrl, `/api/campaigns/${newCampaignId}/entities/${slug}/image`)
    } else if (portraitMatch) {
      const slug = portraitMatch[1]!
      const ext = portraitMatch[2]!
      const dir = resolve(absContentDir, 'characters', slug)
      mkdirSync(dir, { recursive: true })
      writeFileSync(join(dir, `portrait.${ext}`), Buffer.from(fileData))
      urlMap.set(oldUrl, `/api/campaigns/${newCampaignId}/characters/${slug}/portrait`)
    }
  }

  if (urlMap.size === 0) return result

  // Update image URL fields in the DB to rewrite old campaign URLs → new campaign URLs
  for (const [oldUrl, newUrl] of urlMap) {
    db.update(entities).set({ imageUrl: newUrl }).where(eq(entities.imageUrl, oldUrl)).run()
    db.update(characters)
      .set({ portraitUrl: newUrl })
      .where(eq(characters.portraitUrl, oldUrl))
      .run()
    db.update(organizations)
      .set({ imageUrl: newUrl })
      .where(eq(organizations.imageUrl, oldUrl))
      .run()
    db.update(sessionGroups)
      .set({ imageUrl: newUrl })
      .where(eq(sessionGroups.imageUrl, oldUrl))
      .run()
    db.update(maps).set({ imagePath: newUrl }).where(eq(maps.imagePath, oldUrl)).run()
    db.update(items).set({ imagePath: newUrl }).where(eq(items.imagePath, oldUrl)).run()
  }

  return result
}

/**
 * Import a campaign from a v1.2 ZIP delivered as a Node.js Readable stream
 * (e.g. from busboy). Images are written to a temp directory one chunk at a
 * time — never fully buffered — then moved to the real content dir after the
 * base import creates the campaign record.
 *
 * This avoids the ~1 GB peak memory spike of loading all image bytes at once.
 */
export async function importCampaignFromZipStream(
  db: BetterSQLite3Database,
  zipStream: Readable | IncomingMessage,
  importingUserId: string,
  nameOverride?: string,
): Promise<CampaignImportResult> {
  const tmpDir = join(tmpdir(), `aleph-import-${randomUUID()}`)
  mkdirSync(tmpDir, { recursive: true })

  // Collected small files
  let campaignJsonBuf: Buffer | null = null
  let imageMapJsonBuf: Buffer | null = null

  // Stream the ZIP through fflate's Unzip, writing image files to tmpDir
  await new Promise<void>((resolve, reject) => {
    const unzipper = new Unzip()
    unzipper.register(UnzipInflate)
    unzipper.register(UnzipPassThrough)

    unzipper.onfile = (file) => {
      const name = file.name

      if (name === 'campaign.json' || name === 'image-map.json') {
        // Small JSON file — buffer entirely
        const chunks: Buffer[] = []
        file.ondata = (err, chunk, final) => {
          if (err) {
            reject(err)
            return
          }
          chunks.push(Buffer.from(chunk))
          if (final) {
            const buf = Buffer.concat(chunks)
            if (name === 'campaign.json') campaignJsonBuf = buf
            else imageMapJsonBuf = buf
          }
        }
        file.start()
        return
      }

      if (name.startsWith('images/')) {
        // Image file — write directly to temp dir, never buffer whole file
        const safeName = name.replace(/\//g, '__')
        const destPath = join(tmpDir, safeName)
        const fileChunks: Buffer[] = []
        file.ondata = (err, chunk, final) => {
          if (err) {
            reject(err)
            return
          }
          fileChunks.push(Buffer.from(chunk))
          if (final) {
            try {
              mkdirSync(tmpDir, { recursive: true })
              writeFileSync(destPath, Buffer.concat(fileChunks))
            } catch (e) {
              reject(e)
            }
          }
        }
        file.start()
        return
      }

      // Unknown entry — skip
      file.ondata = () => {}
      file.start()
    }

    zipStream.on('data', (chunk: Buffer) => {
      try {
        unzipper.push(chunk, false)
      } catch (e) {
        reject(e)
      }
    })
    zipStream.on('end', () => {
      try {
        unzipper.push(new Uint8Array(0), true)
        resolve()
      } catch (e) {
        reject(e)
      }
    })
    zipStream.on('error', reject)
  })

  if (!campaignJsonBuf) {
    rmSync(tmpDir, { recursive: true, force: true })
    const err = new Error('ZIP is missing campaign.json') as Error & { statusCode: number }
    err.statusCode = 422
    throw err
  }

  let payload: CampaignExport
  try {
    payload = JSON.parse(campaignJsonBuf.toString('utf8')) as CampaignExport
  } catch {
    rmSync(tmpDir, { recursive: true, force: true })
    const err = new Error('campaign.json is not valid JSON') as Error & { statusCode: number }
    err.statusCode = 422
    throw err
  }

  if (payload.version !== '1.2') {
    rmSync(tmpDir, { recursive: true, force: true })
    const err = new Error(
      `Unsupported version in ZIP: "${payload.version}". ZIP imports require version "1.2".`,
    ) as Error & { statusCode: number }
    err.statusCode = 422
    throw err
  }

  const imageMap: Record<string, string> = imageMapJsonBuf
    ? (JSON.parse(imageMapJsonBuf.toString('utf8')) as Record<string, string>)
    : {}

  // Run base import to get new campaign ID and slug
  const result = importCampaign(db, { payload, importingUserId, nameOverride })
  const newCampaignId = result.id
  const absContentDir = join(process.cwd(), 'content', 'campaigns', result.slug)

  // Move temp image files to their real locations, build URL rewrite map
  const urlMap = new Map<string, string>()

  const galleryRows = galleryRowsByOldUrl(db, newCampaignId)

  for (const [entryName, oldUrl] of Object.entries(imageMap)) {
    const safeName = entryName.replace(/\//g, '__')
    const srcPath = join(tmpDir, safeName)

    const imagesMatch = entryName.match(/^images\/([^/]+)$/)
    const entityMatch = entryName.match(/^images\/entity-(.+)-image\.(\w+)$/)
    const portraitMatch = entryName.match(/^images\/character-(.+)-portrait\.(\w+)$/)

    try {
      const galleryUrl = placeGalleryImage(db, {
        entryName,
        oldUrl,
        newCampaignId,
        absContentDir,
        rows: galleryRows,
        place: (destPath) => renameSync(srcPath, destPath),
      })
      if (galleryUrl) {
        urlMap.set(oldUrl, galleryUrl)
        continue
      }

      if (imagesMatch) {
        const filename = imagesMatch[1]!
        const dir = resolve(absContentDir, 'images')
        mkdirSync(dir, { recursive: true })
        renameSync(srcPath, join(dir, filename))
        urlMap.set(oldUrl, `/api/campaigns/${newCampaignId}/images/${filename}`)
      } else if (entityMatch) {
        const slug = entityMatch[1]!
        const ext = entityMatch[2]!
        const dir = resolve(absContentDir, 'entities', slug)
        mkdirSync(dir, { recursive: true })
        renameSync(srcPath, join(dir, `image.${ext}`))
        urlMap.set(oldUrl, `/api/campaigns/${newCampaignId}/entities/${slug}/image`)
      } else if (portraitMatch) {
        const slug = portraitMatch[1]!
        const ext = portraitMatch[2]!
        const dir = resolve(absContentDir, 'characters', slug)
        mkdirSync(dir, { recursive: true })
        renameSync(srcPath, join(dir, `portrait.${ext}`))
        urlMap.set(oldUrl, `/api/campaigns/${newCampaignId}/characters/${slug}/portrait`)
      }
    } catch {
      // silently skip files that couldn't be moved
    }
  }

  // Cleanup temp dir (any leftover files)
  rmSync(tmpDir, { recursive: true, force: true })

  if (urlMap.size === 0) return result

  // Update image URL fields in DB
  for (const [oldUrl, newUrl] of urlMap) {
    db.update(entities).set({ imageUrl: newUrl }).where(eq(entities.imageUrl, oldUrl)).run()
    db.update(characters)
      .set({ portraitUrl: newUrl })
      .where(eq(characters.portraitUrl, oldUrl))
      .run()
    db.update(organizations)
      .set({ imageUrl: newUrl })
      .where(eq(organizations.imageUrl, oldUrl))
      .run()
    db.update(sessionGroups)
      .set({ imageUrl: newUrl })
      .where(eq(sessionGroups.imageUrl, oldUrl))
      .run()
    db.update(maps).set({ imagePath: newUrl }).where(eq(maps.imagePath, oldUrl)).run()
    db.update(items).set({ imagePath: newUrl }).where(eq(items.imagePath, oldUrl)).run()
  }

  return result
}
