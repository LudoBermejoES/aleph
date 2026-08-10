import chokidar, { type FSWatcher } from 'chokidar'
import { readEntityFile } from './content'
import { indexEntity } from './search'
import { indexEntityEmbedding } from './embeddings'
import { logger } from '../utils/logger'
import type Database from 'better-sqlite3'

interface WatcherOptions {
  contentDir: string
  sqlite: Database.Database
  onEntityChange?: (entityId: string, action: 'add' | 'change' | 'delete') => void
}

const pendingChanges = new Map<string, 'add' | 'change' | 'unlink'>()
let debounceTimer: ReturnType<typeof setTimeout> | null = null
const DEBOUNCE_MS = 1000

/**
 * Start watching a content directory for .md file changes.
 * Syncs entity metadata and FTS5 index on file add/change/delete.
 */
export function startWatcher(options: WatcherOptions): FSWatcher {
  const { contentDir, sqlite, onEntityChange } = options

  const watcher = chokidar.watch(`${contentDir}/**/*.md`, {
    persistent: true,
    ignoreInitial: false,
    ignored: /(^|[/\\])\./,
    depth: 10,
    awaitWriteFinish: {
      stabilityThreshold: 500,
      pollInterval: 100,
    },
  })

  function queueChange(path: string, action: 'add' | 'change' | 'unlink') {
    pendingChanges.set(path, action)
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => processBatch(sqlite, onEntityChange), DEBOUNCE_MS)
  }

  watcher
    .on('add', (path) => queueChange(path, 'add'))
    .on('change', (path) => queueChange(path, 'change'))
    .on('unlink', (path) => queueChange(path, 'unlink'))
    .on('ready', () => {
      logger.info('Filesystem watcher ready', { contentDir })
    })
    .on('error', (error) => {
      logger.error('Filesystem watcher error', { error })
    })

  return watcher
}

async function processBatch(
  sqlite: Database.Database,
  onEntityChange?: (entityId: string, action: 'add' | 'change' | 'delete') => void,
) {
  const batch = new Map(pendingChanges)
  pendingChanges.clear()

  for (const [filePath, action] of batch) {
    try {
      if (action === 'unlink') {
        handleDelete(sqlite, filePath, onEntityChange)
      } else {
        await handleAddOrChange(sqlite, filePath, action, onEntityChange)
      }
    } catch (error) {
      logger.error('Error processing file change', { filePath, action, error })
    }
  }

  if (batch.size > 0) {
    logger.debug('Processed file batch', { count: batch.size })
  }
}

async function handleAddOrChange(
  sqlite: Database.Database,
  filePath: string,
  action: 'add' | 'change',
  onEntityChange?: (entityId: string, action: 'add' | 'change' | 'delete') => void,
) {
  const entityFile = await readEntityFile(filePath)
  const { frontmatter, content } = entityFile

  // Check if content actually changed (hash tracking not yet implemented -- re-index always)
  if (action === 'change') {
    sqlite
      .prepare('SELECT content_hash FROM entities_fts_content WHERE entity_id = ?')
      .get(frontmatter.id)
  }

  if (frontmatter.id) {
    // Extract campaignId from file path (content/campaigns/<slug>/...)
    const pathParts = filePath.replace(/\\/g, '/').split('/')
    const campaignsIdx = pathParts.indexOf('campaigns')
    const campaignSlug = (campaignsIdx >= 0 ? pathParts[campaignsIdx + 1] : undefined) ?? 'unknown'

    indexEntity(
      sqlite,
      frontmatter.id,
      campaignSlug,
      frontmatter.name,
      frontmatter.aliases,
      frontmatter.tags,
      content,
    )
    await indexEntityEmbedding(sqlite, frontmatter.id, campaignSlug, frontmatter.name, content)

    logger.debug('Entity indexed', { entityId: frontmatter.id, name: frontmatter.name, action })
    onEntityChange?.(frontmatter.id, action)
  }
}

function handleDelete(
  _sqlite: Database.Database,
  filePath: string,
  _onEntityChange?: (entityId: string, action: 'add' | 'change' | 'delete') => void,
) {
  // We don't have the entity ID from a deleted file, so we look it up by path
  // For now, the entity metadata should be cleaned up by the caller
  logger.debug('File deleted', { filePath })
  // Entity cleanup will be handled by the wiki-core change which maintains the entities table
}
