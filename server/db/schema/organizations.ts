import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core'
import { campaigns } from './campaigns'
import { characters } from './characters'

export const organizations = sqliteTable('organizations', {
  id: text('id').primaryKey(),
  campaignId: text('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  description: text('description'),
  type: text('type').notNull().default('faction'), // faction, guild, army, cult, government, other
  status: text('status').notNull().default('active'), // active, inactive, secret, dissolved
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

export const organizationMembers = sqliteTable('organization_members', {
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  characterId: text('character_id').notNull().references(() => characters.id, { onDelete: 'cascade' }),
  role: text('role'),
}, (table) => ({
  pk: primaryKey({ columns: [table.organizationId, table.characterId] }),
}))
