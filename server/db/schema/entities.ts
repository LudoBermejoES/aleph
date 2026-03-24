import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { campaigns } from './campaigns'
import { user } from './auth'

export const entities = sqliteTable('entities', {
  id: text('id').primaryKey(),
  campaignId: text('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  filePath: text('file_path').notNull(),
  visibility: text('visibility').notNull().default('members'),
  contentHash: text('content_hash'),
  parentId: text('parent_id'),
  templateId: text('template_id'),
  createdBy: text('created_by').notNull().references(() => user.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => [
  uniqueIndex('entities_campaign_slug').on(table.campaignId, table.slug),
])

export const entityTemplates = sqliteTable('entity_templates', {
  id: text('id').primaryKey(),
  campaignId: text('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  entityTypeSlug: text('entity_type_slug').notNull(),
  name: text('name').notNull(),
  isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})

export const entityTemplateFields = sqliteTable('entity_template_fields', {
  id: text('id').primaryKey(),
  templateId: text('template_id').notNull().references(() => entityTemplates.id, { onDelete: 'cascade' }),
  key: text('key').notNull(),
  label: text('label').notNull(),
  fieldType: text('field_type').notNull(), // text, number, checkbox, select, date, entity_reference, section
  optionsJson: text('options_json'), // JSON for select options, etc.
  sortOrder: integer('sort_order').notNull().default(0),
  required: integer('required', { mode: 'boolean' }).notNull().default(false),
})

export const tags = sqliteTable('tags', {
  id: text('id').primaryKey(),
  campaignId: text('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  color: text('color'),
})

export const entityTags = sqliteTable('entity_tags', {
  entityId: text('entity_id').notNull().references(() => entities.id, { onDelete: 'cascade' }),
  tagId: text('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
})
