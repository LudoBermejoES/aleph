import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import { campaigns } from './campaigns'
import { entities } from './entities'
import { user } from './auth'

/**
 * Gallery images for an entity. Today only locations have a gallery UI, but the table is
 * entity-generic so characters/organizations can fold in later without a second migration.
 *
 * The `entity_images_one_primary` partial unique index IS the "exactly one main image"
 * guarantee — not an optimisation. Do not drop it.
 */
export const entityImages = sqliteTable(
  'entity_images',
  {
    id: text('id').primaryKey(),
    campaignId: text('campaign_id')
      .notNull()
      .references(() => campaigns.id, { onDelete: 'cascade' }),
    entityId: text('entity_id')
      .notNull()
      .references(() => entities.id, { onDelete: 'cascade' }),
    filename: text('filename').notNull(),
    url: text('url').notNull(),
    caption: text('caption'),
    sortOrder: integer('sort_order').notNull().default(0),
    isPrimary: integer('is_primary', { mode: 'boolean' }).notNull().default(false),
    createdBy: text('created_by')
      .notNull()
      .references(() => user.id),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => [
    index('idx_entity_images_entity').on(table.entityId, table.sortOrder),
    index('idx_entity_images_campaign').on(table.campaignId),
    uniqueIndex('entity_images_one_primary')
      .on(table.entityId)
      .where(sql`is_primary = 1`),
  ],
)
