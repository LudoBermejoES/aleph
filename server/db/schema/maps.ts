import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'
import { campaigns } from './campaigns'
import { entities } from './entities'

export const maps = sqliteTable('maps', {
  id: text('id').primaryKey(),
  campaignId: text('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  parentMapId: text('parent_map_id'),
  imagePath: text('image_path'),
  width: integer('width'),
  height: integer('height'),
  minZoom: integer('min_zoom').default(0),
  maxZoom: integer('max_zoom').default(4),
  isTiled: integer('is_tiled', { mode: 'boolean' }).notNull().default(false),
  visibility: text('visibility').notNull().default('members'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

export const mapPins = sqliteTable('map_pins', {
  id: text('id').primaryKey(),
  mapId: text('map_id').notNull().references(() => maps.id, { onDelete: 'cascade' }),
  entityId: text('entity_id').references(() => entities.id),
  childMapId: text('child_map_id').references(() => maps.id),
  label: text('label'),
  lat: real('lat').notNull(),
  lng: real('lng').notNull(),
  icon: text('icon'),
  color: text('color'),
  visibility: text('visibility').notNull().default('public'),
  groupId: text('group_id'),
})

export const mapLayers = sqliteTable('map_layers', {
  id: text('id').primaryKey(),
  mapId: text('map_id').notNull().references(() => maps.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: text('type').notNull().default('standard'), // standard, overlay
  imagePath: text('image_path'),
  opacity: real('opacity').notNull().default(1.0),
  sortOrder: integer('sort_order').notNull().default(0),
  visibleDefault: integer('visible_default', { mode: 'boolean' }).notNull().default(true),
})

export const mapGroups = sqliteTable('map_groups', {
  id: text('id').primaryKey(),
  mapId: text('map_id').notNull().references(() => maps.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  color: text('color'),
  visibleDefault: integer('visible_default', { mode: 'boolean' }).notNull().default(true),
})

export const mapRegions = sqliteTable('map_regions', {
  id: text('id').primaryKey(),
  mapId: text('map_id').notNull().references(() => maps.id, { onDelete: 'cascade' }),
  name: text('name'),
  geojson: text('geojson').notNull(), // GeoJSON as text
  color: text('color'),
  opacity: real('opacity').default(0.3),
  entityId: text('entity_id').references(() => entities.id),
  visibility: text('visibility').notNull().default('public'),
})
