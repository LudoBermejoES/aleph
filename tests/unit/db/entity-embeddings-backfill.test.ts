import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest'
import { mkdirSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { eq } from 'drizzle-orm'
import { createTestDb, type TestDb } from '../../helpers/db'
import { campaigns } from '../../../server/db/schema/campaigns'
import { entities } from '../../../server/db/schema/entities'
import { user } from '../../../server/db/schema/auth'
import { backfillEntityEmbeddings } from '../../../server/db/backfills/entity-embeddings'
import {
  initVecTable,
  embedText,
  searchEntitiesSemantic,
} from '../../../server/services/embeddings'

type Db = TestDb['db']
const MODEL_LOAD_TIMEOUT = 30_000

describe('backfillEntityEmbeddings', () => {
  let testDb: TestDb
  let db: Db
  let contentDir: string
  let campaignId: string
  let userId: string

  beforeAll(async () => {
    await embedText('warm up', 'query')
  }, MODEL_LOAD_TIMEOUT)

  beforeEach(() => {
    testDb = createTestDb()
    db = testDb.db
    initVecTable(testDb.sqlite)
    const now = new Date()
    contentDir = join('var', 'test-tmp', randomUUID())

    userId = randomUUID()
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
        contentDir,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      })
      .run()
  })

  afterEach(() => {
    testDb.close()
    rmSync(join(process.cwd(), contentDir), { recursive: true, force: true })
  })

  function seedEntity(slug: string, name: string, body: string, withFile = true) {
    const id = randomUUID()
    const now = new Date()
    const filePath = withFile ? join(contentDir, 'character', `${slug}.md`) : ''

    if (withFile) {
      const dir = join(process.cwd(), contentDir, 'character')
      mkdirSync(dir, { recursive: true })
      writeFileSync(
        join(process.cwd(), filePath),
        `---\nid: ${id}\ntype: character\nname: ${name}\n---\n${body}\n`,
      )
    }

    db.insert(entities)
      .values({
        id,
        campaignId,
        type: 'character',
        name,
        slug,
        filePath,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      })
      .run()
    return id
  }

  it(
    'generates an embedding for an entity that has none',
    async () => {
      const id = seedEntity('strahd', 'Strahd von Zarovich', 'A powerful vampire lord.')

      const result = await backfillEntityEmbeddings(db, testDb.sqlite)

      expect(result.migrated).toBe(1)
      expect(result.skippedExisting).toBe(0)

      const row = testDb.sqlite
        .prepare('SELECT rowid FROM entity_vec_map WHERE entity_id = ?')
        .get(id)
      expect(row).toBeDefined()
    },
    MODEL_LOAD_TIMEOUT,
  )

  it(
    'is idempotent — a second run migrates nothing for the same entity',
    async () => {
      seedEntity('strahd', 'Strahd von Zarovich', 'A powerful vampire lord.')

      const first = await backfillEntityEmbeddings(db, testDb.sqlite)
      expect(first.migrated).toBe(1)

      const second = await backfillEntityEmbeddings(db, testDb.sqlite)
      expect(second.migrated).toBe(0)
      expect(second.skippedExisting).toBe(1)
    },
    MODEL_LOAD_TIMEOUT,
  )

  it(
    'skips an entity with no file path rather than failing the whole run',
    async () => {
      seedEntity('ghost', 'No File Entity', '', false)
      const withFileId = seedEntity('strahd', 'Strahd von Zarovich', 'A powerful vampire lord.')

      const result = await backfillEntityEmbeddings(db, testDb.sqlite)

      expect(result.skippedNoFile).toBe(1)
      expect(result.migrated).toBe(1)
      const row = testDb.sqlite
        .prepare('SELECT rowid FROM entity_vec_map WHERE entity_id = ?')
        .get(withFileId)
      expect(row).toBeDefined()
    },
    MODEL_LOAD_TIMEOUT,
  )

  it(
    'the backfilled embedding is immediately usable by semantic search',
    async () => {
      seedEntity(
        'strahd',
        'Strahd von Zarovich',
        'Un señor vampiro que gobierna un castillo sombrío en un valle brumoso.',
      )

      await backfillEntityEmbeddings(db, testDb.sqlite)

      const results = await searchEntitiesSemantic(
        testDb.sqlite,
        campaignId,
        'un noble no-muerto que domina un castillo',
        5,
      )
      expect(results.length).toBeGreaterThan(0)
    },
    MODEL_LOAD_TIMEOUT,
  )

  it(
    'leaves other entity fields untouched',
    async () => {
      const id = seedEntity('strahd', 'Strahd von Zarovich', 'A powerful vampire lord.')

      await backfillEntityEmbeddings(db, testDb.sqlite)

      const entity = db.select().from(entities).where(eq(entities.id, id)).get()!
      expect(entity.name).toBe('Strahd von Zarovich')
      expect(entity.slug).toBe('strahd')
    },
    MODEL_LOAD_TIMEOUT,
  )
})
