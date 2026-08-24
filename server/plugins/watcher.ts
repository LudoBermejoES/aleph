import { startWatcher } from '../services/watcher'
import { useSqlite, useDb } from '../utils/db'
import { initFTS5, findIndexParityGaps, repairIndexParity } from '../services/search'
import { initVecTable, findVectorParityGaps, backfillFilteredVectors } from '../services/embeddings'
import { backfillEntityEmbeddings } from '../db/backfills/entity-embeddings'
import { backfillEntityFtsIndex } from '../db/backfills/entity-fts-index'
import { logger } from '../utils/logger'
import { join } from 'path'
import { entities } from '../db/schema/entities'
import { readEntityFile } from '../services/content'

/**
 * Resolve an entity id to the text its embedding was built from. Only used by the one-time
 * filtered-vector migration, and only for entities that still lack a filtered vector — the
 * lookup table is built once so the migration is not N queries.
 */
function entityBodyLookup(db: ReturnType<typeof useDb>) {
  const byId = new Map(
    db
      .select({ id: entities.id, name: entities.name, filePath: entities.filePath })
      .from(entities)
      .all()
      .map((r) => [r.id, r]),
  )
  return async (entityId: string) => {
    const row = byId.get(entityId)
    if (!row?.filePath) return null
    try {
      return { name: row.name, body: (await readEntityFile(row.filePath)).content }
    } catch {
      return null
    }
  }
}

export default defineNitroPlugin(async () => {
  const sqlite = useSqlite()
  const db = useDb()

  // Initialize FTS5 tables. An index from before the role-scoped split is migrated IN
  // PLACE, out of its own stored text — no filesystem pass, so this stays a startup step
  // rather than an outage.
  const fts = initFTS5(sqlite)
  if (fts.migrated > 0) {
    logger.warn('Migrated the lexical index to the role-scoped schema', fts)
  } else {
    logger.info('FTS5 search index initialized')
  }

  // Initialize sqlite-vec embedding tables
  const vec = initVecTable(sqlite)
  logger.info('Vector search index initialized')

  // DELIBERATELY NOT AWAITED. The lexical migration above is synchronous because it is the
  // security-critical half and costs 146 ms; this one is a one-time data migration that was
  // MEASURED at 69 s on this project's own database (594 vectors copied, 18 re-embedded) —
  // and every `await` in a Nitro plugin runs before the server accepts a request, so
  // awaiting it holds a live campaign's site at HTTP 500 for over a minute. It was awaited
  // in the first draft and that is exactly what happened.
  //
  // Detaching it is safe in the direction that matters: until it finishes, the filtered
  // vector table is only PARTIALLY populated, so a player's semantic arm returns FEWER
  // results, never more. It cannot leak — the lexical index, which is what actually
  // enforces the split for the common query, is already correct before the first request.
  if (vec.needsFilteredBackfill) {
    void (async () => {
      try {
        const result = await backfillFilteredVectors(sqlite, entityBodyLookup(db))
        logger.warn('Filtered vector backfill complete', result)
      } catch (error) {
        logger.error('Failed to backfill filtered vectors', {
          error: error instanceof Error ? error.message : String(error),
        })
      }
      const gaps = findVectorParityGaps(sqlite)
      if (gaps.length) logger.error('Vector index parity broken', { problems: gaps })
    })()
  }

  // One-time (idempotent, resumable) FTS5 backfill for entities that were
  // never indexed at all (session/quest/arc/organization mirror entities —
  // see server/db/backfills/entity-fts-index.ts).
  try {
    const result = await backfillEntityFtsIndex(db, sqlite)
    if (result.migrated > 0 || result.failed > 0) {
      logger.info('Entity FTS index backfill complete', result)
    }
  } catch (error) {
    logger.error('Failed to backfill entity FTS index', { error })
  }

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

  // The two role-scoped copies of each index must hold the SAME entities — one holding an
  // entity the other does not is either a secret still reachable by a player or a sheet the
  // Narrator can no longer find. Logged rather than thrown: a parity gap is a search defect,
  // not a reason to refuse to boot.
  const lexicalGaps = findIndexParityGaps(sqlite)
  if (lexicalGaps.length) {
    logger.error('Search index parity broken', { problems: lexicalGaps })
    // Repairable whenever either copy still holds the text. It is worth trying rather than
    // only reporting, because the state nothing else fixes — the map knowing about entities
    // the tables do not — makes those sheets permanently unfindable.
    const repair = repairIndexParity(sqlite)
    logger.warn('Attempted lexical index repair', repair)
    const stillBroken = findIndexParityGaps(sqlite)
    if (stillBroken.length) {
      logger.error('Search index parity STILL broken after repair', { problems: stillBroken })
    }
  }

  // Only when the migration is not in flight — otherwise this reports the backfill's own
  // work-in-progress as a defect. The detached task above checks it when it finishes.
  if (!vec.needsFilteredBackfill) {
    const vectorGaps = findVectorParityGaps(sqlite)
    if (vectorGaps.length) {
      logger.error('Vector index parity broken', { problems: vectorGaps })
    }
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
