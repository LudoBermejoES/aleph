import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { entities } from './entities'
import { campaigns } from './campaigns'
import { user } from './auth'

export const characters = sqliteTable(
  'characters',
  {
    id: text('id').primaryKey(),
    entityId: text('entity_id')
      .notNull()
      .unique()
      .references(() => entities.id, { onDelete: 'cascade' }),
    characterType: text('character_type').notNull().default('npc'), // pc, npc
    status: text('status').notNull().default('alive'), // alive, dead, missing, unknown
    locationEntityId: text('location_entity_id'),
    ownerUserId: text('owner_user_id').references(() => user.id),
    isCompanionOf: text('is_companion_of'), // character_id for mounts/companions
    folderId: text('folder_id'), // references character_folders.id
    portraitUrl: text('portrait_url'),
    birthYear: integer('birth_year'),
    deathYear: integer('death_year'),
    gender: text('gender'),
    backstory: text('backstory'),
    history: text('history'),
    currentStatus: text('current_status'),
  },
  (table) => [
    index('idx_characters_type').on(table.characterType),
    index('idx_characters_status').on(table.status),
    index('idx_characters_owner_user').on(table.ownerUserId),
    index('idx_characters_folder').on(table.folderId),
    index('idx_characters_location').on(table.locationEntityId),
  ],
)

/**
 * Public notes: one row per (character, author).
 *
 * Storing a note per author instead of one shared column is what removes the lost update —
 * two members annotating the same character write different rows, so neither can destroy the
 * other's text. The unique index is the invariant, not a lookup optimisation: it makes "one
 * note per person per character" impossible to violate, so a double-submit cannot fork a row.
 *
 * Both foreign keys cascade. A note whose character or author no longer exists cannot be
 * attributed, and an unattributed note on a character page is a rumour, not a note.
 */
export const characterNotes = sqliteTable(
  'character_notes',
  {
    id: text('id').primaryKey(),
    characterId: text('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    authorUserId: text('author_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    body: text('body').notNull().default(''),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => [
    uniqueIndex('character_notes_char_author').on(table.characterId, table.authorUserId),
    index('idx_character_notes_character').on(table.characterId),
    index('idx_character_notes_author').on(table.authorUserId),
  ],
)

export const statGroups = sqliteTable('stat_groups', {
  id: text('id').primaryKey(),
  campaignId: text('campaign_id')
    .notNull()
    .references(() => campaigns.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  templateId: text('template_id'),
  playerEditable: integer('player_editable', { mode: 'boolean' }).notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
})

export const statDefinitions = sqliteTable('stat_definitions', {
  id: text('id').primaryKey(),
  statGroupId: text('stat_group_id')
    .notNull()
    .references(() => statGroups.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  key: text('key').notNull(),
  valueType: text('value_type').notNull().default('number'), // number, text, boolean
  defaultValue: text('default_value'),
  sortOrder: integer('sort_order').notNull().default(0),
  isSecret: integer('is_secret', { mode: 'boolean' }).notNull().default(false),
})

export const characterStats = sqliteTable('character_stats', {
  id: text('id').primaryKey(),
  characterId: text('character_id')
    .notNull()
    .references(() => characters.id, { onDelete: 'cascade' }),
  statDefinitionId: text('stat_definition_id')
    .notNull()
    .references(() => statDefinitions.id, { onDelete: 'cascade' }),
  value: text('value'),
})

export const abilities = sqliteTable('abilities', {
  id: text('id').primaryKey(),
  characterId: text('character_id')
    .notNull()
    .references(() => characters.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: text('type').notNull().default('custom'), // action, reaction, passive, spell, trait, custom
  description: text('description'),
  tagsJson: text('tags_json'), // JSON array
  sortOrder: integer('sort_order').notNull().default(0),
  isSecret: integer('is_secret', { mode: 'boolean' }).notNull().default(false),
})

export const characterConnections = sqliteTable('character_connections', {
  id: text('id').primaryKey(),
  characterId: text('character_id')
    .notNull()
    .references(() => characters.id, { onDelete: 'cascade' }),
  targetEntityId: text('target_entity_id').notNull(),
  label: text('label'),
  description: text('description'),
  sortOrder: integer('sort_order').notNull().default(0),
})

export const characterFolders = sqliteTable('character_folders', {
  id: text('id').primaryKey(),
  campaignId: text('campaign_id')
    .notNull()
    .references(() => campaigns.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  parentFolderId: text('parent_folder_id'),
  sortOrder: integer('sort_order').notNull().default(0),
})
