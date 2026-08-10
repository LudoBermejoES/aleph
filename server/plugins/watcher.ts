import { startWatcher } from '../services/watcher'
import { useSqlite, useDb } from '../utils/db'
import { initFTS5 } from '../services/search'
import { initVecTable } from '../services/embeddings'
import { backfillEntityEmbeddings } from '../db/backfills/entity-embeddings'
import { logger } from '../utils/logger'
import { join } from 'path'

export default defineNitroPlugin(async () => {
  const sqlite = useSqlite()
  const db = useDb()

  // Initialize FTS5 tables
  initFTS5(sqlite)
  logger.info('FTS5 search index initialized')

  // Initialize sqlite-vec embedding table
  initVecTable(sqlite)
  logger.info('Vector search index initialized')

  // One-time (idempotent, resumable) embedding backfill for entities that
  // predate semantic search — see server/db/backfills/entity-embeddings.ts.
  try {
    const result = await backfillEntityEmbeddings(db, sqlite)
    if (result.migrated > 0 || result.failed > 0) {
      logger.info('Entity embedding backfill complete', result)
    }
  } catch (error) {
    logger.error('Failed to backfill entity embeddings', { error })
  }

  // Start filesystem watcher
  const contentDir = join(process.cwd(), 'content')
  startWatcher({
    contentDir,
    sqlite,
    onEntityChange: (entityId, action) => {
      logger.debug('Entity change detected', { entityId, action })
    },
  })
})
