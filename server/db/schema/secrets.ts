import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { entities } from './entities'
import { user } from './auth'

export const secretReveals = sqliteTable('secret_reveals', {
  id: text('id').primaryKey(),
  entityId: text('entity_id').notNull().references(() => entities.id, { onDelete: 'cascade' }),
  secretBlockId: text('secret_block_id').notNull(),
  revealedBy: text('revealed_by').notNull().references(() => user.id),
  revealedAt: integer('revealed_at', { mode: 'timestamp' }).notNull(),
}, (table) => [
  uniqueIndex('secret_reveals_entity_block').on(table.entityId, table.secretBlockId),
])

export const entitySecretNotes = sqliteTable('entity_secret_notes', {
  id: text('id').primaryKey(),
  entityId: text('entity_id').notNull().references(() => entities.id, { onDelete: 'cascade' }).unique(),
  content: text('content').notNull().default(''),
  updatedBy: text('updated_by').notNull().references(() => user.id),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})
