import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { campaigns } from './campaigns'
import { users } from './users'

export const campaignMembers = sqliteTable('campaign_members', {
  id: text('id').primaryKey(),
  campaignId: text('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').notNull().default('player'), // dm, co_dm, editor, player, visitor
  joinedAt: integer('joined_at', { mode: 'timestamp' }).notNull(),
}, (table) => [
  uniqueIndex('campaign_members_unique').on(table.campaignId, table.userId),
])

export const campaignMemberPermissions = sqliteTable('campaign_member_permissions', {
  id: text('id').primaryKey(),
  campaignMemberId: text('campaign_member_id').notNull().references(() => campaignMembers.id, { onDelete: 'cascade' }),
  permission: text('permission').notNull(), // quest_keeper, lore_keeper, cartographer, shopkeeper, chronicler, treasurer
  grantedBy: text('granted_by').notNull().references(() => users.id),
  grantedAt: integer('granted_at', { mode: 'timestamp' }).notNull(),
}, (table) => [
  uniqueIndex('member_permission_unique').on(table.campaignMemberId, table.permission),
])

export const campaignInvitations = sqliteTable('campaign_invitations', {
  id: text('id').primaryKey(),
  campaignId: text('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  token: text('token').unique().notNull(),
  role: text('role').notNull().default('player'),
  createdBy: text('created_by').notNull().references(() => users.id),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  usedAt: integer('used_at', { mode: 'timestamp' }),
})
