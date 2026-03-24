import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { campaigns } from './campaigns'
import { entities } from './entities'
import { user } from './auth'

export const relationTypes = sqliteTable('relation_types', {
  id: text('id').primaryKey(),
  campaignId: text('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  slug: text('slug').notNull(),
  forwardLabel: text('forward_label').notNull(),
  reverseLabel: text('reverse_label').notNull(),
  isBuiltin: integer('is_builtin', { mode: 'boolean' }).notNull().default(false),
})

export const entityRelations = sqliteTable('entity_relations', {
  id: text('id').primaryKey(),
  campaignId: text('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  sourceEntityId: text('source_entity_id').notNull().references(() => entities.id, { onDelete: 'cascade' }),
  targetEntityId: text('target_entity_id').notNull().references(() => entities.id, { onDelete: 'cascade' }),
  relationTypeId: text('relation_type_id').notNull().references(() => relationTypes.id),
  forwardLabel: text('forward_label').notNull(),
  reverseLabel: text('reverse_label').notNull(),
  attitude: integer('attitude').default(0), // -100 to +100
  description: text('description'),
  metadataJson: text('metadata_json'),
  visibility: text('visibility').notNull().default('public'),
  isPinned: integer('is_pinned', { mode: 'boolean' }).notNull().default(false),
  createdBy: text('created_by').notNull().references(() => user.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})
