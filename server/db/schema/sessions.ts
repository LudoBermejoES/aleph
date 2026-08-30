import { sqliteTable, text, integer, unique, index, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { campaigns } from './campaigns'
import { characters } from './characters'
import { user } from './auth'

export const subCampaigns = sqliteTable(
  'sub_campaigns',
  {
    id: text('id').primaryKey(),
    campaignId: text('campaign_id')
      .notNull()
      .references(() => campaigns.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    description: text('description'),
    imageUrl: text('image_url'),
    sortOrder: integer('sort_order').notNull().default(0),
    isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  },
  (t) => ({
    uniqSlug: unique().on(t.campaignId, t.slug),
  }),
)

export const arcs = sqliteTable(
  'arcs',
  {
    id: text('id').primaryKey(),
    campaignId: text('campaign_id')
      .notNull()
      .references(() => campaigns.id, { onDelete: 'cascade' }),
    subCampaignId: text('sub_campaign_id')
      .notNull()
      .references(() => subCampaigns.id),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    description: text('description'),
    sortOrder: integer('sort_order').notNull().default(0),
    status: text('status').notNull().default('planned'), // planned, active, completed
  },
  (table) => [
    index('idx_arcs_campaign').on(table.campaignId),
    index('idx_arcs_sub_campaign').on(table.subCampaignId),
  ],
)

export const chapters = sqliteTable('chapters', {
  id: text('id').primaryKey(),
  arcId: text('arc_id')
    .notNull()
    .references(() => arcs.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  description: text('description'),
  sortOrder: integer('sort_order').notNull().default(0),
})

export const gameSessions = sqliteTable(
  'game_sessions',
  {
    id: text('id').primaryKey(),
    campaignId: text('campaign_id')
      .notNull()
      .references(() => campaigns.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    slug: text('slug').notNull(),
    sessionNumber: integer('session_number').notNull(),
    scheduledDate: text('scheduled_date'), // ISO string
    status: text('status').notNull().default('planned'), // planned, active, completed, cancelled
    summary: text('summary'),
    arcId: text('arc_id').references(() => arcs.id),
    chapterId: text('chapter_id').references(() => chapters.id),
    subCampaignId: text('sub_campaign_id')
      .notNull()
      .references(() => subCampaigns.id),
    logFilePath: text('log_file_path'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => [
    index('idx_sessions_status').on(table.status),
    index('idx_sessions_arc').on(table.arcId),
    index('idx_sessions_chapter').on(table.chapterId),
    index('idx_sessions_sub_campaign').on(table.subCampaignId),
  ],
)

export const sessionAttendance = sqliteTable(
  'session_attendance',
  {
    id: text('id').primaryKey(),
    sessionId: text('session_id')
      .notNull()
      .references(() => gameSessions.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id),
    characterId: text('character_id'),
    rsvpStatus: text('rsvp_status').notNull().default('pending'), // pending, accepted, declined, tentative
    attended: integer('attended', { mode: 'boolean' }).default(false),
  },
  (table) => [index('idx_attendance_session_user').on(table.sessionId, table.userId)],
)

/**
 * Experience awarded per (session, character).
 *
 * XP belongs to a CHARACTER, not to the person holding the dice — the same player carries
 * different characters across sessions and can field two in one evening, neither of which
 * `session_attendance`'s `(session_id, user_id)` key can express. Attendance stays keyed by
 * person on purpose: a guest, or a player between characters, still has to appear on the roster
 * (live data has attendance rows with no `character_id` at all), so the character cannot be the
 * attendance key without losing rows. Two facts, two natural keys, two tables.
 *
 * `xp` is NOT NULL and row presence means "recorded": a row says this character was awarded this
 * much (possibly `0`), no row says nothing was recorded. That replaces the NULL-vs-0 convention
 * the dropped `session_attendance.xp` column needed a paragraph to explain, and makes a future
 * `SUM` over this table simply correct instead of correct-only-if-you-remember-to-filter.
 *
 * `character_id` cascades: deleting a character removes its awards rather than orphaning them.
 * See openspec/changes/add-per-character-session-xp/design.md decisions 1 and 2.
 */
export const sessionCharacterXp = sqliteTable(
  'session_character_xp',
  {
    id: text('id').primaryKey(),
    sessionId: text('session_id')
      .notNull()
      .references(() => gameSessions.id, { onDelete: 'cascade' }),
    characterId: text('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    xp: integer('xp').notNull(),
  },
  (table) => [
    uniqueIndex('session_character_xp_session_character').on(table.sessionId, table.characterId),
    index('idx_session_character_xp_character').on(table.characterId),
  ],
)

export const quests = sqliteTable(
  'quests',
  {
    id: text('id').primaryKey(),
    campaignId: text('campaign_id')
      .notNull()
      .references(() => campaigns.id, { onDelete: 'cascade' }),
    subCampaignId: text('sub_campaign_id')
      .notNull()
      .references(() => subCampaigns.id),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    description: text('description'),
    status: text('status').notNull().default('active'), // active, completed, failed, abandoned
    parentQuestId: text('parent_quest_id'),
    entityId: text('entity_id'),
    isSecret: integer('is_secret', { mode: 'boolean' }).notNull().default(false),
    assignedCharacterIdsJson: text('assigned_character_ids_json'), // JSON array
    logFilePath: text('log_file_path'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => [
    index('idx_quests_campaign').on(table.campaignId),
    index('idx_quests_sub_campaign').on(table.subCampaignId),
  ],
)

export const decisions = sqliteTable('decisions', {
  id: text('id').primaryKey(),
  sessionId: text('session_id')
    .notNull()
    .references(() => gameSessions.id, { onDelete: 'cascade' }),
  campaignId: text('campaign_id')
    .notNull()
    .references(() => campaigns.id, { onDelete: 'cascade' }),
  type: text('type').notNull().default('choice'), // choice, role, count, destiny
  title: text('title').notNull(),
  description: text('description'),
  entityId: text('entity_id'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})

export const consequences = sqliteTable('consequences', {
  id: text('id').primaryKey(),
  decisionId: text('decision_id')
    .notNull()
    .references(() => decisions.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  entityId: text('entity_id'),
  revealed: integer('revealed', { mode: 'boolean' }).notNull().default(false),
})

export const sessionContents = sqliteTable(
  'session_contents',
  {
    id: text('id').primaryKey(),
    sessionId: text('session_id')
      .notNull()
      .references(() => gameSessions.id, { onDelete: 'cascade' }),
    type: text('type').notNull(), // 'manual_notes' | 'ai_notes' | 'summary'
    content: text('content'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  },
  (t) => ({
    uniqType: unique().on(t.sessionId, t.type),
  }),
)
