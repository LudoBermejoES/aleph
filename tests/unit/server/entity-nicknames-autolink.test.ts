import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { randomUUID } from 'crypto'
import { mkdtempSync, writeFileSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { createTestDb, type TestDb } from '../../helpers/db'
import { autoLinkContent } from '../../../server/services/autolink-render'
import { scanCampaignMentions } from '../../../server/services/mention-scanner'
import { campaigns } from '../../../server/db/schema/campaigns'
import { entities } from '../../../server/db/schema/entities'
import { entityNicknames } from '../../../server/db/schema/entity-nicknames'
import { entityMentions } from '../../../server/db/schema/mentions'
import { user } from '../../../server/db/schema/auth'
import { eq } from 'drizzle-orm'

let testDb: TestDb
const userId = randomUUID()
const campaignId = randomUUID()
const philipId = randomUUID()
let tmpDir: string

function makeEntity(id: string, name: string, slug: string, filePath = '') {
  testDb.db
    .insert(entities)
    .values({
      id,
      campaignId,
      type: 'character',
      name,
      slug,
      filePath,
      visibility: 'members',
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .run()
}

beforeEach(() => {
  testDb = createTestDb()
  tmpDir = mkdtempSync(join(tmpdir(), 'entity-nicknames-test-'))

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
      contentDir: tmpDir,
      createdBy: userId,
      isPublic: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .run()

  makeEntity(philipId, 'Philip Holmes', 'philip-holmes')
})

afterEach(() => {
  testDb.close()
  rmSync(tmpDir, { recursive: true, force: true })
})

describe('autoLinkContent resolves nicknames from the DB', () => {
  it('converts a nickname mention into an entity-link', () => {
    testDb.db
      .insert(entityNicknames)
      .values({
        id: randomUUID(),
        entityId: philipId,
        nickname: 'El hermético',
        createdAt: new Date(),
      })
      .run()

    const result = autoLinkContent(
      'El hermético discutió el pacto con el grupo.',
      campaignId,
      null,
      testDb.db,
    )

    expect(result).toContain(':entity-link{slug="philip-holmes"')
    expect(result).toContain('name="El hermético"')
  })

  it('leaves text unlinked when no matching nickname exists', () => {
    const result = autoLinkContent('Nadie mencionó a Phillip aquí.', campaignId, null, testDb.db)
    expect(result).not.toContain(':entity-link')
  })

  it("does not self-link a nickname on the entity's own page", () => {
    testDb.db
      .insert(entityNicknames)
      .values({ id: randomUUID(), entityId: philipId, nickname: 'Phillip', createdAt: new Date() })
      .run()

    const result = autoLinkContent('Phillip se miró al espejo.', campaignId, philipId, testDb.db)
    expect(result).not.toContain(':entity-link')
  })

  it('matches nicknames case-insensitively with word boundaries', () => {
    testDb.db
      .insert(entityNicknames)
      .values({ id: randomUUID(), entityId: philipId, nickname: 'Phillip', createdAt: new Date() })
      .run()

    const result = autoLinkContent(
      'phillip llegó tarde, pero PhillipHolmes no cuenta.',
      campaignId,
      null,
      testDb.db,
    )
    const matches = result.match(/:entity-link/g) ?? []
    expect(matches).toHaveLength(1)
  })
})

describe('scanCampaignMentions resolves nicknames', () => {
  it('records a mention when a session file uses only the nickname', async () => {
    testDb.db
      .insert(entityNicknames)
      .values({
        id: randomUUID(),
        entityId: philipId,
        nickname: 'Phillip',
        createdAt: new Date(),
      })
      .run()

    const sessionId = randomUUID()
    const filePath = join(tmpDir, 'session.md')
    writeFileSync(filePath, '# Session\n\nPhillip habló con Julia sobre el pacto.\n')
    makeEntity(sessionId, 'Session 1', 'session-1', filePath)

    const result = await scanCampaignMentions(testDb.db, campaignId)
    expect(result.mentionsFound).toBeGreaterThan(0)

    const mention = testDb.db
      .select()
      .from(entityMentions)
      .where(eq(entityMentions.sourceEntityId, sessionId))
      .get()
    expect(mention?.targetEntityId).toBe(philipId)
  })
})
