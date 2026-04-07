import { sql } from 'drizzle-orm'
import { useDb } from '../../../../utils/db'
import { getRelationLabel } from '../../../../services/relationships'
import { filterPinsByVisibility } from '../../../../services/maps'
import type { CampaignRole } from '../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const query = getQuery(event)
  const role = (event.context.campaignRole || 'visitor') as CampaignRole
  const entityId = query.entity_id as string | undefined
  const db = useDb()

  // Helper to map raw snake_case row to camelCase + joined name fields
  function mapRow(r: Record<string, unknown>) {
    return {
      id: r.id as string,
      campaignId: r.campaign_id as string,
      sourceEntityId: r.source_entity_id as string,
      targetEntityId: r.target_entity_id as string,
      relationTypeId: r.relation_type_id as string | null,
      forwardLabel: r.forward_label as string,
      reverseLabel: r.reverse_label as string,
      attitude: r.attitude as number | null,
      description: r.description as string | null,
      metadataJson: r.metadata_json as string | null,
      visibility: r.visibility as string,
      isPinned: r.is_pinned as boolean,
      createdBy: r.created_by as string,
      createdAt: r.created_at as string,
      updatedAt: r.updated_at as string,
      sourceName: r.sourceName as string | null,
      sourceSlug: r.sourceSlug as string | null,
      sourceType: r.sourceType as string | null,
      targetName: r.targetName as string | null,
      targetSlug: r.targetSlug as string | null,
      targetType: r.targetType as string | null,
    }
  }

  let results: ReturnType<typeof mapRow>[]

  if (entityId) {
    // Entity-centered query — join entity names
    const rows = db.all(sql`
      SELECT r.*,
        se.name as sourceName, se.slug as sourceSlug, se.type as sourceType,
        te.name as targetName, te.slug as targetSlug, te.type as targetType
      FROM entity_relations r
      LEFT JOIN entities se ON se.id = r.source_entity_id
      LEFT JOIN entities te ON te.id = r.target_entity_id
      WHERE r.source_entity_id = ${entityId} OR r.target_entity_id = ${entityId}
    `) as Record<string, unknown>[]

    results = rows.map((r) => {
      const mapped = mapRow(r)
      return {
        ...mapped,
        label: getRelationLabel(mapped, entityId),
        relatedEntityId:
          mapped.sourceEntityId === entityId ? mapped.targetEntityId : mapped.sourceEntityId,
        relatedEntityName:
          mapped.sourceEntityId === entityId ? mapped.targetName : mapped.sourceName,
        relatedEntitySlug:
          mapped.sourceEntityId === entityId ? mapped.targetSlug : mapped.sourceSlug,
        relatedEntityType:
          mapped.sourceEntityId === entityId ? mapped.targetType : mapped.sourceType,
      }
    })
  } else {
    // Campaign-wide — also join names
    const rows = db.all(sql`
      SELECT r.*,
        se.name as sourceName, se.slug as sourceSlug, se.type as sourceType,
        te.name as targetName, te.slug as targetSlug, te.type as targetType
      FROM entity_relations r
      LEFT JOIN entities se ON se.id = r.source_entity_id
      LEFT JOIN entities te ON te.id = r.target_entity_id
      WHERE r.campaign_id = ${campaignId}
    `) as Record<string, unknown>[]

    results = rows.map(mapRow)
  }

  // Filter by visibility
  results = filterPinsByVisibility(results, role)

  // Filter by relation type
  if (query.relation_type) {
    results = results.filter((r) => r.relationTypeId === query.relation_type)
  }

  return results
})
