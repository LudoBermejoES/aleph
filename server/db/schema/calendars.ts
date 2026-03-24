import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'
import { campaigns } from './campaigns'

export const calendars = sqliteTable('calendars', {
  id: text('id').primaryKey(),
  campaignId: text('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  configJson: text('config_json').notNull(), // { months: [...], weekdays: [...], yearLength }
  currentDateJson: text('current_date_json'), // { year, month, day }
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

export const calendarMoons = sqliteTable('calendar_moons', {
  id: text('id').primaryKey(),
  calendarId: text('calendar_id').notNull().references(() => calendars.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  cycleDays: integer('cycle_days').notNull(),
  phaseOffset: integer('phase_offset').notNull().default(0),
  color: text('color'),
})

export const calendarSeasons = sqliteTable('calendar_seasons', {
  id: text('id').primaryKey(),
  calendarId: text('calendar_id').notNull().references(() => calendars.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  startMonth: integer('start_month').notNull(),
  startDay: integer('start_day').notNull(),
  endMonth: integer('end_month').notNull(),
  endDay: integer('end_day').notNull(),
})

export const calendarEvents = sqliteTable('calendar_events', {
  id: text('id').primaryKey(),
  calendarId: text('calendar_id').notNull().references(() => calendars.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  dateJson: text('date_json').notNull(), // { year, month, day }
  endDateJson: text('end_date_json'),
  isRecurring: integer('is_recurring', { mode: 'boolean' }).notNull().default(false),
  recurrenceJson: text('recurrence_json'), // { type: 'yearly'|'monthly', day, month }
  linkedEntityId: text('linked_entity_id'),
  visibility: text('visibility').notNull().default('public'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})

export const timelines = sqliteTable('timelines', {
  id: text('id').primaryKey(),
  campaignId: text('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  description: text('description'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})

export const timelineEvents = sqliteTable('timeline_events', {
  id: text('id').primaryKey(),
  timelineId: text('timeline_id').notNull().references(() => timelines.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  dateJson: text('date_json').notNull(),
  endDateJson: text('end_date_json'),
  era: text('era'),
  linkedEntityId: text('linked_entity_id'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})
