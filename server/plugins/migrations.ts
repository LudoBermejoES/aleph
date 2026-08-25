import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { useDb } from '../utils/db'
import { logger } from '../utils/logger'
import { backfillLocationImages } from '../db/backfills/location-images'
import { backfillCharacterImages } from '../db/backfills/character-images'
import { backfillOrganizationImages } from '../db/backfills/organization-images'
import { backfillQuestEntities } from '../db/backfills/quest-entities'
import { backfillSessionEntities } from '../db/backfills/session-entities'
import { backfillArcEntities } from '../db/backfills/arc-entities'
import { backfillPinLabelEntityMatch } from '../db/backfills/pin-label-entity-match'
import { join } from 'path'

export default defineNitroPlugin(async () => {
  const db = useDb()
  const migrationsFolder = join(process.cwd(), 'server', 'db', 'migrations')

  try {
    migrate(db, { migrationsFolder })
    logger.info('Database migrations applied successfully')
  } catch (error) {
    logger.error('Failed to apply database migrations', { error })
    throw error
  }

  // Data backfills that a .sql migration cannot express because they touch the filesystem.
  // Each must be idempotent — they run on every boot.
  try {
    const result = await backfillLocationImages(db)
    if (result.migrated > 0) {
      logger.info('Backfilled location gallery images', result)
    }
  } catch (error) {
    logger.error('Failed to backfill location gallery images', { error })
  }

  try {
    const result = await backfillCharacterImages(db)
    if (result.migrated > 0) {
      logger.info('Backfilled character gallery images', result)
    }
  } catch (error) {
    logger.error('Failed to backfill character gallery images', { error })
  }

  try {
    const result = await backfillOrganizationImages(db)
    if (result.migrated > 0) {
      logger.info('Backfilled organization gallery images', result)
    }
  } catch (error) {
    logger.error('Failed to backfill organization gallery images', { error })
  }

  try {
    await backfillQuestEntities(db)
  } catch (error) {
    logger.error('Failed to backfill quest mirror entities', { error })
  }

  try {
    await backfillSessionEntities(db)
  } catch (error) {
    logger.error('Failed to backfill session mirror entities', { error })
  }

  try {
    await backfillArcEntities(db)
  } catch (error) {
    logger.error('Failed to backfill arc mirror entities', { error })
  }

  // add-pin-rename/design.md D3: pins whose label is only a copy of their entity's name must
  // be nulled BEFORE the new "custom label overrides the live entity name" priority rule can
  // safely apply to them, or they would be wrongly treated as deliberately renamed forever.
  try {
    const result = backfillPinLabelEntityMatch(db)
    if (result.nulled > 0) {
      logger.info('Backfilled pin labels matching their entity name', result)
    }
  } catch (error) {
    logger.error('Failed to backfill pin labels matching their entity name', { error })
  }
})
