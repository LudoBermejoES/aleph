import { describe, it, expect, beforeEach } from 'vitest'
import { randomUUID } from 'crypto'
import { eq } from 'drizzle-orm'
import { createTestDb, type TestDb } from '../../helpers/db'
import { campaigns } from '../../../server/db/schema/campaigns'
import { subCampaigns, arcs, gameSessions } from '../../../server/db/schema/sessions'
import { user } from '../../../server/db/schema/auth'
import {
  findIncoherentSessions,
  repairIncoherentSessions,
} from '../../../server/services/sub-campaigns'

/**
 * Why this is a UNIT test and not an integration one.
 *
 * The audit exists for rows where a session and its arc name different storylines. Since the 422
 * (`server/utils/arc-chapter.ts`) and the arc-move cascade landed, **no API route can produce that
 * state**, so an integration test cannot set up the thing it means to measure — it could only
 * assert the empty case, which an audit that always returned nothing would also satisfy.
 *
 * Seeding the rows directly is therefore the only honest way to prove the query finds them, and it
 * matches what the audit is actually for: data that predates the rule, or that a future bug makes.
 */
describe('the sub-campaign coherence audit', () => {
  let testDb: TestDb
  let db: TestDb['db']
  let campaignId: string
  let generalId: string
  let mortalesId: string

  const mkArc = (subCampaignId: string, slug: string) => {
    const id = randomUUID()
    db.insert(arcs)
      .values({ id, campaignId, subCampaignId, name: slug, slug, sortOrder: 0, status: 'active' })
      .run()
    return id
  }

  const mkSession = (subCampaignId: string, arcId: string | null, n: number) => {
    const id = randomUUID()
    const now = new Date()
    db.insert(gameSessions)
      .values({
        id,
        campaignId,
        title: `S${n}`,
        slug: `s-${n}`,
        sessionNumber: n,
        status: 'planned',
        arcId,
        subCampaignId,
        createdAt: now,
        updatedAt: now,
      })
      .run()
    return id
  }

  beforeEach(() => {
    testDb = createTestDb()
    db = testDb.db
    const now = new Date()

    const userId = randomUUID()
    db.insert(user)
      .values({
        id: userId,
        name: 'DM',
        email: `dm-${userId}@test.com`,
        emailVerified: false,
        createdAt: now,
        updatedAt: now,
      })
      .run()

    campaignId = randomUUID()
    db.insert(campaigns)
      .values({
        id: campaignId,
        name: 'C',
        slug: `c-${campaignId}`,
        contentDir: 'var/test-tmp',
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      })
      .run()

    generalId = randomUUID()
    mortalesId = randomUUID()
    for (const [id, name, isDefault] of [
      [generalId, 'General', true],
      [mortalesId, 'Mortales', false],
    ] as const) {
      db.insert(subCampaigns)
        .values({
          id,
          campaignId,
          name,
          slug: name.toLowerCase(),
          sortOrder: 0,
          isDefault,
          createdAt: now,
          updatedAt: now,
        })
        .run()
    }
  })

  it('finds a session whose arc is in another sub-campaign, and names both', () => {
    const arc = mkArc(generalId, 'acto-i')
    mkSession(mortalesId, arc, 1)

    const rows = findIncoherentSessions(db, campaignId)
    expect(rows).toHaveLength(1)
    expect(rows[0]!.sessionSubCampaignName).toBe('Mortales')
    expect(rows[0]!.arcSubCampaignName).toBe('General')
    expect(rows[0]!.arcSlug).toBe('acto-i')
  })

  it('does NOT report a session that agrees with its arc', () => {
    // The half that pins the comparison: a query listing every session with an arc would pass
    // the test above and be worthless.
    const arc = mkArc(mortalesId, 'acto-ii')
    mkSession(mortalesId, arc, 1)
    expect(findIncoherentSessions(db, campaignId)).toHaveLength(0)
  })

  it('never reports a session with no arc', () => {
    mkSession(mortalesId, null, 1)
    expect(findIncoherentSessions(db, campaignId)).toHaveLength(0)
  })

  it('is scoped to its campaign', () => {
    const arc = mkArc(generalId, 'acto-i')
    mkSession(mortalesId, arc, 1)
    expect(findIncoherentSessions(db, randomUUID())).toHaveLength(0)
  })

  it('repairs by adopting the arc sub-campaign, and is idempotent', () => {
    const arcG = mkArc(generalId, 'acto-i')
    const arcM = mkArc(mortalesId, 'acto-ii')
    const s1 = mkSession(mortalesId, arcG, 1) // -> debe acabar en General
    const s2 = mkSession(generalId, arcM, 2) // -> debe acabar en Mortales
    const untouched = mkSession(mortalesId, null, 3)

    expect(findIncoherentSessions(db, campaignId)).toHaveLength(2)

    const result = repairIncoherentSessions(db, campaignId)
    expect(result.total).toBe(2)

    const subOf = (id: string) =>
      db.select().from(gameSessions).where(eq(gameSessions.id, id)).get()!.subCampaignId
    expect(subOf(s1)).toBe(generalId)
    expect(subOf(s2)).toBe(mortalesId)
    expect(subOf(untouched), 'a session with no arc was moved').toBe(mortalesId)

    expect(findIncoherentSessions(db, campaignId)).toHaveLength(0)
    expect(repairIncoherentSessions(db, campaignId).total).toBe(0)
  })
})
