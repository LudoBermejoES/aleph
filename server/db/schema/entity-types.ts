import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { campaigns } from './campaigns'

export const entityTypes = sqliteTable('entity_types', {
  id: text('id').primaryKey(),
  campaignId: text('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  slug: text('slug').notNull(),
  name: text('name').notNull(),
  icon: text('icon'),
  isBuiltin: integer('is_builtin', { mode: 'boolean' }).notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
})
