import { eq, and, desc } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { diagrams, diagramSnapshots } from '../../../../../db/schema/diagrams'
import { hasMinRole, getVisibleEntityIds } from '../../../../../utils/permissions'
import { filterSnapshotByVisibility } from '../../../../../utils/diagram-generator'
import { normalizeStoredSnapshot } from '../../../../../utils/tldraw-snapshot-format'
import type { CampaignRole } from '../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'player')) {
    throw createError({ statusCode: 403, message: 'Members can view diagrams' })
  }

  const campaignId = getRouterParam(event, 'id')!
  const diagramId = getRouterParam(event, 'diagramId')!
  const userId = event.context.user?.id || ''
  const db = useDb()

  const diagram = db
    .select({ id: diagrams.id })
    .from(diagrams)
    .where(and(eq(diagrams.id, diagramId), eq(diagrams.campaignId, campaignId)))
    .get()

  if (!diagram) {
    throw createError({ statusCode: 404, message: 'Diagram not found' })
  }

  const snapshot = db
    .select()
    .from(diagramSnapshots)
    .where(eq(diagramSnapshots.diagramId, diagramId))
    .orderBy(desc(diagramSnapshots.version))
    .limit(1)
    .get()

  if (!snapshot) {
    throw createError({ statusCode: 404, message: 'No snapshot found' })
  }

  // `diagram_snapshots.snapshot` can hold any of three incompatible JSON shapes depending on
  // which path last persisted it (REST autosave, generation-time, or the real-time sync room —
  // see tldraw-snapshot-format.ts for the full history and why this matters). Normalize to the
  // one canonical `{schema, store}` shape before filtering: `filterSnapshotByVisibility` only
  // defends against a MISSING `.store`, and a differently-shaped-but-valid snapshot is not that —
  // it would silently bypass entity-visibility filtering instead. Falls back to the raw parsed
  // value for a genuinely unrecognized/malformed row, preserving that pre-existing defense.
  const parsed = JSON.parse(snapshot.snapshot)
  const normalized = normalizeStoredSnapshot(parsed) ?? parsed

  // Filter shapes the current viewer can no longer see — a diagram is
  // generated once but viewed repeatedly, and visibility can change after
  // generation. Never trust generation-time filtering alone here.
  const visibleIds = getVisibleEntityIds(db, campaignId, role, userId)
  const filtered = filterSnapshotByVisibility(normalized, visibleIds)

  return { snapshot: filtered, version: snapshot.version }
})
