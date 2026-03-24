import { startWatcher } from '../services/watcher'
import { useSqlite } from '../utils/db'
import { initFTS5 } from '../services/search'
import { logger } from '../utils/logger'
import { join } from 'path'

export default defineNitroPlugin(() => {
  const sqlite = useSqlite()

  // Initialize FTS5 tables
  initFTS5(sqlite)
  logger.info('FTS5 search index initialized')

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
