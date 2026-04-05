import { eq } from 'drizzle-orm'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { campaigns } from '../db/schema/campaigns'
import { entities, entityTemplates, entityTemplateFields, tags } from '../db/schema/entities'
import { characters } from '../db/schema/characters'
import {
  sessionGroups, arcs, chapters, gameSessions,
  quests,
} from '../db/schema/sessions'
import { maps } from '../db/schema/maps'
import { relationTypes, entityRelations } from '../db/schema/relations'
import {
  items, inventories, currencies,
  shops, transactions,
} from '../db/schema/inventory'
import {
  calendars,
  timelines,
} from '../db/schema/calendars'
import { sessionRolls } from '../db/schema/rolls'
import { entityMentions } from '../db/schema/mentions'
import { campaignMembers } from '../db/schema/campaign-members'
import { entityTypes } from '../db/schema/entity-types'

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
}

export const VALID_RESOURCE_TYPES = new Set([
  'entityTypes', 'entities', 'characters', 'sessions', 'sessionGroups',
  'quests', 'maps', 'calendars', 'timelines', 'relations', 'relationTypes',
  'items', 'inventories', 'currencies', 'shops', 'transactions',
  'arcs', 'chapters', 'rolls', 'tags', 'templates', 'mentions', 'members',
])

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
    version: '1.0',
    exportedAt: new Date().toISOString(),
    generator: 'aleph',
    campaign: campaign as Record<string, unknown>,
  }

  // Filter include to valid keys only
  const filteredInclude = include?.filter(k => VALID_RESOURCE_TYPES.has(k))

  if (shouldInclude('entityTypes', filteredInclude)) {
    result.entityTypes = db.select().from(entityTypes).where(eq(entityTypes.campaignId, campaignId)).all()
  }

  if (shouldInclude('entities', filteredInclude)) {
    const entitiesList = db.select().from(entities).where(eq(entities.campaignId, campaignId)).all()
    const templatesList = db.select().from(entityTemplates).where(eq(entityTemplates.campaignId, campaignId)).all()
    const templateIds = templatesList.map(t => t.id)
    const templateFieldsList = templateIds.length
      ? db.select().from(entityTemplateFields).all().filter(f => templateIds.includes(f.templateId))
      : []
    result.entities = entitiesList
    result.templates = templatesList.map(t => ({
      ...t,
      fields: templateFieldsList.filter(f => f.templateId === t.id),
    }))
  }

  if (shouldInclude('tags', filteredInclude)) {
    result.tags = db.select().from(tags).where(eq(tags.campaignId, campaignId)).all()
  }

  if (shouldInclude('characters', filteredInclude)) {
    const entityIds = db.select({ id: entities.id }).from(entities).where(eq(entities.campaignId, campaignId)).all().map(e => e.id)
    const charactersList = entityIds.length
      ? db.select().from(characters).all().filter(c => entityIds.includes(c.entityId))
      : []
    result.characters = charactersList
  }

  if (shouldInclude('sessions', filteredInclude)) {
    result.sessions = db.select().from(gameSessions).where(eq(gameSessions.campaignId, campaignId)).all()
  }

  if (shouldInclude('sessionGroups', filteredInclude)) {
    result.sessionGroups = db.select().from(sessionGroups).where(eq(sessionGroups.campaignId, campaignId)).all()
  }

  if (shouldInclude('arcs', filteredInclude)) {
    result.arcs = db.select().from(arcs).where(eq(arcs.campaignId, campaignId)).all()
  }

  if (shouldInclude('chapters', filteredInclude)) {
    const arcIds = db.select({ id: arcs.id }).from(arcs).where(eq(arcs.campaignId, campaignId)).all().map(a => a.id)
    result.chapters = arcIds.length
      ? db.select().from(chapters).all().filter(c => arcIds.includes(c.arcId))
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
    result.relations = db.select().from(entityRelations).where(eq(entityRelations.campaignId, campaignId)).all()
  }

  if (shouldInclude('relationTypes', filteredInclude)) {
    result.relationTypes = db.select().from(relationTypes).where(eq(relationTypes.campaignId, campaignId)).all()
  }

  if (shouldInclude('items', filteredInclude)) {
    result.items = db.select().from(items).where(eq(items.campaignId, campaignId)).all()
  }

  if (shouldInclude('inventories', filteredInclude)) {
    result.inventories = db.select().from(inventories).where(eq(inventories.campaignId, campaignId)).all()
  }

  if (shouldInclude('currencies', filteredInclude)) {
    result.currencies = db.select().from(currencies).where(eq(currencies.campaignId, campaignId)).all()
  }

  if (shouldInclude('shops', filteredInclude)) {
    result.shops = db.select().from(shops).where(eq(shops.campaignId, campaignId)).all()
  }

  if (shouldInclude('transactions', filteredInclude)) {
    result.transactions = db.select().from(transactions).where(eq(transactions.campaignId, campaignId)).all()
  }

  if (shouldInclude('rolls', filteredInclude)) {
    result.rolls = db.select().from(sessionRolls).where(eq(sessionRolls.campaignId, campaignId)).all()
  }

  if (shouldInclude('mentions', filteredInclude)) {
    result.mentions = db.select().from(entityMentions).where(eq(entityMentions.campaignId, campaignId)).all()
  }

  if (shouldInclude('members', filteredInclude)) {
    result.members = db.select().from(campaignMembers).where(eq(campaignMembers.campaignId, campaignId)).all()
  }

  return result
}
