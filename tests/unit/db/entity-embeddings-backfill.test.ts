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

  /**
   * `withFile: 'missing'` is the shape this project's own database actually contains: an
   * entity row whose `filePath` points at a file nobody deleted on purpose (`ENOENT
   * entities/the-tavern.md`). It is the only input that makes the backfill FAIL rather than
   * skip, so it is the one the convergence rule is about.
   */
  function seedEntity(
    slug: string,
    name: string,
    body: string,
    withFile: boolean | 'missing' = true,
  ) {
    const id = randomUUID()
    const now = new Date()
    const filePath = withFile === false ? '' : join(contentDir, 'character', `${slug}.md`)

    if (withFile === true) {
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

  describe('convergence — an entity that cannot be embedded is not retried for ever', () => {
    it(
      'a missing content file is a failure the first time, and is retried the next run',
      async () => {
        seedEntity('ghost-file', 'Entity With A Missing File', '', 'missing')

        const first = await backfillEntityEmbeddings(db, testDb.sqlite)
        expect(first.failed).toBe(1)
        expect(first.skippedFailedPermanently).toBe(0)

        const second = await backfillEntityEmbeddings(db, testDb.sqlite)
        expect(second.failed).toBe(1)
        expect(second.skippedFailedPermanently).toBe(0)
      },
      MODEL_LOAD_TIMEOUT,
    )

    it(
      'stops attempting it after MAX_ATTEMPTS runs — the run reports nothing left to do',
      async () => {
        seedEntity('ghost-file', 'Entity With A Missing File', '', 'missing')

        for (let run = 1; run <= 3; run++) {
          const result = await backfillEntityEmbeddings(db, testDb.sqlite)
          expect(result.failed).toBe(1)
        }

        const fourth = await backfillEntityEmbeddings(db, testDb.sqlite)
        expect(fourth.failed).toBe(0)
        expect(fourth.skippedFailedPermanently).toBe(1)

        const fifth = await backfillEntityEmbeddings(db, testDb.sqlite)
        expect(fifth.failed).toBe(0)
        expect(fifth.skippedFailedPermanently).toBe(1)
      },
      MODEL_LOAD_TIMEOUT,
    )

    it(
      'giving up on one entity does not stop the others being embedded',
      async () => {
        seedEntity('ghost-file', 'Entity With A Missing File', '', 'missing')

        for (let run = 1; run <= 3; run++) await backfillEntityEmbeddings(db, testDb.sqlite)

        const goodId = seedEntity('strahd', 'Strahd von Zarovich', 'A powerful vampire lord.')
        const result = await backfillEntityEmbeddings(db, testDb.sqlite)

        expect(result.skippedFailedPermanently).toBe(1)
        expect(result.migrated).toBe(1)
        const row = testDb.sqlite
          .prepare('SELECT rowid FROM entity_vec_map WHERE entity_id = ?')
          .get(goodId)
        expect(row).toBeDefined()
      },
      MODEL_LOAD_TIMEOUT,
    )

    it(
      'records the error and the attempt count, so the give-up is inspectable',
      async () => {
        const id = seedEntity('ghost-file', 'Entity With A Missing File', '', 'missing')

        await backfillEntityEmbeddings(db, testDb.sqlite)
        await backfillEntityEmbeddings(db, testDb.sqlite)

        const record = testDb.sqlite
          .prepare(
            'SELECT attempts, last_error, last_attempt_at FROM entity_embedding_failures WHERE entity_id = ?',
          )
          .get(id) as { attempts: number; last_error: string; last_attempt_at: string }
        expect(record.attempts).toBe(2)
        expect(record.last_error).toMatch(/ENOENT|no such file/i)
        expect(Number.isNaN(Date.parse(record.last_attempt_at))).toBe(false)
      },
      MODEL_LOAD_TIMEOUT,
    )

    it(
      'clearing the failure record makes the backfill try again — the documented recovery',
      async () => {
        const id = seedEntity('ghost-file', 'Entity With A Missing File', '', 'missing')

        for (let run = 1; run <= 3; run++) await backfillEntityEmbeddings(db, testDb.sqlite)
        expect((await backfillEntityEmbeddings(db, testDb.sqlite)).skippedFailedPermanently).toBe(1)

        // The operator restores the file and clears the record.
        mkdirSync(join(process.cwd(), contentDir, 'character'), { recursive: true })
        writeFileSync(
          join(process.cwd(), contentDir, 'character', 'ghost-file.md'),
          `---\nid: ${id}\ntype: character\nname: Entity With A Missing File\n---\nBack again.\n`,
        )
        testDb.sqlite.prepare('DELETE FROM entity_embedding_failures WHERE entity_id = ?').run(id)

        const result = await backfillEntityEmbeddings(db, testDb.sqlite)
        expect(result.migrated).toBe(1)
        expect(result.skippedFailedPermanently).toBe(0)
      },
      MODEL_LOAD_TIMEOUT,
    )

    it(
      'a success clears any failure record left over from an earlier run',
      async () => {
        const id = seedEntity('ghost-file', 'Entity With A Missing File', '', 'missing')

        await backfillEntityEmbeddings(db, testDb.sqlite)
        expect(
          testDb.sqlite
            .prepare('SELECT attempts FROM entity_embedding_failures WHERE entity_id = ?')
            .get(id),
        ).toBeDefined()

        mkdirSync(join(process.cwd(), contentDir, 'character'), { recursive: true })
        writeFileSync(
          join(process.cwd(), contentDir, 'character', 'ghost-file.md'),
          `---\nid: ${id}\ntype: character\nname: Entity With A Missing File\n---\nBack again.\n`,
        )

        await backfillEntityEmbeddings(db, testDb.sqlite)
        expect(
          testDb.sqlite
            .prepare('SELECT attempts FROM entity_embedding_failures WHERE entity_id = ?')
            .get(id),
        ).toBeUndefined()
      },
      MODEL_LOAD_TIMEOUT,
    )
  })

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
