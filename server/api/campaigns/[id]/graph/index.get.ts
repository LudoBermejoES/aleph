import { eq, inArray } from 'drizzle-orm'
import { useDb } from '../../../../utils/db'
import { entities } from '../../../../db/schema/entities'
import { entityRelations, relationTypes } from '../../../../db/schema/relations'
import { characters } from '../../../../db/schema/characters'
import {
  organizations,
  organizationMembers,
  organizationLocations,
} from '../../../../db/schema/organizations'
import { computeAttitudeColor } from '../../../../services/relationships'
import { filterPinsByVisibility } from '../../../../services/maps'
import type { CampaignRole } from '../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const role = (event.context.campaignRole || 'visitor') as CampaignRole
  const db = useDb()

  // Get all relations (visibility-filtered) joined with relation type slug
  const allRelationsRaw = db
    .select({
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
  relations.forEach((r) => {
    entityIds.add(r.sourceEntityId)
    entityIds.add(r.targetEntityId)
  })

  // Fetch entity data for nodes
  const nodes: Record<
    string,
    { name: string; type: string; id: string; slug: string; boardSummary: string | null }
  > = {}
  for (const eid of entityIds) {
    const ent = db
      .select({
        id: entities.id,
        name: entities.name,
        type: entities.type,
        slug: entities.slug,
        boardSummary: entities.boardSummary,
      })
      .from(entities)
      .where(eq(entities.id, eid))
      .get()
    if (ent) nodes[eid] = ent
  }

  // Fetch portrait URLs for character entities
  const entityIdList = Array.from(entityIds)
  const charRows =
    entityIdList.length > 0
      ? db
          .select({ entityId: characters.entityId, portraitUrl: characters.portraitUrl })
          .from(characters)
          .where(inArray(characters.entityId, entityIdList))
          .all()
      : []
  const portraitMap = Object.fromEntries(charRows.map((c) => [c.entityId, c.portraitUrl]))

  // Fetch organization memberships for character entities
  // organizationMembers links by characterId; characters links entityId → characterId
  const charIdRows =
    entityIdList.length > 0
      ? db
          .select({ id: characters.id, entityId: characters.entityId })
          .from(characters)
          .where(inArray(characters.entityId, entityIdList))
          .all()
      : []
  const charIds = charIdRows.map((c) => c.id)

  const orgMemberRows =
    charIds.length > 0
      ? db
          .select({
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
  const charIdToEntityId = Object.fromEntries(charIdRows.map((c) => [c.id, c.entityId]))
  const orgsByEntityId: Record<string, Array<{ slug: string; name: string }>> = {}
  for (const row of orgMemberRows) {
    const eid = charIdToEntityId[row.characterId]
    if (!eid || !row.orgSlug || !row.orgName) continue
    if (!orgsByEntityId[eid]) orgsByEntityId[eid] = []
    orgsByEntityId[eid].push({ slug: row.orgSlug, name: row.orgName })
  }

  // Build v-network-graph format
  const graphNodes: Record<
    string,
    {
      name: string
      type: string
      slug: string
      boardSummary: string | null
      image: string | null
      organizations: Array<{ slug: string; name: string }>
    }
  > = Object.fromEntries(
    Object.entries(nodes).map(([id, n]) => [
      id,
      {
        name: n.name,
        type: n.type,
        slug: n.slug,
        boardSummary: n.boardSummary ?? null,
        image: portraitMap[id] ?? null,
        organizations: orgsByEntityId[id] ?? [],
      },
    ]),
  )

  const graphEdges: Record<
    string,
    {
      source: string
      target: string
      label: string | null
      color: string
      attitude: number | null
      relationTypeSlug: string
    }
  > = Object.fromEntries(
    relations.map((r) => [
      r.id,
      {
        source: r.sourceEntityId,
        target: r.targetEntityId,
        label: r.forwardLabel,
        color: computeAttitudeColor(r.attitude),
        attitude: r.attitude,
        relationTypeSlug: (r as { relationTypeSlug?: string }).relationTypeSlug ?? 'custom',
      },
    ]),
  )

  // Add organization nodes and org→character membership edges.
  // Organizations use organizations.id (not entity IDs) and appear as factionCard shapes.
  for (const row of orgMemberRows) {
    if (!row.orgId || !row.orgName || !row.orgSlug) continue
    const entityId = charIdToEntityId[row.characterId]
    if (!entityId) continue

    // Add org as a node if not already present
    if (!graphNodes[row.orgId]) {
      graphNodes[row.orgId] = {
        name: row.orgName,
        type: 'organization',
        slug: row.orgSlug,
        boardSummary: null,
        image: null,
        organizations: [],
      }
    }

    // Add membership edge: org → character entity
    const edgeKey = `org-member:${row.orgId}:${row.characterId}`
    if (!graphEdges[edgeKey]) {
      graphEdges[edgeKey] = {
        source: row.orgId,
        target: entityId,
        label: (row as { role?: string }).role || 'miembro',
        color: '#8b5cf6',
        attitude: null,
        relationTypeSlug: 'member',
      }
    }
  }

  // Also fetch all campaign organizations so they appear as nodes even without member edges
  const allOrgs = db
    .select({ id: organizations.id, name: organizations.name, slug: organizations.slug })
    .from(organizations)
    .where(eq(organizations.campaignId, campaignId))
    .all()
  for (const org of allOrgs) {
    if (!graphNodes[org.id]) {
      graphNodes[org.id] = {
        name: org.name,
        type: 'organization',
        slug: org.slug,
        boardSummary: null,
        image: null,
        organizations: [],
      }
    }
  }

  // Add character → location edges (characters with a home/base location)
  for (const row of charIdRows) {
    const char = db
      .select({ locationEntityId: characters.locationEntityId })
      .from(characters)
      .where(eq(characters.id, row.id))
      .get()
    if (!char?.locationEntityId) continue
    const loc = db
      .select({ id: entities.id, name: entities.name, slug: entities.slug })
      .from(entities)
      .where(eq(entities.id, char.locationEntityId))
      .get()
    if (!loc) continue

    // Add location as a node
    if (!graphNodes[loc.id]) {
      graphNodes[loc.id] = {
        name: loc.name,
        type: 'location',
        slug: loc.slug,
        boardSummary: null,
        image: null,
        organizations: [],
      }
    }

    // Add edge: character entity → location entity
    const edgeKey = `char-location:${row.entityId}:${loc.id}`
    if (!graphEdges[edgeKey]) {
      graphEdges[edgeKey] = {
        source: row.entityId,
        target: loc.id,
        label: 'ubicación',
        color: '#f59e0b',
        attitude: null,
        relationTypeSlug: 'location',
      }
    }
  }

  // Add organization → location edges
  for (const org of allOrgs) {
    const orgLocs = db
      .select({ locationEntityId: organizationLocations.locationEntityId })
      .from(organizationLocations)
      .where(eq(organizationLocations.organizationId, org.id))
      .all()
    for (const ol of orgLocs) {
      const loc = db
        .select({ id: entities.id, name: entities.name, slug: entities.slug })
        .from(entities)
        .where(eq(entities.id, ol.locationEntityId))
        .get()
      if (!loc) continue

      if (!graphNodes[loc.id]) {
        graphNodes[loc.id] = {
          name: loc.name,
          type: 'location',
          slug: loc.slug,
          boardSummary: null,
          image: null,
          organizations: [],
        }
      }

      const edgeKey = `org-location:${org.id}:${loc.id}`
      if (!graphEdges[edgeKey]) {
        graphEdges[edgeKey] = {
          source: org.id,
          target: loc.id,
          label: 'sede',
          color: '#f59e0b',
          attitude: null,
          relationTypeSlug: 'location',
        }
      }
    }
  }

  return { nodes: graphNodes, edges: graphEdges }
})
