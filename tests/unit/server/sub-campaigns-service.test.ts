import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { randomUUID } from 'crypto'
import { createTestDb, type TestDb } from '../../helpers/db'
import { createDefaultSubCampaign } from '../../../server/services/sub-campaigns'
import { campaigns } from '../../../server/db/schema/campaigns'
import { subCampaigns } from '../../../server/db/schema/sessions'
import { user } from '../../../server/db/schema/auth'
import { eq } from 'drizzle-orm'

let testDb: TestDb
const userId = randomUUID()
const campaignId = randomUUID()

function setupBaseData() {
  testDb.db
    .insert(user)
    .values({
      id: userId,
      name: 'Test DM',
      email: `dm-${Date.now()}@test.com`,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .run()
  testDb.db
    .insert(campaigns)
    .values({
      id: campaignId,
      name: 'Test Campaign',
      slug: 'test-campaign',
      contentDir: '/tmp/test',
      createdBy: userId,
      isPublic: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .run()
}

beforeEach(() => {
  testDb = createTestDb()
  setupBaseData()
})

afterEach(() => {
  testDb.close()
})

describe('createDefaultSubCampaign', () => {
  it('creates exactly one sub-campaign flagged isDefault for a new campaign', () => {
    createDefaultSubCampaign(testDb.db, campaignId)

    const rows = testDb.db
      .select()
      .from(subCampaigns)
      .where(eq(subCampaigns.campaignId, campaignId))
      .all()

    expect(rows).toHaveLength(1)
    expect(rows[0].isDefault).toBe(true)
    expect(rows[0].name).toBe('General')
    expect(rows[0].slug).toBe('general')
  })

  it('returns the id of the created sub-campaign', () => {
    const id = createDefaultSubCampaign(testDb.db, campaignId)

    const row = testDb.db.select().from(subCampaigns).where(eq(subCampaigns.id, id)).get()

    expect(row).toBeDefined()
    expect(row?.campaignId).toBe(campaignId)
  })
})
