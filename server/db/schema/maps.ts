import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core'
import { campaigns } from './campaigns'
import { entities } from './entities'

export const maps = sqliteTable(
  'maps',
  {
    id: text('id').primaryKey(),
    campaignId: text('campaign_id')
      .notNull()
      .references(() => campaigns.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    parentMapId: text('parent_map_id'),
    // Discriminator resolved by design.md D2: it decides what `mapPins.lat`/`.lng` mean for
    // every pin that belongs to this map (CRS.Simple-scaled pixels for 'image', real WGS84
    // degrees for 'osm'). Defaults to 'image' so every pre-existing row keeps its current
    // meaning without a data migration.
    type: text('type').notNull().default('image'),
    // Initial view for an 'osm' map only -- resolved either via server-side geocoding
    // (server/services/geocoding.ts) or entered directly. Unused/null for 'image' maps.
    centerLat: real('center_lat'),
    centerLng: real('center_lng'),
    defaultZoom: integer('default_zoom'),
    imagePath: text('image_path'),
    width: integer('width'),
    height: integer('height'),
    minZoom: integer('min_zoom').default(0),
    maxZoom: integer('max_zoom').default(4),
    isTiled: integer('is_tiled', { mode: 'boolean' }).notNull().default(false),
    visibility: text('visibility').notNull().default('members'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => [
    index('idx_maps_parent').on(table.parentMapId),
    index('idx_maps_visibility').on(table.visibility),
  ],
)

export const mapPins = sqliteTable('map_pins', {
  id: text('id').primaryKey(),
  mapId: text('map_id')
    .notNull()
    .references(() => maps.id, { onDelete: 'cascade' }),
  entityId: text('entity_id').references(() => entities.id),
  childMapId: text('child_map_id').references(() => maps.id),
  label: text('label'),
  // A pin does not carry its own copy of the coordinate system -- what `lat`/`lng` mean is
  // determined entirely by the parent map's `type` (mapPins.mapId -> maps.id -> maps.type,
  // design.md D2): on an 'image' map they are the pin's position already scaled into the
  // map's CRS.Simple units (as MapViewer.client.vue derives from the image's pixel
  // dimensions); on an 'osm' map they are real WGS84 degrees (-90..90 / -180..180). The
  // server enforces that range only for pins on an 'osm' map.
  lat: real('lat').notNull(),
  lng: real('lng').notNull(),
  icon: text('icon'),
  color: text('color'),
  visibility: text('visibility').notNull().default('public'),
  groupId: text('group_id'),
})

export const mapLayers = sqliteTable('map_layers', {
  id: text('id').primaryKey(),
  mapId: text('map_id')
    .notNull()
    .references(() => maps.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: text('type').notNull().default('standard'), // standard, overlay
  imagePath: text('image_path'),
  opacity: real('opacity').notNull().default(1.0),
  sortOrder: integer('sort_order').notNull().default(0),
  visibleDefault: integer('visible_default', { mode: 'boolean' }).notNull().default(true),
})

export const mapGroups = sqliteTable('map_groups', {
  id: text('id').primaryKey(),
  mapId: text('map_id')
    .notNull()
    .references(() => maps.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  color: text('color'),
  visibleDefault: integer('visible_default', { mode: 'boolean' }).notNull().default(true),
})

export const mapRegions = sqliteTable('map_regions', {
  id: text('id').primaryKey(),
  mapId: text('map_id')
    .notNull()
    .references(() => maps.id, { onDelete: 'cascade' }),
  name: text('name'),
  geojson: text('geojson').notNull(), // GeoJSON as text
  color: text('color'),
  opacity: real('opacity').default(0.3),
  entityId: text('entity_id').references(() => entities.id),
  visibility: text('visibility').notNull().default('public'),
})
