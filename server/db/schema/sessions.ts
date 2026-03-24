import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { campaigns } from './campaigns'
import { user } from './auth'

export const arcs = sqliteTable('arcs', {
  id: text('id').primaryKey(),
  campaignId: text('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  description: text('description'),
  sortOrder: integer('sort_order').notNull().default(0),
  status: text('status').notNull().default('planned'), // planned, active, completed
})

export const chapters = sqliteTable('chapters', {
  id: text('id').primaryKey(),
  arcId: text('arc_id').notNull().references(() => arcs.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  description: text('description'),
  sortOrder: integer('sort_order').notNull().default(0),
})

export const gameSessions = sqliteTable('game_sessions', {
  id: text('id').primaryKey(),
  campaignId: text('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  slug: text('slug').notNull(),
  sessionNumber: integer('session_number').notNull(),
  scheduledDate: text('scheduled_date'), // ISO string
  status: text('status').notNull().default('planned'), // planned, active, completed, cancelled
  summary: text('summary'),
  arcId: text('arc_id').references(() => arcs.id),
  chapterId: text('chapter_id').references(() => chapters.id),
  logFilePath: text('log_file_path'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

export const sessionAttendance = sqliteTable('session_attendance', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull().references(() => gameSessions.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => user.id),
  characterId: text('character_id'),
  rsvpStatus: text('rsvp_status').notNull().default('pending'), // pending, accepted, declined, tentative
  attended: integer('attended', { mode: 'boolean' }).default(false),
})

export const quests = sqliteTable('quests', {
  id: text('id').primaryKey(),
  campaignId: text('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
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
})

export const decisions = sqliteTable('decisions', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull().references(() => gameSessions.id, { onDelete: 'cascade' }),
  campaignId: text('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  type: text('type').notNull().default('choice'), // choice, role, count, destiny
  title: text('title').notNull(),
  description: text('description'),
  entityId: text('entity_id'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})

export const consequences = sqliteTable('consequences', {
  id: text('id').primaryKey(),
  decisionId: text('decision_id').notNull().references(() => decisions.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  entityId: text('entity_id'),
  revealed: integer('revealed', { mode: 'boolean' }).notNull().default(false),
})
