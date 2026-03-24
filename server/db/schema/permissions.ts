import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { users } from './users'

export const entityPermissions = sqliteTable('entity_permissions', {
  id: text('id').primaryKey(),
  entityId: text('entity_id').notNull(), // references entities.id (created in wiki-core change)
  targetUserId: text('target_user_id').references(() => users.id),
  targetRole: text('target_role'), // dm, co_dm, editor, player, visitor
  permission: text('permission').notNull(), // view, edit, delete
  effect: text('effect').notNull(), // allow, deny
  grantedBy: text('granted_by').notNull().references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})

export const entitySpecificViewers = sqliteTable('entity_specific_viewers', {
  entityId: text('entity_id').notNull(),
  userId: text('user_id').notNull().references(() => users.id),
})
