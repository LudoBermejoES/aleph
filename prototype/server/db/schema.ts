import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const entities = sqliteTable('entities', {
  id: text('id').primaryKey(),
  campaignId: text('campaign_id').notNull(),
  type: text('type').notNull(),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  filePath: text('file_path').notNull(),
  visibility: text('visibility').notNull().default('members'),
  contentHash: text('content_hash'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

export const entityNames = sqliteTable('entity_names', {
  id: text('id').primaryKey(),
  entityId: text('entity_id').notNull().references(() => entities.id),
  name: text('name').notNull(),
  nameLower: text('name_lower').notNull(),
  isPrimary: integer('is_primary').notNull().default(0),
})
