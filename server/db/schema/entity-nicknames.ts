import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import { entities } from './entities'

export const entityNicknames = sqliteTable(
  'entity_nicknames',
  {
    id: text('id').primaryKey(),
    entityId: text('entity_id')
      .notNull()
      .references(() => entities.id, { onDelete: 'cascade' }),
    nickname: text('nickname').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => [
    uniqueIndex('entity_nicknames_entity_nickname_unique').on(
      table.entityId,
      sql`${table.nickname} COLLATE NOCASE`,
    ),
  ],
)
