import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { campaigns } from './campaigns'
import { user } from './auth'
import { gameSessions } from './sessions'

export const sessionRolls = sqliteTable('session_rolls', {
  id: text('id').primaryKey(),
  campaignId: text('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  sessionId: text('session_id').references(() => gameSessions.id),
  userId: text('user_id').notNull().references(() => user.id),
  characterId: text('character_id'),
  formula: text('formula').notNull(),
  resultJson: text('result_json').notNull(), // JSON-serialized RollResult
  total: integer('total').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})
