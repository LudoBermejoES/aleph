import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { entities } from './entities'
import { campaigns } from './campaigns'

export const entityMentions = sqliteTable('entity_mentions', {
  id: text('id').primaryKey(),
  campaignId: text('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  sourceEntityId: text('source_entity_id').notNull().references(() => entities.id, { onDelete: 'cascade' }),
  targetEntityId: text('target_entity_id').notNull().references(() => entities.id, { onDelete: 'cascade' }),
  count: integer('count').notNull().default(1),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => [
  uniqueIndex('mention_unique').on(table.sourceEntityId, table.targetEntityId),
])
