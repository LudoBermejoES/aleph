import { eq, inArray } from 'drizzle-orm'
import { useDb } from '../../../../utils/db'
import { entities } from '../../../../db/schema/entities'
import { entityRelations, relationTypes } from '../../../../db/schema/relations'
import { characters } from '../../../../db/schema/characters'
import { organizations, organizationMembers } from '../../../../db/schema/organizations'
import { computeAttitudeColor } from '../../../../services/relationships'
import { filterPinsByVisibility } from '../../../../services/maps'
import type { CampaignRole } from '../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const role = (event.context.campaignRole || 'visitor') as CampaignRole
  const db = useDb()

  // Get all relations (visibility-filtered) joined with relation type slug
  const allRelationsRaw = db.select({
    id: entityRelations.id,
    campaignId: entityRelations.campaignId,
    sourceEntityId: entityRelations.sourceEntityId,
    targetEntityId: entityRelations.targetEntityId,
    relationTypeId: entityRelations.relationTypeId,
    forwardLabel: entityRelations.forwardLabel,
    reverseLabel: entityRelations.reverseLabel,
    attitude: entityRelations.attitude,
    description: entityRelations.description,
    metadataJson: entityRelations.metadataJson,
    visibility: entityRelations.visibility,
    isPinned: entityRelations.isPinned,
    createdBy: entityRelations.createdBy,
    createdAt: entityRelations.createdAt,
    updatedAt: entityRelations.updatedAt,
    relationTypeSlug: relationTypes.slug,
  })
    .from(entityRelations)
    .leftJoin(relationTypes, eq(entityRelations.relationTypeId, relationTypes.id))
    .where(eq(entityRelations.campaignId, campaignId))
    .all()

  const relations = filterPinsByVisibility(allRelationsRaw, role)

  // Collect entity IDs involved in relations
  const entityIds = new Set<string>()
  relations.forEach(r => {
    entityIds.add(r.sourceEntityId)
    entityIds.add(r.targetEntityId)
  })

  // Fetch entity data for nodes
  const nodes: Record<string, { name: string; type: string; id: string; slug: string }> = {}
  for (const eid of entityIds) {
    const ent = db.select({ id: entities.id, name: entities.name, type: entities.type, slug: entities.slug })
      .from(entities).where(eq(entities.id, eid)).get()
    if (ent) nodes[eid] = ent
  }

  // Fetch portrait URLs for character entities
  const entityIdList = Array.from(entityIds)
  const charRows = entityIdList.length > 0
    ? db.select({ entityId: characters.entityId, portraitUrl: characters.portraitUrl })
        .from(characters)
        .where(inArray(characters.entityId, entityIdList))
        .all()
    : []
  const portraitMap = Object.fromEntries(charRows.map(c => [c.entityId, c.portraitUrl]))

  // Fetch organization memberships for character entities
  // organizationMembers links by characterId; characters links entityId → characterId
  const charIdRows = entityIdList.length > 0
    ? db.select({ id: characters.id, entityId: characters.entityId })
        .from(characters)
        .where(inArray(characters.entityId, entityIdList))
        .all()
    : []
  const entityToCharId = Object.fromEntries(charIdRows.map(c => [c.entityId, c.id]))
  const charIds = charIdRows.map(c => c.id)

  const orgMemberRows = charIds.length > 0
    ? db.select({
        characterId: organizationMembers.characterId,
        orgId: organizations.id,
        orgSlug: organizations.slug,
        orgName: organizations.name,
      })
        .from(organizationMembers)
        .leftJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
        .where(inArray(organizationMembers.characterId, charIds))
        .all()
    : []

  // Build map: entityId → [{ slug, name }]
  const charIdToEntityId = Object.fromEntries(charIdRows.map(c => [c.id, c.entityId]))
  const orgsByEntityId: Record<string, Array<{ slug: string; name: string }>> = {}
  for (const row of orgMemberRows) {
    const eid = charIdToEntityId[row.characterId]
    if (!eid || !row.orgSlug || !row.orgName) continue
    if (!orgsByEntityId[eid]) orgsByEntityId[eid] = []
    orgsByEntityId[eid].push({ slug: row.orgSlug, name: row.orgName })
  }

  // Build v-network-graph format
  const graphNodes = Object.fromEntries(
    Object.entries(nodes).map(([id, n]) => [id, {
      name: n.name,
      type: n.type,
      slug: n.slug,
      image: portraitMap[id] ?? null,
      organizations: orgsByEntityId[id] ?? [],
    }])
  )

  const graphEdges = Object.fromEntries(
    relations.map(r => [r.id, {
      source: r.sourceEntityId,
      target: r.targetEntityId,
      label: r.forwardLabel,
      color: computeAttitudeColor(r.attitude),
      attitude: r.attitude,
      relationTypeSlug: (r as any).relationTypeSlug ?? 'custom',
    }])
  )

  return { nodes: graphNodes, edges: graphEdges }
})
