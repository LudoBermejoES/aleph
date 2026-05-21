import { eq, inArray } from 'drizzle-orm'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { entities } from '../db/schema/entities'
import { entityRelations, relationTypes } from '../db/schema/relations'
import { characters } from '../db/schema/characters'
import {
  organizations,
  organizationMembers,
  organizationLocations,
} from '../db/schema/organizations'
import { computeAttitudeColor } from './relationships'
import { filterPinsByVisibility } from './maps'
import type { CampaignRole } from '../utils/permissions'

export interface GraphNode {
  name: string
  type: string
  slug: string
  boardSummary: string | null
  image: string | null
  organizations: Array<{ slug: string; name: string }>
}

export interface GraphEdge {
  source: string
  target: string
  label: string | null
  color: string
  attitude: number | null
  relationTypeSlug: string
}

export interface GraphData {
  nodes: Record<string, GraphNode>
  edges: Record<string, GraphEdge>
}

/**
 * Build the full graph for a campaign: entity relation edges, org membership edges,
 * character-location edges, and org-location edges. All queries are batched.
 */
export function buildGraphForCampaign(
  db: BetterSQLite3Database<Record<string, unknown>>,
  campaignId: string,
  role: CampaignRole,
): GraphData {
  const graphNodes: Record<string, GraphNode> = {}
  const graphEdges: Record<string, GraphEdge> = {}

  // ── 1. Entity relations ────────────────────────────────────────────────────
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

  // Collect all entity IDs involved in relations
  const entityIdSet = new Set<string>()
  for (const r of relations) {
    entityIdSet.add(r.sourceEntityId)
    entityIdSet.add(r.targetEntityId)
  }

  // ── 2. Batch-fetch entity nodes ────────────────────────────────────────────
  const entityIdList = Array.from(entityIdSet)
  const entityRows =
    entityIdList.length > 0
      ? db
          .select({
            id: entities.id,
            name: entities.name,
            type: entities.type,
            slug: entities.slug,
            boardSummary: entities.boardSummary,
          })
          .from(entities)
          .where(inArray(entities.id, entityIdList))
          .all()
      : []

  for (const ent of entityRows) {
    graphNodes[ent.id] = {
      name: ent.name,
      type: ent.type,
      slug: ent.slug,
      boardSummary: ent.boardSummary ?? null,
      image: null,
      organizations: [],
    }
  }

  // ── 3. Batch-fetch character portraits ─────────────────────────────────────
  const charRows =
    entityIdList.length > 0
      ? db
          .select({ entityId: characters.entityId, portraitUrl: characters.portraitUrl })
          .from(characters)
          .where(inArray(characters.entityId, entityIdList))
          .all()
      : []

  for (const c of charRows) {
    if (graphNodes[c.entityId]) {
      graphNodes[c.entityId].image = c.portraitUrl
    }
  }

  // ── 4. All campaign characters (used for membership + location edges) ──────
  // Fetch ALL characters in the campaign so org-member and char-location edges
  // are built for every character, not just those already in entity relations.
  const allCampaignCharRows = db
    .select({ id: characters.id, entityId: characters.entityId })
    .from(characters)
    .innerJoin(entities, eq(characters.entityId, entities.id))
    .where(eq(entities.campaignId, campaignId))
    .all()

  const charIdToEntityId = Object.fromEntries(allCampaignCharRows.map((c) => [c.id, c.entityId]))
  const charIds = allCampaignCharRows.map((c) => c.id)

  // ── 5. Org membership (batched) ────────────────────────────────────────────
  const orgMemberRows =
    charIds.length > 0
      ? db
          .select({
            characterId: organizationMembers.characterId,
            role: organizationMembers.role,
            orgId: organizations.id,
            orgSlug: organizations.slug,
            orgName: organizations.name,
          })
          .from(organizationMembers)
          .leftJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
          .where(inArray(organizationMembers.characterId, charIds))
          .all()
      : []

  // Build org-per-entity map + add membership edges
  const orgsByEntityId: Record<string, Array<{ slug: string; name: string }>> = {}
  for (const row of orgMemberRows) {
    const eid = charIdToEntityId[row.characterId]
    if (!eid || !row.orgSlug || !row.orgName || !row.orgId) continue

    // Org metadata per entity node
    if (!orgsByEntityId[eid]) orgsByEntityId[eid] = []
    orgsByEntityId[eid].push({ slug: row.orgSlug, name: row.orgName })

    // Org node
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

    // Membership edge
    const edgeKey = `org-member:${row.orgId}:${row.characterId}`
    if (!graphEdges[edgeKey]) {
      graphEdges[edgeKey] = {
        source: row.orgId,
        target: eid,
        label: row.role || 'member',
        color: '#8b5cf6',
        attitude: null,
        relationTypeSlug: 'member',
      }
    }
  }

  // Attach org metadata to entity nodes
  for (const [eid, orgs] of Object.entries(orgsByEntityId)) {
    if (graphNodes[eid]) graphNodes[eid].organizations = orgs
  }

  // ── 6. Entity relation edges ───────────────────────────────────────────────
  for (const r of relations) {
    graphEdges[r.id] = {
      source: r.sourceEntityId,
      target: r.targetEntityId,
      label: r.forwardLabel,
      color: computeAttitudeColor(r.attitude),
      attitude: r.attitude,
      relationTypeSlug: (r as { relationTypeSlug?: string }).relationTypeSlug ?? 'custom',
    }
  }

  // ── 7. All campaign orgs (even without members) ────────────────────────────
  const allOrgs = db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      imageUrl: organizations.imageUrl,
    })
    .from(organizations)
    .where(eq(organizations.campaignId, campaignId))
    .all()

  // Build imageUrl map and backfill org nodes created from membership rows
  const orgImageMap = Object.fromEntries(allOrgs.map((o) => [o.id, o.imageUrl]))
  for (const [orgId, node] of Object.entries(graphNodes)) {
    if (node.type === 'organization' && !node.image && orgImageMap[orgId]) {
      node.image = orgImageMap[orgId]!
    }
  }

  for (const org of allOrgs) {
    if (!graphNodes[org.id]) {
      graphNodes[org.id] = {
        name: org.name,
        type: 'organization',
        slug: org.slug,
        boardSummary: null,
        image: org.imageUrl ?? null,
        organizations: [],
      }
    }
  }

  // ── 8. Character → location edges (BATCHED) ───────────────────────────────
  if (charIds.length > 0) {
    const charLocRows = db
      .select({
        characterId: characters.id,
        entityId: characters.entityId,
        locationEntityId: characters.locationEntityId,
      })
      .from(characters)
      .where(inArray(characters.id, charIds))
      .all()
      .filter((r) => r.locationEntityId !== null)

    // Collect all location entity IDs we need
    const locationIds = [...new Set(charLocRows.map((r) => r.locationEntityId!).filter(Boolean))]

    const locationMap: Record<string, { id: string; name: string; slug: string }> = {}
    if (locationIds.length > 0) {
      const locRows = db
        .select({ id: entities.id, name: entities.name, slug: entities.slug })
        .from(entities)
        .where(inArray(entities.id, locationIds))
        .all()
      for (const loc of locRows) {
        locationMap[loc.id] = loc
      }
    }

    for (const row of charLocRows) {
      if (!row.locationEntityId) continue
      const loc = locationMap[row.locationEntityId]
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

      const edgeKey = `char-location:${row.entityId}:${loc.id}`
      if (!graphEdges[edgeKey]) {
        graphEdges[edgeKey] = {
          source: row.entityId,
          target: loc.id,
          label: 'location',
          color: '#f59e0b',
          attitude: null,
          relationTypeSlug: 'location',
        }
      }
    }
  }

  // ── 9. Org → location edges (BATCHED) ──────────────────────────────────────
  const allOrgIds = allOrgs.map((o) => o.id)
  if (allOrgIds.length > 0) {
    const allOrgLocRows = db
      .select({
        organizationId: organizationLocations.organizationId,
        locationEntityId: organizationLocations.locationEntityId,
      })
      .from(organizationLocations)
      .where(inArray(organizationLocations.organizationId, allOrgIds))
      .all()

    // Collect location IDs and batch-fetch
    const orgLocIds = [...new Set(allOrgLocRows.map((r) => r.locationEntityId))]
    const orgLocMap: Record<string, { id: string; name: string; slug: string }> = {}
    if (orgLocIds.length > 0) {
      const locRows = db
        .select({ id: entities.id, name: entities.name, slug: entities.slug })
        .from(entities)
        .where(inArray(entities.id, orgLocIds))
        .all()
      for (const loc of locRows) {
        orgLocMap[loc.id] = loc
      }
    }

    for (const row of allOrgLocRows) {
      const loc = orgLocMap[row.locationEntityId]
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

      const edgeKey = `org-location:${row.organizationId}:${loc.id}`
      if (!graphEdges[edgeKey]) {
        graphEdges[edgeKey] = {
          source: row.organizationId,
          target: loc.id,
          label: 'headquarters',
          color: '#f59e0b',
          attitude: null,
          relationTypeSlug: 'location',
        }
      }
    }
  }

  // ── 10. Populate missing entity nodes for all edge endpoints ─────────────
  // Characters involved in membership/location edges may not be in graphNodes
  // if they have no direct entity relations. Batch-fetch any missing nodes so
  // consumers like useEntityExpansion can read node metadata.
  const allEdgeEntityIds = new Set<string>()
  for (const edge of Object.values(graphEdges)) {
    allEdgeEntityIds.add(edge.source)
    allEdgeEntityIds.add(edge.target)
  }
  const missingNodeIds = Array.from(allEdgeEntityIds).filter((id) => !graphNodes[id])
  if (missingNodeIds.length > 0) {
    const missingRows = db
      .select({
        id: entities.id,
        name: entities.name,
        type: entities.type,
        slug: entities.slug,
        boardSummary: entities.boardSummary,
      })
      .from(entities)
      .where(inArray(entities.id, missingNodeIds))
      .all()
    for (const ent of missingRows) {
      graphNodes[ent.id] = {
        name: ent.name,
        type: ent.type,
        slug: ent.slug,
        boardSummary: ent.boardSummary ?? null,
        image: null,
        organizations: [],
      }
    }
  }

  return { nodes: graphNodes, edges: graphEdges }
}
