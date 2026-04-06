import { eq, and, desc } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import { useDb } from '../../../../../utils/db'
import { diagrams, diagramSnapshots } from '../../../../../db/schema/diagrams'
import { hasMinRole } from '../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../utils/permissions'

const MAX_SNAPSHOT_BYTES = 5 * 1024 * 1024 // 5MB

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'editor')) {
    throw createError({ statusCode: 403, message: 'Editors or above can save snapshots' })
  }

  const campaignId = getRouterParam(event, 'id')!
  const diagramId = getRouterParam(event, 'diagramId')!
  const db = useDb()

  const diagram = db
    .select({ id: diagrams.id })
    .from(diagrams)
    .where(and(eq(diagrams.id, diagramId), eq(diagrams.campaignId, campaignId)))
    .get()

  if (!diagram) {
    throw createError({ statusCode: 404, message: 'Diagram not found' })
  }

  const body = await readBody(event)
  const snapshotStr = JSON.stringify(body)

  if (Buffer.byteLength(snapshotStr, 'utf8') > MAX_SNAPSHOT_BYTES) {
    throw createError({ statusCode: 413, message: 'Snapshot exceeds 5MB limit' })
  }

  const latest = db
    .select({ version: diagramSnapshots.version })
    .from(diagramSnapshots)
    .where(eq(diagramSnapshots.diagramId, diagramId))
    .orderBy(desc(diagramSnapshots.version))
    .limit(1)
    .get()

  const nextVersion = (latest?.version ?? 0) + 1
  const now = new Date()

  db.insert(diagramSnapshots)
    .values({
      id: randomUUID(),
      diagramId,
      snapshot: snapshotStr,
      version: nextVersion,
      createdAt: now,
    })
    .run()

  // Update diagram updatedAt
  db.update(diagrams).set({ updatedAt: now }).where(eq(diagrams.id, diagramId)).run()

  return { version: nextVersion }
})
